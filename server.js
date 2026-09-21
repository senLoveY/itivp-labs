require('dotenv').config(); // Обязательно подключаем dotenv в самом начале!
const express = require('express');
const { Tweet } = require('./models'); // Подключаем модель Sequelize

const app = express();
const port = 3000;

app.use(express.json());

// 1. GET /tweets – получение всех твитов из БД
app.get('/tweets', async (req, res) => {
    try {
        // Получаем все записи, сортируем по дате создания (новые сверху)
        const tweets = await Tweet.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(tweets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while fetching tweets" });
    }
});

// 2. GET /tweets/:id – получение одного твита по ID
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

// 3. POST /tweets – создание нового твита в БД
app.post('/tweets', async (req, res) => {
    try {
        const { author, content, hashtags } = req.body;

        if (!author || !content) {
            return res.status(400).json({ error: "The 'author' and 'content' fields are mandatory." });
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

// 4. PUT /tweets/:id – обновление твита
app.put('/tweets/:id', async (req, res) => {
    try {
        const { author, content, hashtags } = req.body;
        const tweet = await Tweet.findByPk(req.params.id);

        if (!tweet) {
            return res.status(404).json({ error: "Tweet not found" });
        }

        if (!author || !content) {
            return res.status(400).json({ error: "The 'author' and 'content' fields are mandatory for update." });
        }

        // Обновляем поля в базе данных
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

// 5. DELETE /tweets/:id – удаление твита из БД
app.delete('/tweets/:id', async (req, res) => {
    try {
        const tweet = await Tweet.findByPk(req.params.id);

        if (!tweet) {
            return res.status(404).json({ error: "Tweet not found" });
        }

        // Удаляем запись из базы данных
        await tweet.destroy();
        
        res.status(200).json({ message: "Tweet successfully deleted", deleted: tweet });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database error while deleting tweet" });
    }
});

// Обработка несуществующих маршрутов (404)
app.use((req, res, next) => {
    res.status(404).json({ error: "Route not found" });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Server error" });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});