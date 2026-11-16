const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    to: { type: String, required: true },
    from: { type: String, required: true },
    type: { type: String, enum: ['like', 'comment', 'reply'], required: true },
    tweetId: Number,
    text: { type: String, maxlength: 80 },
    read: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ to: 1, createdAt: -1 });

notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', notificationSchema);
