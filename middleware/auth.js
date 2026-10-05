const jwt = require('jsonwebtoken');
const { User } = require('../models');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Доступ запрещен. Токен не предоставлен." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: "Неверный или просроченный токен." });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ error: "Доступ запрещен. Требуются права администратора." });
    }
};

const isNotBanned = async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ error: "Требуется авторизация" });

        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: "Пользователь не найден" });

        if (user.isBanned) {
            return res.status(403).json({ 
                error: `Ваш аккаунт заблокирован. Причина: ${user.banReason}` 
            });
        }

        next();
    } catch (error) {
        console.error("Ban check error:", error);
        res.status(500).json({ error: "Ошибка сервера при проверке статуса аккаунта" });
    }
};

module.exports = { verifyToken, isAdmin, isNotBanned };