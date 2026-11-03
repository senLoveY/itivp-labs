const Notification = require('../mongo-models/Notification');
const { getIO } = require('./index');

const notify = async ({ to, from, type, tweetId, text = '' }) => {
    if (!to || to === from) return;

    try {
        const notification = await Notification.create({ to, from, type, tweetId, text: text.slice(0, 80) });
        getIO().to(`user:${to}`).emit('notification', notification);
    } catch (error) {
        console.error(error);
    }
};

module.exports = notify;
