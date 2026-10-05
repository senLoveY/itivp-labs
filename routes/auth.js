const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { verifyToken } = require('../middleware/auth');

const isPasswordComplex = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

const router = express.Router();

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

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid password" });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ message: "Login successful", token });
    } catch (error) {
        res.status(500).json({ error: "Server error during login" });
    }
});

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

module.exports = router;