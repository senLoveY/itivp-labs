const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { User, Tweet, Comment, LoginLog, sequelize } = require('../models');
const { fail, id, body, text, owner } = require('../middleware/api');

const publicFields = ['id', 'email', 'role', 'isBanned', 'createdAt', 'updatedAt'];
const safe = user => Object.fromEntries(publicFields.map(key => [key, user[key]]));

function validate(req, required) {
    const data = body(req, ['email', 'password'], required);
    const result = {};
    if (Object.hasOwn(data, 'email')) {
        const email = text(data.email, 'email', 254).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Некорректный email.');
        result.email = email;
    }
    if (Object.hasOwn(data, 'password')) {
        if (typeof data.password !== 'string' || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,72}$/.test(data.password)) {
            fail(400, 'Пароль: 8–72 символа, заглавная и строчная буква, цифра и спецсимвол @$!%*?&.');
        }
        result.password = data.password;
    }
    return result;
}

exports.list = async (req, res) => {
    if (req.apiUser.role !== 'admin') fail(403, 'Список пользователей доступен администратору.');
    res.json(await User.findAll({ attributes: publicFields, order: [['id','ASC']] }));
};
exports.get = async (req, res) => {
    const userId = id(req.params.id);
    owner(req, userId);
    const user = await User.findByPk(userId, { attributes: publicFields });
    if (!user) fail(404, 'Пользователь не найден.');
    res.json(user);
};
exports.create = async (req, res) => {
    const data = validate(req, ['email','password']);
    const user = await User.create({ email: data.email, passwordHash: await bcrypt.hash(data.password, 10), role: 'user' });
    res.location('/api/users/' + user.id).status(201).json(safe(user));
};
exports.update = async (req, res) => {
    const userId = id(req.params.id);
    owner(req, userId);
    const data = validate(req, req.method === 'PUT' ? ['email','password'] : []);
    const hash = data.password && await bcrypt.hash(data.password, 10);
    const user = await sequelize.transaction(async transaction => {
        const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!user) fail(404, 'Пользователь не найден.');
        const email = data.email || user.email;
        // Legacy tweets identify the author by email; update their author in the same transaction.
        if (email !== user.email) {
            if (await User.findOne({ where: { id: { [Op.ne]: userId }, email }, transaction })) fail(409, 'Email уже используется.');
            await Tweet.update({ author: email }, { where: { author: user.email }, transaction });
        }
        await user.update({ email, ...(hash ? { passwordHash: hash } : {}) }, { transaction });
        return user;
    });
    res.json(safe(user));
};
exports.remove = async (req, res) => {
    const userId = id(req.params.id);
    owner(req, userId);
    await sequelize.transaction(async transaction => {
        const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!user) fail(404, 'Пользователь не найден.');
        if (await Tweet.count({ where: { author: user.email }, transaction }) ||
            await Comment.count({ where: { authorId: userId }, transaction })) fail(409, 'Сначала удалите публикации и комментарии пользователя.');
        await LoginLog.destroy({ where: { userId }, transaction });
        await user.destroy({ transaction });
    });
    res.sendStatus(204);
};
