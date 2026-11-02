const express = require('express');
const mongoose = require('mongoose');
const Comment = require('../mongo-models/Comment');
const { Tweet } = require('../models');
const { verifyToken, isNotBanned } = require('../middleware/auth');

const router = express.Router();

const checkObjectId = (req, res, next, value) => {
    if (!mongoose.isValidObjectId(value)) {
        return res.status(400).json({ error: "Invalid id format" });
    }
    next();
};

router.param('id', checkObjectId);
router.param('replyId', checkObjectId);

const handleError = (res, error, message) => {
    if (error instanceof mongoose.Error.ValidationError) {
        return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: message });
};

/**
 * @swagger
 * /comments:
 *   get:
 *     summary: Get comments (MongoDB)
 *     tags: [Comments (MongoDB)]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: tweetId
 *         schema:
 *           type: integer
 *         description: Filter by tweet id from PostgreSQL
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of comments with nested replies
 *       500:
 *         description: Database error while fetching comments
 */
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const filter = {};
        if (req.query.tweetId) filter.tweetId = Number(req.query.tweetId);

        const [comments, total] = await Promise.all([
            Comment.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
            Comment.countDocuments(filter)
        ]);

        res.status(200).json({ total, limit, offset, comments });
    } catch (error) {
        handleError(res, error, "Database error while fetching comments");
    }
});

/**
 * @swagger
 * /comments/stats:
 *   get:
 *     summary: Top tweets by number of comments (aggregation pipeline)
 *     tags: [Comments (MongoDB)]
 *     security: []
 *     responses:
 *       200:
 *         description: tweetId with counts of comments, replies and likes
 *       500:
 *         description: Database error while building statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await Comment.aggregate([
            { $project: { tweetId: 1, likes: 1, repliesCount: { $size: '$replies' } } },
            {
                $group: {
                    _id: '$tweetId',
                    comments: { $sum: 1 },
                    replies: { $sum: '$repliesCount' },
                    likes: { $sum: '$likes' }
                }
            },
            { $sort: { comments: -1, replies: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, tweetId: '$_id', comments: 1, replies: 1, likes: 1 } }
        ]);

        res.status(200).json(stats);
    } catch (error) {
        handleError(res, error, "Database error while building statistics");
    }
});

/**
 * @swagger
 * /comments/counts:
 *   get:
 *     summary: Number of comments and replies for several tweets
 *     tags: [Comments (MongoDB)]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: tweetIds
 *         required: true
 *         schema:
 *           type: string
 *         description: Comma-separated tweet ids
 *         example: 1,2,3
 *     responses:
 *       200:
 *         description: Object { tweetId → count }, tweets without comments are omitted
 *       500:
 *         description: Database error while counting comments
 */
router.get('/counts', async (req, res) => {
    try {
        const tweetIds = String(req.query.tweetIds || '')
            .split(',')
            .map(Number)
            .filter(Number.isInteger);

        const rows = await Comment.aggregate([
            { $match: { tweetId: { $in: tweetIds } } },
            { $group: { _id: '$tweetId', count: { $sum: { $add: [1, { $size: '$replies' }] } } } }
        ]);

        const counts = {};
        rows.forEach(row => { counts[row._id] = row.count; });

        res.status(200).json(counts);
    } catch (error) {
        handleError(res, error, "Database error while counting comments");
    }
});

/**
 * @swagger
 * /comments/{id}:
 *   get:
 *     summary: Get comment by id
 *     tags: [Comments (MongoDB)]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Comment document
 *       400:
 *         description: Invalid id format
 *       404:
 *         description: Comment not found
 */
router.get('/:id', async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        res.status(200).json(comment);
    } catch (error) {
        handleError(res, error, "Database error while fetching comment");
    }
});

/**
 * @swagger
 * /comments:
 *   post:
 *     summary: Create comment to a tweet
 *     tags: [Comments (MongoDB)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tweetId
 *               - text
 *             properties:
 *               tweetId:
 *                 type: integer
 *                 example: 1
 *               text:
 *                 type: string
 *                 example: Great post!
 *     responses:
 *       201:
 *         description: Comment created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Token not provided
 *       404:
 *         description: Tweet not found in PostgreSQL
 */
router.post('/', verifyToken, isNotBanned, async (req, res) => {
    try {
        const { tweetId, text } = req.body;

        if (!Number.isInteger(tweetId)) {
            return res.status(400).json({ error: "The 'tweetId' field must be an integer." });
        }

        const tweet = await Tweet.findByPk(tweetId);
        if (!tweet) {
            return res.status(404).json({ error: "Tweet not found" });
        }

        const comment = await Comment.create({
            tweetId,
            author: req.user.email,
            text
        });

        res.status(201).json(comment);
    } catch (error) {
        handleError(res, error, "Database error while creating comment");
    }
});

/**
 * @swagger
 * /comments/{id}:
 *   put:
 *     summary: Update comment (previous text is saved to editHistory)
 *     tags: [Comments (MongoDB)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 example: Great post, thanks!
 *     responses:
 *       200:
 *         description: Updated comment
 *       400:
 *         description: Validation error
 *       403:
 *         description: Only author or admin can update
 *       404:
 *         description: Comment not found
 */
router.put('/:id', verifyToken, isNotBanned, async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: "The 'text' field is mandatory for update." });
        }

        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        if (!comment.canEdit(req.user)) {
            return res.status(403).json({ error: "Access denied. You can only update your own comments." });
        }

        const update = { $set: { text } };
        if (text !== comment.text) {
            update.$push = { editHistory: { text: comment.text } };
        }

        const updated = await Comment.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after', runValidators: true });

        res.status(200).json(updated);
    } catch (error) {
        handleError(res, error, "Database error while updating comment");
    }
});

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Delete comment with all its replies
 *     tags: [Comments (MongoDB)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted, deleted document returned
 *       403:
 *         description: Only author or admin can delete
 *       404:
 *         description: Comment not found
 */
router.delete('/:id', verifyToken, isNotBanned, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        if (!comment.canEdit(req.user)) {
            return res.status(403).json({ error: "Access denied. You can only delete your own comments." });
        }

        const deleted = await Comment.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: "Comment successfully deleted", deleted });
    } catch (error) {
        handleError(res, error, "Database error while deleting comment");
    }
});

/**
 * @swagger
 * /comments/{id}/like:
 *   patch:
 *     summary: Like or unlike a comment (one like per user)
 *     tags: [Comments (MongoDB)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment with updated likes
 *       404:
 *         description: Comment not found
 */
router.patch('/:id/like', verifyToken, isNotBanned, async (req, res) => {
    try {
        const id = req.params.id;
        const email = req.user.email;

        let comment = await Comment.findOneAndUpdate(
            { _id: id, likedBy: { $ne: email } },
            { $inc: { likes: 1 }, $push: { likedBy: email } },
            { returnDocument: 'after' }
        );

        if (!comment) {
            comment = await Comment.findOneAndUpdate(
                { _id: id, likedBy: email },
                { $inc: { likes: -1 }, $pull: { likedBy: email } },
                { returnDocument: 'after' }
            );
        }

        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        res.status(200).json(comment);
    } catch (error) {
        handleError(res, error, "Database error while liking comment");
    }
});

/**
 * @swagger
 * /comments/{id}/replies:
 *   post:
 *     summary: Add reply to comment ($push into nested array)
 *     tags: [Comments (MongoDB)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 example: I agree!
 *               replyTo:
 *                 type: string
 *                 description: Optional. Email of the reply author being answered
 *                 example: anna@mail.com
 *     responses:
 *       201:
 *         description: Comment with the new reply
 *       400:
 *         description: Validation error
 *       404:
 *         description: Comment not found
 */
router.post('/:id/replies', verifyToken, isNotBanned, async (req, res) => {
    try {
        const { text, replyTo } = req.body;

        const comment = await Comment.findByIdAndUpdate(
            req.params.id,
            { $push: { replies: { author: req.user.email, replyTo, text } } },
            { returnDocument: 'after', runValidators: true }
        );

        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        res.status(201).json(comment);
    } catch (error) {
        handleError(res, error, "Database error while adding reply");
    }
});

/**
 * @swagger
 * /comments/{id}/replies/{replyId}/like:
 *   patch:
 *     summary: Like or unlike a reply ($inc of an element inside array, one like per user)
 *     tags: [Comments (MongoDB)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: replyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment with updated reply likes
 *       404:
 *         description: Comment or reply not found
 */
router.patch('/:id/replies/:replyId/like', verifyToken, isNotBanned, async (req, res) => {
    try {
        const { id, replyId } = req.params;
        const email = req.user.email;

        let comment = await Comment.findOneAndUpdate(
            { _id: id, replies: { $elemMatch: { _id: replyId, likedBy: { $ne: email } } } },
            { $inc: { 'replies.$.likes': 1 }, $push: { 'replies.$.likedBy': email } },
            { returnDocument: 'after' }
        );

        if (!comment) {
            comment = await Comment.findOneAndUpdate(
                { _id: id, replies: { $elemMatch: { _id: replyId, likedBy: email } } },
                { $inc: { 'replies.$.likes': -1 }, $pull: { 'replies.$.likedBy': email } },
                { returnDocument: 'after' }
            );
        }

        if (!comment) {
            return res.status(404).json({ error: "Comment or reply not found" });
        }

        res.status(200).json(comment);
    } catch (error) {
        handleError(res, error, "Database error while liking reply");
    }
});

/**
 * @swagger
 * /comments/{id}/replies/{replyId}:
 *   put:
 *     summary: Update reply text ($set of an element inside array)
 *     tags: [Comments (MongoDB)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: replyId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 example: I agree, thanks!
 *     responses:
 *       200:
 *         description: Comment with updated reply
 *       400:
 *         description: Validation error
 *       403:
 *         description: Only reply author or admin can update
 *       404:
 *         description: Comment or reply not found
 */
router.put('/:id/replies/:replyId', verifyToken, isNotBanned, async (req, res) => {
    try {
        const text = (req.body.text || '').trim();

        if (!text) {
            return res.status(400).json({ error: "The 'text' field is mandatory for update." });
        }

        const comment = await Comment.findById(req.params.id);
        const reply = comment && comment.replies.id(req.params.replyId);

        if (!reply) {
            return res.status(404).json({ error: "Comment or reply not found" });
        }

        if (reply.author !== req.user.email && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Access denied. You can only update your own replies." });
        }

        const updated = await Comment.findOneAndUpdate(
            { _id: req.params.id, 'replies._id': req.params.replyId },
            { $set: { 'replies.$.text': text, 'replies.$.editedAt': new Date() } },
            { returnDocument: 'after', runValidators: true }
        );

        res.status(200).json(updated);
    } catch (error) {
        handleError(res, error, "Database error while updating reply");
    }
});

/**
 * @swagger
 * /comments/{id}/replies/{replyId}:
 *   delete:
 *     summary: Delete reply ($pull from nested array)
 *     tags: [Comments (MongoDB)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: replyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment without deleted reply
 *       403:
 *         description: Only reply author, comment author or admin can delete
 *       404:
 *         description: Comment or reply not found
 */
router.delete('/:id/replies/:replyId', verifyToken, isNotBanned, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        const reply = comment && comment.replies.id(req.params.replyId);

        if (!reply) {
            return res.status(404).json({ error: "Comment or reply not found" });
        }

        if (reply.author !== req.user.email && !comment.canEdit(req.user)) {
            return res.status(403).json({ error: "Access denied. You can only delete your own replies." });
        }

        const updated = await Comment.findByIdAndUpdate(
            req.params.id,
            { $pull: { replies: { _id: req.params.replyId } } },
            { returnDocument: 'after' }
        );

        res.status(200).json(updated);
    } catch (error) {
        handleError(res, error, "Database error while deleting reply");
    }
});

module.exports = router;
