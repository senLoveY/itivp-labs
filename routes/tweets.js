const express = require('express');
const { Op } = require('sequelize');
const { Tweet, Like, sequelize } = require('../models');
const Comment = require('../mongo-models/Comment');
const { verifyToken, isNotBanned, getUserFromToken } = require('../middleware/auth');
const { getIO } = require('../socket');
const notify = require('../socket/notify');
const multer = require('multer');
const { pipeline } = require('node:stream/promises');
const { prepareImage, saveImage, readImage, removeImage } = require('../storage/postImages');

const router = express.Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024, files: 4, fields: 2, parts: 7 } }).array('image', 4);

function parsePostUpload(req, res, next) {
    if (!req.is('multipart/form-data')) return next();
    upload(req, res, error => {
        if (error) {
            const tooLarge = error.code === 'LIMIT_FILE_SIZE';
            return res.status(tooLarge ? 413 : 400).json({
                error: tooLarge ? 'Изображение должно весить не больше 10 МБ.' : 'Можно прикрепить до четырёх изображений.'
            });
        }

        try {
            if (req.body.hashtags !== undefined) req.body.hashtags = JSON.parse(req.body.hashtags);
        } catch {
            return res.status(400).json({ error: 'Не удалось прочитать теги.' });
        }
        next();
    });
}

function postImages(image) {
    return Array.isArray(image) ? image : image ? [image] : [];
}

/**
 * @swagger
 * /tweets/{id}/image:
 *   get:
 *     summary: Get the image attached to a tweet
 *     tags: [Tweets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: index
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 3
 *           default: 0
 *       - in: query
 *         name: key
 *         description: Stable key of an image attached to this post. Overrides index.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Image bytes (WebP or GIF)
 *       404:
 *         description: No image attached to this tweet
 */
router.get('/:id/image', async (req, res, next) => {
    try {
        const tweet = await Tweet.findByPk(req.params.id);
        const index = req.query.index ?? '0';
        if (typeof index !== 'string' || !/^[0-3]$/.test(index)) return res.sendStatus(404);
        const { key } = req.query;
        if (key !== undefined && typeof key !== 'string') return res.sendStatus(404);
        const images = postImages(tweet?.image);
        const image = key === undefined ? images[Number(index)] : images.find(item => item.key === key);
        if (!image) return res.sendStatus(404);

        const object = await readImage(image);
        res.set('X-Content-Type-Options', 'nosniff');
        res.type(image.type);
        if (object.ContentLength !== undefined) res.set('Content-Length', String(object.ContentLength));
        await pipeline(object.Body, res);
    } catch (error) {
        if (error.name === 'NoSuchKey') return res.sendStatus(404);
        if (!res.destroyed) next(error);
    }
});

function normalizeHashtags(hashtags = []) {
    if (!Array.isArray(hashtags) || hashtags.some(tag => typeof tag !== 'string')) {
        return null;
    }

    const tags = hashtags.map(tag =>
        tag.trim().replace(/^#+/, '').toLowerCase().normalize('NFC')
    ).filter(Boolean);
    if (tags.some(tag => /[\s,#]/u.test(tag))) return null;

    return [...new Set(tags.map(tag => '#' + tag))];
}

/**
 * @swagger
 * /tweets:
 *   get:
 *     summary: Get a list of tweets (with pagination, search, author filter and sorting)
 *     description: Token is optional. If a valid token is sent, each tweet has liked = true when the current user liked it.
 *     tags: [Tweets]
 *     security:
 *       - {}
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of tweets to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of tweets to skip
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in content, author and hashtags (case-insensitive). A single hashtag such as "#react" matches that whole tag.
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Only tweets of this author (exact email)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [new, old, likes]
 *           default: new
 *         description: new – newest first, old – oldest first, likes – most liked first
 *     responses:
 *       200:
 *         description: An array of tweets in the selected order. Each tweet has the liked field (true or false)
 *       500:
 *         description: Database error while fetching tweets
 *
 *   post:
 *     summary: Create a new tweet
 *     description: Author is taken from the JWT token (user email). Banned users cannot create tweets.
 *     tags: [Tweets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: Hello from Swagger!
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["#swagger", "#api"]
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *               hashtags:
 *                 type: string
 *                 example: '["#swagger", "#api"]'
 *               image:
 *                 type: array
 *                 maxItems: 4
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Tweet successfully created
 *       400:
 *         description: Missing content, invalid tags or unsupported image
 *       413:
 *         description: Image exceeds 10 MB
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Invalid/expired token or account is banned
 *       404:
 *         description: User not found (during ban check)
 *       500:
 *         description: Database error while creating tweet
 */
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
        const author = req.query.author || '';
        const sort = req.query.sort || 'new';

        const hashtagsText = sequelize.cast(sequelize.col('hashtags'), 'text');
        let whereClause = search ? {
            [Op.or]: [
                { content: { [Op.iLike]: `%${search}%` } },
                { author: { [Op.iLike]: `%${search}%` } },
                sequelize.where(hashtagsText, { [Op.iLike]: `%${search}%` })
            ]
        } : {};

        if (search.startsWith('#') && search.length > 1 && !/\s/u.test(search)) {
            // Search for a whole JSON string, including its quotes, even in older posts.
            const tag = JSON.stringify(search.toLowerCase().normalize('NFC'));
            whereClause = {
                [Op.and]: sequelize.where(
                    sequelize.fn('strpos', sequelize.fn('lower', hashtagsText), tag),
                    { [Op.gt]: 0 }
                )
            };
        }

        if (author) {
            whereClause.author = author;
        }

        const orders = {
            new: [['createdAt', 'DESC'], ['id', 'DESC']],
            old: [['createdAt', 'ASC'], ['id', 'ASC']],
            likes: [['likesCount', 'DESC'], ['createdAt', 'DESC'], ['id', 'DESC']]
        };

        const tweets = await Tweet.findAll({
            where: whereClause,
            order: orders[sort] || orders.new,
            limit: limit,
            offset: offset
        });

        let likedIds = [];
        const user = getUserFromToken(req);
        if (user) {
            const likes = await Like.findAll({
                where: { userId: user.id, tweetId: tweets.map(t => t.id) }
            });
            likedIds = likes.map(l => l.tweetId);
        }

        res.status(200).json(tweets.map(t => ({ ...t.toJSON(), liked: likedIds.includes(t.id) })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while fetching tweets" });
    }
});

/**
 * @swagger
 * /tweets/{id}:
 *   get:
 *     summary: Get a tweet by ID
 *     tags: [Tweets]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tweet ID
 *     responses:
 *       200:
 *         description: Tweet found
 *       404:
 *         description: Tweet not found
 *       500:
 *         description: Database error while fetching tweet
 *
 *   put:
 *     summary: Update an existing tweet
 *     description: Only the tweet author or an admin can update. Banned users cannot update tweets.
 *     tags: [Tweets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tweet ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: Updated tweet content
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["#updated"]
 *               imageKeys:
 *                 type: array
 *                 maxItems: 4
 *                 uniqueItems: true
 *                 description: Keys of the existing attachments to keep, in display order. Omit to preserve all images, or send an empty array to remove them.
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Tweet successfully updated
 *       400:
 *         description: The content field is mandatory for update
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Access denied (not owner/admin), invalid token, or account is banned
 *       404:
 *         description: Tweet or user not found
 *       500:
 *         description: Database error while updating tweet
 *
 *   delete:
 *     summary: Delete a tweet
 *     description: Only the tweet author or an admin can delete. Banned users cannot delete tweets.
 *     tags: [Tweets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tweet ID
 *     responses:
 *       200:
 *         description: Tweet successfully deleted
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Access denied (not owner/admin), invalid token, or account is banned
 *       404:
 *         description: Tweet or user not found
 *       500:
 *         description: Database error while deleting tweet
 */
router.get('/:id', async (req, res) => {
    try {
        const tweet = await Tweet.findByPk(req.params.id);
        
        if (!tweet) {
            return res.status(404).json({ error: "Tweet not found" });
        }
        
        res.status(200).json(tweet);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while fetching tweet" });
    }
});

router.post('/', verifyToken, isNotBanned, parsePostUpload, async (req, res) => {
    const images = [];
    let newTweet;
    try {
        const { content, hashtags } = req.body;
        const author = req.user.email;
        const tags = normalizeHashtags(hashtags);
        if (!tags) return res.status(400).json({ error: 'Передайте теги массивом строк, по одному тегу в строке.' });

        if (typeof content !== 'string' || !content.trim()) {
            return res.status(400).json({ error: "The 'content' field is mandatory." });
        }

        for (const file of req.files ?? []) {
            let prepared;
            try {
                prepared = await prepareImage(file.buffer);
            } catch {
                await Promise.all(images.map(removeImage));
                return res.status(400).json({
                    error: 'Не удалось обработать изображение. Поддерживаются JPEG, PNG, WebP, GIF и AVIF в пределах допустимых размеров.'
                });
            }
            images.push(prepared.image);
            await saveImage(prepared);
        }

        newTweet = await Tweet.create({
            author,
            content,
            hashtags: tags,
            image: images.length ? images : null
        });

        getIO().emit('tweet:new', newTweet);
        res.status(201).json(newTweet);
    } catch (error) {
        if (!newTweet) await Promise.all(images.map(removeImage));
        console.error(error);
        res.status(500).json({ error: "Database error while creating tweet" });
    }
});

router.put('/:id', verifyToken, isNotBanned, async (req, res) => {
    try {
        const { content, hashtags, imageKeys } = req.body;
        if (typeof content !== 'string' || !content.trim()) {
            return res.status(400).json({ error: "The 'content' field is mandatory for update." });
        }
        const tags = hashtags === undefined ? undefined : normalizeHashtags(hashtags);
        if (hashtags !== undefined && !tags) {
            return res.status(400).json({ error: 'Передайте теги массивом строк, по одному тегу в строке.' });
        }
        if (imageKeys !== undefined && (!Array.isArray(imageKeys) || imageKeys.length > 4 ||
            imageKeys.some(key => typeof key !== 'string') || new Set(imageKeys).size !== imageKeys.length)) {
            return res.status(400).json({ error: 'Передайте список ключей фото без повторений.' });
        }

        const result = await sequelize.transaction(async transaction => {
            const tweet = await Tweet.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
            if (!tweet) return { status: 404, error: 'Tweet not found' };
            if (tweet.author !== req.user.email && req.user.role !== 'admin') {
                return { status: 403, error: 'Access denied. You can only update your own tweets.' };
            }

            const changes = { content };
            if (tags !== undefined) changes.hashtags = tags;
            let removed = [];
            if (imageKeys !== undefined) {
                const images = postImages(tweet.image);
                const byKey = new Map(images.map(image => [image.key, image]));
                if (imageKeys.some(key => !byKey.has(key))) {
                    return { status: 400, error: 'Одно из фото больше не прикреплено к этому посту.' };
                }
                const kept = new Set(imageKeys);
                removed = images.filter(image => !kept.has(image.key));
                changes.image = imageKeys.length ? imageKeys.map(key => byKey.get(key)) : null;
            }
            await tweet.update(changes, { transaction });
            return { tweet, removed };
        });

        if (result.error) return res.status(result.status).json({ error: result.error });
        await Promise.all(result.removed.map(removeImage));
        getIO().emit('tweet:update', result.tweet);
        res.status(200).json(result.tweet);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while updating tweet" });
    }
});

router.delete('/:id', verifyToken, isNotBanned, async (req, res) => {
    try {
        const tweet = await Tweet.findByPk(req.params.id);

        if (!tweet) {
            return res.status(404).json({ error: "Tweet not found" });
        }

        if (tweet.author !== req.user.email && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Access denied. You can only delete your own tweets." });
        }

        await tweet.destroy();
        await Promise.all(postImages(tweet.image).map(removeImage));
        await Comment.deleteMany({ tweetId: tweet.id });

        getIO().emit('tweet:delete', { id: tweet.id });
        res.status(200).json({ message: "Tweet successfully deleted", deleted: tweet });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while deleting tweet" });
    }
});

/**
 * @swagger
 * /tweets/{id}/like:
 *   post:
 *     summary: Like or unlike a tweet (one like per user)
 *     description: If the user has not liked the tweet, a like is added. If the like already exists, it is removed.
 *     tags: [Tweets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tweet ID
 *     responses:
 *       200:
 *         description: Returns updated tweet with the liked field (true or false)
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Invalid/expired token or account is banned
 *       404:
 *         description: Tweet not found
 *       500:
 *         description: Database error while liking tweet
 */
router.post('/:id/like', verifyToken, isNotBanned, async (req, res) => {
    try {
        const result = await sequelize.transaction(async (transaction) => {
            const tweet = await Tweet.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
            if (!tweet) return null;

            const where = { userId: req.user.id, tweetId: tweet.id };
            const removed = await Like.destroy({ where, transaction });
            if (!removed) {
                await Like.create(where, { transaction });
            }

            const likesCount = await Like.count({ where: { tweetId: tweet.id }, transaction });
            await tweet.update({ likesCount }, { transaction, silent: true });

            return { ...tweet.toJSON(), liked: !removed };
        });

        if (!result) {
            return res.status(404).json({ error: "Tweet not found" });
        }

        // liked у каждого свой, поэтому всем рассылается только счётчик
        getIO().emit('tweet:like', { id: result.id, likesCount: result.likesCount });
        if (result.liked) {
            await notify({ to: result.author, from: req.user.email, type: 'like', tweetId: result.id, text: result.content });
        }
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while liking tweet" });
    }
});

module.exports = router;
