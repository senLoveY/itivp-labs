const jwt = require('jsonwebtoken');
const { User } = require('../models');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Access denied. Token not provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: "Invalid or expired token." });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ error: "Access denied. Admin rights required." });
    }
};

const isNotBanned = async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ error: "Authorization required" });

        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        if (user.isBanned) {
            return res.status(403).json({ 
                error: `Your account is banned. Reason: ${user.banReason}` 
            });
        }

        next();
    } catch (error) {
        console.error("Ban check error:", error);
        res.status(500).json({ error: "Server error during account status check" });
    }
};

module.exports = { verifyToken, isAdmin, isNotBanned };