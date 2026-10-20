const express = require('express');
const { Tweet } = require('../models');
const { verifyToken } = require('../middleware/auth');

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
    res.status(200).json({ 
        message: "This is a protected profile route.",
        user: req.user 
    });
});

/**
 * @swagger
 * /stats/me:
 *   get:
 *     summary: Like statistics for the current user's tweets
 *     tags: [Tweets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns { totals, tweets, tags }. tweets are sorted by likes, tags contain posts, likes and average likes per post
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

        // разрез по тегам: сколько постов с тегом и сколько у них лайков
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

        res.status(200).json({
            totals: {
                posts: tweets.length,
                likes: totalLikes,
                average: tweets.length ? +(totalLikes / tweets.length).toFixed(1) : 0,
                best: tweets[0] || null
            },
            tweets,
            tags
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while calculating statistics" });
    }
});

module.exports = router;
