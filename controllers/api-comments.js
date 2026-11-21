const { User, Tweet, Comment, sequelize } = require('../models');
const { fail, id, body, text, integer, owner } = require('../middleware/api');

function validate(req, required) {
    const data = body(req, ['text','authorId','tweetId'], required);
    const result = {};
    if (Object.hasOwn(data,'text')) result.text = text(data.text,'text',280);
    for (const key of ['authorId','tweetId']) if (Object.hasOwn(data,key)) result[key] = integer(data[key],key);
    return result;
}
async function related(data, transaction) {
    if (!await User.findByPk(data.authorId, { transaction })) fail(400,'Автор не существует.');
    if (!await Tweet.findByPk(data.tweetId, { transaction })) fail(400,'Пост не существует.');
}
exports.list = async (req,res) => {
    const where = {};
    for (const field of ['tweetId','authorId']) if (req.query[field] !== undefined) where[field] = id(req.query[field]);
    res.json(await Comment.findAll({ where, order: [['id','ASC']] }));
};
exports.get = async (req,res) => {
    const comment = await Comment.findByPk(id(req.params.id));
    if (!comment) fail(404,'Комментарий не найден.');
    res.json(comment);
};
exports.create = async (req,res) => {
    const data = validate(req,['text','authorId','tweetId']);
    owner(req,data.authorId);
    const comment = await sequelize.transaction(async transaction => {
        await related(data,transaction);
        return Comment.create(data,{transaction});
    });
    res.location('/api/comments/'+comment.id).status(201).json(comment);
};
exports.update = async (req,res) => {
    const commentId = id(req.params.id);
    const data = validate(req,req.method === 'PUT' ? ['text','authorId','tweetId'] : []);
    const comment = await sequelize.transaction(async transaction => {
        const comment = await Comment.findByPk(commentId,{ transaction, lock: transaction.LOCK.UPDATE });
        if (!comment) fail(404,'Комментарий не найден.');
        owner(req,comment.authorId);
        if (data.authorId !== undefined) owner(req,data.authorId);
        await related({ ...comment.toJSON(), ...data },transaction);
        await comment.update(data,{transaction});
        return comment;
    });
    res.json(comment);
};
exports.remove = async (req,res) => {
    const commentId = id(req.params.id);
    await sequelize.transaction(async transaction => {
        const comment = await Comment.findByPk(commentId,{transaction,lock:transaction.LOCK.UPDATE});
        if (!comment) fail(404,'Комментарий не найден.');
        owner(req,comment.authorId);
        await comment.destroy({transaction});
    });
    res.sendStatus(204);
};
