require('dotenv').config();
const express = require('express');
const { Tweet } = require('./models');

const app = express();
const port = 3000;

app.use(express.json());

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

app.delete('/tweets/:id', async (req, res) => {
    try {
        const tweet = await Tweet.findByPk(req.params.id);

        if (!tweet) {
            return res.status(404).json({ error: "Tweet not found" });
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