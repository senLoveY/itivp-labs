require('dotenv').config();
const express = require('express');
const { Tweet, User, LoginLog } = require('./models');
const authRoutes = require('./routes/auth');
const { verifyToken, isAdmin, isNotBanned} = require('./middleware/auth');

const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Microblogging API',
            version: '1.0.0',
            description: 'API documentation for the microblogging platform.'
        },
        servers: [
            { url: 'http://localhost:3000' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            }
        },
        security: [{ bearerAuth: [] }] 
    },
    apis: ['./server.js', './routes/*.js'], 
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

const port = 3000;

app.use(express.json());

app.use('/auth', authRoutes);

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users & Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns protected user data from JWT (id, email, role)
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Invalid or expired token
 */
app.get('/profile', verifyToken, async (req, res) => {
    res.status(200).json({ 
        message: "This is a protected profile route.",
        user: req.user 
    });
});

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users & Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns an array of users (id, email, role, createdAt)
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Access denied. Admin rights required or invalid token
 *       500:
 *         description: Error retrieving users
 */
app.get('/admin/users', verifyToken, isAdmin, async (req, res) => {
    try {
        const users = await User.findAll({ attributes: ['id', 'email', 'role', 'createdAt'] });
        res.status(200).json({
            message: "Secret admin panel",
            users
        });
    } catch (error) {
        res.status(500).json({ error: "Error retrieving users" });
    }
});

/**
 * @swagger
 * /admin/logs:
 *   get:
 *     summary: View login logs (Admin only)
 *     tags: [Users & Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns up to 50 latest login attempts
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Admin rights required or invalid token
 *       500:
 *         description: Error retrieving logs
 */
app.get('/admin/logs', verifyToken, isAdmin, async (req, res) => {
    try {
        const logs = await LoginLog.findAll({
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        res.status(200).json({
            message: "Login logs retrieved successfully",
            logs
        });
    } catch (error) {
        console.error("LOGS ERROR:", error);
        res.status(500).json({ error: "Error retrieving logs" });
    }
});

/**
 * @swagger
 * /admin/users/{id}/ban:
 *   post:
 *     summary: Ban a user (Admin only)
 *     tags: [Users & Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to ban
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               banReason:
 *                 type: string
 *                 example: Violation of community guidelines
 *     responses:
 *       200:
 *         description: User successfully banned
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Cannot ban another admin, or admin rights required / invalid token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error during blocking
 */
app.post('/admin/users/:id/ban', verifyToken, isAdmin, async (req, res) => {
    try {
        const { banReason } = req.body;
        const targetUser = await User.findByPk(req.params.id);

        if (!targetUser) return res.status(404).json({ error: "User not found" });
        if (targetUser.role === 'admin') return res.status(403).json({ error: "You can't ban an admin!" });

        await targetUser.update({ 
            isBanned: true, 
            banReason: banReason || 'Reason not specified' 
        });

        res.status(200).json({ message: `User ${targetUser.email} banned.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error during blocking" });
    }
});

/**
 * @swagger
 * /admin/users/{id}/unban:
 *   post:
 *     summary: Unban a user (Admin only)
 *     tags: [Users & Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to unban
 *     responses:
 *       200:
 *         description: User successfully unbanned
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Admin rights required or invalid token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error during unblocking
 */
app.post('/admin/users/:id/unban', verifyToken, isAdmin, async (req, res) => {
    try {
        const targetUser = await User.findByPk(req.params.id);
        if (!targetUser) return res.status(404).json({ error: "User not found" });

        await targetUser.update({ isBanned: false, banReason: null });
        res.status(200).json({ message: `User ${targetUser.email} unbanned.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error during unblocking" });
    }
});

/**
 * @swagger
 * /tweets:
 *   get:
 *     summary: Get a list of all tweets
 *     tags: [Tweets]
 *     security: []
 *     responses:
 *       200:
 *         description: An array of tweets ordered by createdAt DESC
 *       500:
 *         description: Database error while fetching tweets
 *
 *   post:
 *     summary: Create a new tweet
 *     description: Author is taken from the JWT token (user email). Banned users cannot create tweets.
 *     tags: [Tweets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: Hello from Swagger!
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["#swagger", "#api"]
 *     responses:
 *       201:
 *         description: Tweet successfully created
 *       400:
 *         description: The content field is mandatory
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Invalid/expired token or account is banned
 *       404:
 *         description: User not found (during ban check)
 *       500:
 *         description: Database error while creating tweet
 */
app.get('/tweets', async (req, res) => {
    try {
        const tweets = await Tweet.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(tweets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while fetching tweets" });
    }
});

/**
 * @swagger
 * /tweets/{id}:
 *   get:
 *     summary: Get a tweet by ID
 *     tags: [Tweets]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tweet ID
 *     responses:
 *       200:
 *         description: Tweet found
 *       404:
 *         description: Tweet not found
 *       500:
 *         description: Database error while fetching tweet
 *
 *   put:
 *     summary: Update an existing tweet
 *     description: Only the tweet author or an admin can update. Banned users cannot update tweets.
 *     tags: [Tweets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tweet ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - author
 *               - content
 *             properties:
 *               author:
 *                 type: string
 *                 example: admin@mail.com
 *               content:
 *                 type: string
 *                 example: Updated tweet content
 *               hashtags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["#updated"]
 *     responses:
 *       200:
 *         description: Tweet successfully updated
 *       400:
 *         description: The author and content fields are mandatory for update
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Access denied (not owner/admin), invalid token, or account is banned
 *       404:
 *         description: Tweet or user not found
 *       500:
 *         description: Database error while updating tweet
 *
 *   delete:
 *     summary: Delete a tweet
 *     description: Only the tweet author or an admin can delete. Banned users cannot delete tweets.
 *     tags: [Tweets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tweet ID
 *     responses:
 *       200:
 *         description: Tweet successfully deleted
 *       401:
 *         description: Token not provided
 *       403:
 *         description: Access denied (not owner/admin), invalid token, or account is banned
 *       404:
 *         description: Tweet or user not found
 *       500:
 *         description: Database error while deleting tweet
 */
app.get('/tweets/:id', async (req, res) => {
    try {
        const tweet = await Tweet.findByPk(req.params.id);
        
        if (!tweet) {
            return res.status(404).json({ error: "Tweet not found" });
        }
        
        res.status(200).json(tweet);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while fetching tweet" });
    }
});

app.post('/tweets', verifyToken, isNotBanned, async (req, res) => {
    try {
        const { content, hashtags } = req.body;
        const author = req.user.email;

        if (!content) {
            return res.status(400).json({ error: "The 'content' field is mandatory." });
        }

        const newTweet = await Tweet.create({
            author,
            content,
            hashtags: hashtags || []
        });

        res.status(201).json(newTweet);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while creating tweet" });
    }
});

app.put('/tweets/:id', verifyToken, isNotBanned, async (req, res) => {
    try {
        const { author, content, hashtags } = req.body;
        const tweet = await Tweet.findByPk(req.params.id);

        if (!tweet) {
            return res.status(404).json({ error: "Tweet not found" });
        }

        if (tweet.author !== req.user.email && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Access denied. You can only update your own tweets." });
        }

        if (!author || !content) {
            return res.status(400).json({ error: "The 'author' and 'content' fields are mandatory for update." });
        }

        await tweet.update({
            author,
            content,
            hashtags: hashtags || []
        });

        res.status(200).json(tweet);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while updating tweet" });
    }
});

app.delete('/tweets/:id', verifyToken, isNotBanned, async (req, res) => {
    try {
        const tweet = await Tweet.findByPk(req.params.id);

        if (!tweet) {
            return res.status(404).json({ error: "Tweet not found" });
        }

        if (tweet.author !== req.user.email && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Access denied. You can only delete your own tweets." });
        }

        await tweet.destroy();
        
        res.status(200).json({ message: "Tweet successfully deleted", deleted: tweet });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while deleting tweet" });
    }
});

app.use((req, res, next) => {
    res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Server error" });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
