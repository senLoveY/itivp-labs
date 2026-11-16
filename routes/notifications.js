const express = require('express');
const Notification = require('../mongo-models/Notification');
const { verifyToken } = require('../middleware/auth');
const { getIO } = require('../socket');

const router = express.Router();

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get last notifications of the current user
 *     tags: [Notifications (MongoDB)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Number of unread notifications and the last 20 notifications
 *       401:
 *         description: Token not provided
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        const to = req.user.email;
        const [notifications, unread] = await Promise.all([
            Notification.find({ to }).sort({ createdAt: -1 }).limit(20),
            Notification.countDocuments({ to, read: false })
        ]);

        res.status(200).json({ unread, notifications });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while fetching notifications" });
    }
});

/**
 * @swagger
 * /notifications/read:
 *   patch:
 *     summary: Mark all notifications of the current user as read
 *     tags: [Notifications (MongoDB)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Number of notifications marked as read
 *       401:
 *         description: Token not provided
 */
router.patch('/read', verifyToken, async (req, res) => {
    try {
        const to = req.user.email;
        const result = await Notification.updateMany({ to, read: false }, { $set: { read: true } });

        // сбросить счётчик в остальных вкладках пользователя
        getIO().to(`user:${to}`).emit('notifications:read');
        res.status(200).json({ modified: result.modifiedCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while updating notifications" });
    }
});

module.exports = router;
