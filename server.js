require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = require('./config/swagger');
const { verifyToken, isAdmin } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const tweetRoutes = require('./routes/tweets');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const commentRoutes = require('./routes/comments');
const connectMongo = require('./config/mongo');
const { initSocket } = require('./socket');

connectMongo();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use('/auth', authRoutes);
app.use('/tweets', tweetRoutes);
app.use('/comments', commentRoutes);
app.use('/admin', verifyToken, isAdmin, adminRoutes);
app.use('/', userRoutes);

app.use((req, res, next) => {
    res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Server error" });
});

const server = http.createServer(app);
initSocket(server);

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
