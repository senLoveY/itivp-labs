const express = require('express');
const { Op } = require('sequelize');
const { User, LoginLog } = require('../models');

// все маршруты /admin защищены в server.js: verifyToken + isAdmin
const router = express.Router();

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users & Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns an array of users (id, email, role, isBanned, banReason, createdAt)
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Access denied. Admin rights required or invalid token
 *       500:
 *         description: Error retrieving users
 */
router.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'email', 'role', 'isBanned', 'banReason', 'createdAt'],
            order: [['id', 'ASC']]
        });
        res.status(200).json({
            message: "Secret admin panel",
            users
        });
    } catch (error) {
        res.status(500).json({ error: "Error retrieving users" });
    }
});

/**
 * @swagger
 * /admin/logs:
 *   get:
 *     summary: View login logs with pagination (Admin only)
 *     tags: [Users & Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by user email or IP (case-insensitive)
 *     responses:
 *       200:
 *         description: Returns { logs, total, page, pages }, newest first
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Admin rights required or invalid token
 *       500:
 *         description: Error retrieving logs
 */
router.get('/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';

        let whereClause = {};
        if (search) {
            const users = await User.findAll({
                where: { email: { [Op.iLike]: `%${search}%` } },
                attributes: ['id']
            });
            whereClause = {
                [Op.or]: [
                    { userId: users.map(u => u.id) },
                    { ip: { [Op.iLike]: `%${search}%` } }
                ]
            };
        }

        const { count, rows } = await LoginLog.findAndCountAll({
            where: whereClause,
            order: [['createdAt', 'DESC'], ['id', 'DESC']],
            limit: limit,
            offset: (page - 1) * limit
        });

        res.status(200).json({
            logs: rows,
            total: count,
            page: page,
            pages: Math.ceil(count / limit)
        });
    } catch (error) {
        console.error("LOGS ERROR:", error);
        res.status(500).json({ error: "Error retrieving logs" });
    }
});

/**
 * @swagger
 * /admin/users/{id}/ban:
 *   post:
 *     summary: Ban a user (Admin only)
 *     tags: [Users & Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to ban
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               banReason:
 *                 type: string
 *                 example: Violation of community guidelines
 *     responses:
 *       200:
 *         description: User successfully banned
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Cannot ban another admin, or admin rights required / invalid token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error during blocking
 */
router.post('/users/:id/ban', async (req, res) => {
    try {
        const { banReason } = req.body;
        const targetUser = await User.findByPk(req.params.id);

        if (!targetUser) return res.status(404).json({ error: "User not found" });
        if (targetUser.role === 'admin') return res.status(403).json({ error: "You can't ban an admin!" });

        await targetUser.update({ 
            isBanned: true, 
            banReason: banReason || 'Reason not specified' 
        });

        res.status(200).json({ message: `User ${targetUser.email} banned.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error during blocking" });
    }
});

/**
 * @swagger
 * /admin/users/{id}/unban:
 *   post:
 *     summary: Unban a user (Admin only)
 *     tags: [Users & Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to unban
 *     responses:
 *       200:
 *         description: User successfully unbanned
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Admin rights required or invalid token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error during unblocking
 */
router.post('/users/:id/unban', async (req, res) => {
    try {
        const targetUser = await User.findByPk(req.params.id);
        if (!targetUser) return res.status(404).json({ error: "User not found" });

        await targetUser.update({ isBanned: false, banReason: null });
        res.status(200).json({ message: `User ${targetUser.email} unbanned.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error during unblocking" });
    }
});

/**
 * @swagger
 * /admin/users/{id}/role:
 *   put:
 *     summary: Change user role (Admin only)
 *     description: An admin cannot change their own role.
 *     tags: [Users & Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 example: admin
 *     responses:
 *       200:
 *         description: Role changed
 *       400:
 *         description: Invalid role or attempt to change own role
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Admin rights required or invalid token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error while changing role
 */
router.put('/users/:id/role', async (req, res) => {
    try {
        const { role } = req.body;

        if (role !== 'user' && role !== 'admin') {
            return res.status(400).json({ error: "Role must be 'user' or 'admin'" });
        }

        if (Number(req.params.id) === req.user.id) {
            return res.status(400).json({ error: "You can't change your own role" });
        }

        const targetUser = await User.findByPk(req.params.id);
        if (!targetUser) return res.status(404).json({ error: "User not found" });

        await targetUser.update({ role });
        res.status(200).json({ message: `User ${targetUser.email} is now ${role}.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error while changing role" });
    }
});

module.exports = router;
