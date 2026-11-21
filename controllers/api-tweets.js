const { User, Tweet, sequelize } = require('../models');
const { fail, id, body, text, integer, owner } = require('../middleware/api');

function validate(req, required) {
    const data = body(req, ['content','hashtags','authorId'], required);
    const result = {};
    if (Object.hasOwn(data, 'content')) result.content = text(data.content, 'content', 280);
    if (Object.hasOwn(data, 'authorId')) result.authorId = integer(data.authorId, 'authorId');
    if (Object.hasOwn(data, 'hashtags')) {
        if (!Array.isArray(data.hashtags) || data.hashtags.length > 10) fail(400, 'hashtags: массив до 10 тегов.');
        result.hashtags = [...new Set(data.hashtags.map(tag => {
            const name = text(tag, 'тег', 40).replace(/^#+/, '').toLowerCase();
            if (!name || /[\s,#]/u.test(name)) fail(400, 'Некорректный тег.');
            return '#' + name;
        }))];
    }
    return result;
}
exports.list = async (req, res) => {
    const where = {};
    if (req.query.authorId !== undefined) {
        const user = await User.findByPk(id(req.query.authorId));
        if (!user) fail(404, 'Автор не найден.');
        where.author = user.email;
    }
    res.json(await Tweet.findAll({ where, order: [['id','DESC']] }));
};
exports.get = async (req, res) => {
    const tweet = await Tweet.findByPk(id(req.params.id));
    if (!tweet) fail(404, 'Пост не найден.');
    res.json(tweet);
};
exports.create = async (req, res) => {
    const data = validate(req, ['content','hashtags','authorId']);
    owner(req, data.authorId);
    const tweet = await sequelize.transaction(async transaction => {
        const user = await User.findByPk(data.authorId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!user) fail(400, 'Автор не существует.');
        return Tweet.create({ author: user.email, content: data.content, hashtags: data.hashtags, likesCount: 0 }, { transaction });
    });
    res.location('/api/tweets/' + tweet.id).status(201).json(tweet);
};
exports.update = async (req, res) => {
    const tweetId = id(req.params.id);
    const data = validate(req, req.method === 'PUT' ? ['content','hashtags','authorId'] : []);
    const tweet = await sequelize.transaction(async transaction => {
        // Lock the actor before the tweet, as user updates also update legacy author emails.
        const actor = await User.findByPk(req.apiUser.id, { transaction, lock: transaction.LOCK.UPDATE });
        const tweet = await Tweet.findByPk(tweetId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!tweet) fail(404, 'Пост не найден.');
        if (actor.role !== 'admin' && tweet.author !== actor.email) fail(403, 'Недостаточно прав.');
        const changes = {};
        if (data.content !== undefined) changes.content = data.content;
        if (data.hashtags !== undefined) changes.hashtags = data.hashtags;
        if (data.authorId !== undefined) {
            const user = await User.findByPk(data.authorId, { transaction, lock: transaction.LOCK.UPDATE });
            if (!user) fail(400, 'Автор не существует.');
            owner(req, user.id);
            changes.author = user.email;
        }
        await tweet.update(changes, { transaction });
        return tweet;
    });
    res.json(tweet);
};
exports.remove = async (req, res) => {
    const tweetId = id(req.params.id);
    await sequelize.transaction(async transaction => {
        const actor = await User.findByPk(req.apiUser.id, { transaction, lock: transaction.LOCK.UPDATE });
        const tweet = await Tweet.findByPk(tweetId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!tweet) fail(404, 'Пост не найден.');
        if (actor.role !== 'admin' && tweet.author !== actor.email) fail(403, 'Недостаточно прав.');
        await tweet.destroy({ transaction }); // PostgreSQL cascades deletion to Comments.
    });
    res.sendStatus(204);
};
