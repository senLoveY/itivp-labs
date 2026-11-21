const jwt = require('jsonwebtoken');
const { User } = require('../models');

function fail(status, message) {
    const error = new Error(message);
    error.status = status;
    throw error;
}

function id(value) {
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
        fail(400, 'ID должен быть положительным целым числом.');
    }
    return Number(value);
}

function body(req, fields, required) {
    const data = req.body;
    if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.keys(data).length) fail(400, 'Ожидается непустой JSON-объект.');
    if (Object.keys(data).some(key => !fields.includes(key))) fail(400, 'Передано неизвестное или запрещённое поле.');
    if (required.some(key => !Object.hasOwn(data, key))) fail(400, 'Обязательные поля: ' + required.join(', '));
    return data;
}

function text(value, name, max) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(400, name + ': ожидается непустая строка до ' + max + ' символов.');
    return value.trim();
}

function integer(value, name) {
    if (!Number.isInteger(value) || value < 1 || value > 2147483647) fail(400, name + ': ожидается положительное целое число.');
    return value;
}

async function authenticate(req, res, next) {
    const match = /^Bearer (\S+)$/i.exec(req.get('Authorization') || '');
    if (!match) fail(401, 'Нужен Bearer JWT.');
    let payload;
    try { payload = jwt.verify(match[1], process.env.JWT_SECRET); }
    catch { fail(401, 'Токен недействителен или истёк.'); }
    if (!Number.isInteger(payload.id)) fail(401, 'Некорректный токен.');
    const user = await User.findByPk(payload.id);
    if (!user) fail(401, 'Пользователь не найден.');
    if (user.isBanned) fail(403, 'Пользователь заблокирован.');
    req.apiUser = user;
    next();
}

function owner(req, authorId) {
    if (req.apiUser.id !== authorId && req.apiUser.role !== 'admin') fail(403, 'Недостаточно прав.');
}

function errors(err, req, res, next) {
    if (res.headersSent) return next(err);
    const status = err.type === 'entity.parse.failed' ? 400 :
        err.name === 'SequelizeUniqueConstraintError' || err.name === 'SequelizeForeignKeyConstraintError' ? 409 :
        err.name === 'SequelizeValidationError' ? 400 : err.status || 500;
    if (status >= 500) console.error('API error:', err.message);
    res.status(status).json({ error: status >= 500 ? 'Ошибка сервера.' : err.type === 'entity.parse.failed' ? 'Некорректный JSON.' :
        status === 409 && !err.status ? 'Конфликт данных или связанных записей.' : err.message });
}

module.exports = { fail, id, body, text, integer, authenticate, owner, errors };
