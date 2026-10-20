const express = require('express');
const { Op } = require('sequelize');
const { Tweet, Like, sequelize } = require('../models');
const { verifyToken, isNotBanned, getUserFromToken } = require('../middleware/auth');

const router = express.Router();

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
 *         description: Search in content, author and hashtags (case-insensitive)
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
 *     responses:
 *       201:
 *         description: Tweet successfully created
 *       400:
 *         description: The content field is mandatory
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
        const search = req.query.search || '';
        const author = req.query.author || '';
        const sort = req.query.sort || 'new';

        const whereClause = search ? {
            [Op.or]: [
                { content: { [Op.iLike]: `%${search}%` } },
                { author: { [Op.iLike]: `%${search}%` } },
                sequelize.where(sequelize.cast(sequelize.col('hashtags'), 'text'), { [Op.iLike]: `%${search}%` })
            ]
        } : {};

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

router.post('/', verifyToken, isNotBanned, async (req, res) => {
    try {
        const { content, hashtags } = req.body;
        const author = req.user.email;

        if (!content) {
            return res.status(400).json({ error: "The 'content' field is mandatory." });
        }

        const newTweet = await Tweet.create({
            author,
            content,
            hashtags: hashtags || []
        });

        res.status(201).json(newTweet);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while creating tweet" });
    }
});

router.put('/:id', verifyToken, isNotBanned, async (req, res) => {
    try {
        const { content, hashtags } = req.body;
        const tweet = await Tweet.findByPk(req.params.id);

        if (!tweet) {
            return res.status(404).json({ error: "Tweet not found" });
        }

        if (tweet.author !== req.user.email && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Access denied. You can only update your own tweets." });
        }

        if (!content) {
            return res.status(400).json({ error: "The 'content' field are mandatory for update." });
        }

        await tweet.update({
            content,
            hashtags: hashtags || []
        });

        res.status(200).json(tweet);
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
        const tweet = await Tweet.findByPk(req.params.id);

        if (!tweet) {
            return res.status(404).json({ error: "Tweet not found" });
        }

        const existing = await Like.findOne({ where: { userId: req.user.id, tweetId: tweet.id } });

        if (existing) {
            await existing.destroy();
            await tweet.decrement('likesCount');
        } else {
            await Like.create({ userId: req.user.id, tweetId: tweet.id });
            await tweet.increment('likesCount');
        }

        await tweet.reload();
        res.status(200).json({ ...tweet.toJSON(), liked: !existing });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while liking tweet" });
    }
});

module.exports = router;
