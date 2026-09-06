const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

let tweets = [
    {
        id: "1",
        author: "user_1",
        content: "First twit! #first",
        hashtags: ["#first"],
        createdAt: new Date().toISOString()
    }
];

app.get('/tweets', (req, res) => {
    res.status(200).json(tweets);
});

app.get('/tweets/:id', (req, res) => {
    const tweet = tweets.find(t => t.id === req.params.id);
    if (!tweet) {
        return res.status(404).json({ error: "Твит не найден" });
    }
    res.status(200).json(tweet);
});

app.post('/tweets', (req, res) => {
    const { author, content, hashtags } = req.body;

    if (!author || !content) {
        return res.status(400).json({ error: "The 'author' and 'content' fields are mandatory." });
    }

    const newTweet = {
        id: Date.now().toString(),
        author,
        content,
        hashtags: hashtags || [],
        createdAt: new Date().toISOString()
    };

    tweets.push(newTweet);
    res.status(201).json(newTweet);
});

app.put('/tweets/:id', (req, res) => {
    const { author, content, hashtags } = req.body;
    const tweetIndex = tweets.findIndex(t => t.id === req.params.id);

    if (tweetIndex === -1) {
        return res.status(404).json({ error: "Twit not found" });
    }

    if (!author || !content) {
        return res.status(400).json({ error: "The 'author' and 'content' fields are mandatory for update." });
    }

    tweets[tweetIndex] = {
        ...tweets[tweetIndex],
        author,
        content,
        hashtags: hashtags || []
    };

    res.status(200).json(tweets[tweetIndex]);
});

app.delete('/tweets/:id', (req, res) => {
    const tweetIndex = tweets.findIndex(t => t.id === req.params.id);

    if (tweetIndex === -1) {
        return res.status(404).json({ error: "Твит не найден" });
    }

    const deletedTweet = tweets.splice(tweetIndex, 1);
    res.status(200).json({ message: "Твит успешно удален", deleted: deletedTweet[0] });
});

app.use((req, res, next) => {
    res.status(404).json({ error: "Маршрут не найден" });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});