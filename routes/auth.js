const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, LoginLog } = require('../models');
const { verifyToken } = require('../middleware/auth');

const isPasswordComplex = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@mail.com
 *               password:
 *                 type: string
 *                 description: Min 8 chars, uppercase, lowercase, number, and special character (@$!%*?&)
 *                 example: User123!
 *               role:
 *                 type: string
 *                 description: Optional. Defaults to "user"
 *                 example: user
 *     responses:
 *       201:
 *         description: User successfully registered
 *       400:
 *         description: Email already exists or password does not meet complexity requirements
 *       500:
 *         description: Server error during registration
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: "User with this email already exists" });
        }

        if (!isPasswordComplex(password)) {
            return res.status(400).json({ 
                error: "Password must be at least 8 characters long, include uppercase, lowercase, number, and special character." 
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            email,
            passwordHash,
            role: role || 'user'
        });

        res.status(201).json({ message: "User successfully registered", userId: newUser.id });
    } catch (error) {
        res.status(500).json({ error: "Server error during registration" });
    }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@mail.com
 *               password:
 *                 type: string
 *                 example: Admin123!
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *       401:
 *         description: Invalid password
 *       403:
 *         description: Account temporarily locked due to multiple failed login attempts
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error during login
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const ip = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'] || 'Unknown';

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (user.lockUntil && user.lockUntil > new Date()) {
            return res.status(403).json({ 
                error: "Account temporarily locked due to multiple failed login attempts. Try again later." 
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            let attempts = user.failedLoginAttempts + 1;
            let lockUntil = user.lockUntil;

            if (attempts >= 5) {
                lockUntil = new Date(Date.now() + 5 * 60 * 1000);
            }

            await user.update({ failedLoginAttempts: attempts, lockUntil });

            await LoginLog.create({ userId: user.id, ip, userAgent, success: false });

            return res.status(401).json({ error: "Invalid password" });
        }

        await user.update({ failedLoginAttempts: 0, lockUntil: null });

        await LoginLog.create({ userId: user.id, ip, userAgent, success: true });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ message: "Login successful", token });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Server error during login" });
    }
});

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 example: Admin123!
 *               newPassword:
 *                 type: string
 *                 description: Min 8 chars, uppercase, lowercase, number, and special character (@$!%*?&)
 *                 example: SuperAdmin99@
 *     responses:
 *       200:
 *         description: Password successfully changed
 *       400:
 *         description: New password does not meet security requirements
 *       401:
 *         description: Unauthorized or invalid old password
 *       403:
 *         description: Invalid or expired token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error during password change
 */
router.post('/change-password', verifyToken, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid old password" });
        }

        if (!isPasswordComplex(newPassword)) {
            return res.status(400).json({ 
                error: "New password does not meet security requirements." 
            });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await user.update({ passwordHash: newPasswordHash });

        res.status(200).json({ message: "Password successfully changed" });
    } catch (error) {
        console.error("Password change error:", error);
        res.status(500).json({ error: "Server error during password change" });
    }
});

/**
 * @swagger
 * /auth/change-email:
 *   post:
 *     summary: Change user email
 *     description: Updates the email address of the authenticated user. Requires current password confirmation.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - newEmail
 *             properties:
 *               password:
 *                 type: string
 *                 description: Current user password for confirmation
 *                 example: Admin123!
 *               newEmail:
 *                 type: string
 *                 description: New email address
 *                 example: new_admin@mail.com
 *     responses:
 *       200:
 *         description: Email successfully updated
 *       400:
 *         description: Email already in use
 *       401:
 *         description: Invalid password or token not provided
 *       403:
 *         description: Invalid or expired token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error during email change
 */
router.post('/change-email', verifyToken, async (req, res) => {
    try {
        const { password, newEmail } = req.body;
        
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid password" });
        }

        const emailExists = await User.findOne({ where: { email: newEmail } });
        if (emailExists) {
            return res.status(400).json({ error: "Email already in use" });
        }

        await user.update({ email: newEmail });

        res.status(200).json({ message: "Email successfully updated" });
    } catch (error) {
        console.error("Change email error:", error);
        res.status(500).json({ error: "Server error during email change" });
    }
});

module.exports = router;