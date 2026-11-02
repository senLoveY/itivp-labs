const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
    author: { type: String, required: true },
    replyTo: { type: String, trim: true },
    text: { type: String, required: true, trim: true, maxlength: 280 },
    likes: { type: Number, default: 0, min: 0 },
    likedBy: [String]
}, { timestamps: true });

const editSchema = new mongoose.Schema({
    text: String,
    editedAt: { type: Date, default: Date.now }
}, { _id: false });

const commentSchema = new mongoose.Schema({
    tweetId: { type: Number, required: true, index: true },
    author: { type: String, required: true },
    text: { type: String, required: true, trim: true, maxlength: 280 },
    likes: { type: Number, default: 0, min: 0 },
    likedBy: [String],
    replies: [replySchema],
    editHistory: [editSchema]
}, { timestamps: true });

commentSchema.methods.canEdit = function (user) {
    return this.author === user.email || user.role === 'admin';
};

commentSchema.statics.findByTweet = function (tweetId) {
    return this.find({ tweetId }).sort({ createdAt: -1 });
};

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
