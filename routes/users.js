const express = require('express');
const { Tweet, User, sequelize } = require('../models');
const Comment = require('../mongo-models/Comment');
const { verifyToken, isNotBanned } = require('../middleware/auth');

const multer = require('multer');
const { pipeline } = require('node:stream/promises');
const { prepareImage, saveImage, readImage, removeImage } = require('../storage/postImages');

const uploadAvatar = multer({ limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 2 } }).single('avatar');

function publicProfile(user) {
    return { email: user.email, status: user.status, hasAvatar: Boolean(user.avatar) };
}

// данные текущего пользователя: профиль и статистика
const router = express.Router();

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users & Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns protected user data from JWT (id, email, role)
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Invalid or expired token
 */
router.get('/profile', verifyToken, async (req, res) => {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.sendStatus(404);
    res.json({ user: { id: user.id, role: user.role, ...publicProfile(user) } });
});

router.get('/users/profile', async (req, res) => {
    if (typeof req.query.email !== 'string') return res.sendStatus(400);
    const user = await User.findOne({ where: { email: req.query.email }, attributes: ['email', 'status', 'avatar'] });
    if (!user) return res.sendStatus(404);
    res.json(publicProfile(user));
});

router.get('/users/avatar', async (req, res, next) => {
    try {
        if (typeof req.query.email !== 'string') return res.sendStatus(400);
        const user = await User.findOne({ where: { email: req.query.email }, attributes: ['avatar'] });
        if (!user?.avatar) return res.sendStatus(404);
        const object = await readImage(user.avatar);
        res.set('Cache-Control', 'no-store');
        res.set('X-Content-Type-Options', 'nosniff');
        res.type(user.avatar.type);
        await pipeline(object.Body, res);
    } catch (error) {
        if (error.name === 'NoSuchKey') return res.sendStatus(404);
        if (!res.destroyed) next(error);
    }
});

router.patch('/profile', verifyToken, isNotBanned, (req, res, next) => {
    uploadAvatar(req, res, error => {
        if (!error) return next();
        const tooLarge = error.code === 'LIMIT_FILE_SIZE';
        res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? 'Фото должно весить не больше 10 МБ.' : 'Выбери одно фото.' });
    });
}, async (req, res, next) => {
    const { status, removeAvatar } = req.body ?? {};
    if (typeof status !== 'string' || status.trim().length > 120 || (req.file && removeAvatar === 'true')) {
        return res.status(400).json({ error: 'Статус должен содержать не больше 120 символов. Выбери одно действие для фото.' });
    }
    let newAvatar;
    let oldAvatar;
    let profile;
    try {
        if (req.file) {
            let prepared;
            try {
                prepared = await prepareImage(req.file.buffer, { avatar: true });
            } catch {
                return res.status(400).json({ error: 'Не удалось обработать фото. Поддерживаются JPEG, PNG, WebP, GIF и AVIF.' });
            }
            newAvatar = prepared.image;
            await saveImage(prepared);
        }
        profile = await sequelize.transaction(async transaction => {
            const user = await User.findByPk(req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
            if (!user) return null;
            const changes = { status: status.trim() };
            if (newAvatar || removeAvatar === 'true') {
                oldAvatar = user.avatar;
                changes.avatar = newAvatar ?? null;
            }
            await user.update(changes, { transaction });
            return publicProfile(user);
        });
    } catch (error) {
        await removeImage(newAvatar);
        return next(error);
    }
    if (!profile) {
        await removeImage(newAvatar);
        return res.sendStatus(404);
    }
    await removeImage(oldAvatar);
    res.json(profile);
});

/**
 * @swagger
 * /stats/me:
 *   get:
 *     summary: Like and comment statistics for the current user's tweets
 *     tags: [Tweets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns { totals, tweets, tags, discussed }. tweets are sorted by likes, tags contain posts, likes and average likes per post, discussed is top 5 tweets by comments from MongoDB (null if MongoDB is unavailable)
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Invalid or expired token
 *       500:
 *         description: Database error while calculating statistics
 */
router.get('/stats/me', verifyToken, async (req, res) => {
    try {
        const tweets = await Tweet.findAll({
            where: { author: req.user.email },
            attributes: ['id', 'content', 'likesCount', 'hashtags', 'createdAt'],
            order: [['likesCount', 'DESC'], ['createdAt', 'DESC']]
        });

        const tagMap = {};
        tweets.forEach(t => {
            (t.hashtags || []).forEach(tag => {
                if (!tagMap[tag]) tagMap[tag] = { tag, posts: 0, likes: 0 };
                tagMap[tag].posts += 1;
                tagMap[tag].likes += t.likesCount || 0;
            });
        });
        const tags = Object.values(tagMap)
            .map(t => ({ ...t, average: +(t.likes / t.posts).toFixed(1) }))
            .sort((a, b) => b.likes - a.likes);

        const totalLikes = tweets.reduce((sum, t) => sum + (t.likesCount || 0), 0);

        // посты берутся из PostgreSQL, а комментарии к ним считаются агрегацией в MongoDB
        let discussed = null;
        try {
            const top = await Comment.topByTweets(tweets.map(t => t.id));
            discussed = top.map(row => {
                const tweet = tweets.find(t => t.id === row._id);
                return { id: row._id, content: tweet.content, comments: row.comments, replies: row.replies, total: row.total };
            });
        } catch (error) {
            console.error('MongoDB error while calculating comment statistics:', error.message);
        }

        res.status(200).json({
            totals: {
                posts: tweets.length,
                likes: totalLikes,
                average: tweets.length ? +(totalLikes / tweets.length).toFixed(1) : 0,
                best: tweets[0] || null
            },
            tweets,
            tags,
            discussed
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while calculating statistics" });
    }
});

module.exports = router;
