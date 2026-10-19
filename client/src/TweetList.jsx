import { useState, useEffect } from 'react';

const defaultTweets = [
  { id: 1, author: 'admin', content: 'Первый твит, проверка', likes: 0, date: '19.10.2026, 12:00:00' },
  { id: 2, author: 'pavel', content: 'Делаю лабу по React, разбираюсь с useState и useEffect', likes: 3, date: '19.10.2026, 12:05:00' }
];

function TweetList() {
  const [tweets, setTweets] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('new');

  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = localStorage.getItem('tweets');
      setTweets(saved ? JSON.parse(saved) : defaultTweets);
      setLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem('tweets', JSON.stringify(tweets));
  }, [tweets, loaded]);

  useEffect(() => {
    document.title = `Твиты (${tweets.length})`;
  }, [tweets.length]);

  function addTweet(e) {
    e.preventDefault();
    if (!author.trim() || !text.trim()) return;

    const tweet = {
      id: Date.now(),
      author: author.trim(),
      content: text.trim(),
      likes: 0,
      date: new Date().toLocaleString()
    };

    setTweets(prev => [tweet, ...prev]);
    setText('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      addTweet(e);
    }
  }

  function deleteTweet(id) {
    setTweets(prev => prev.filter(t => t.id !== id));
  }

  function likeTweet(id) {
    setTweets(prev => prev.map(t => (t.id === id ? { ...t, likes: t.likes + 1 } : t)));
  }

  function startEdit(tweet) {
    setEditId(tweet.id);
    setEditText(tweet.content);
  }

  function saveEdit() {
    if (!editText.trim()) return;
    setTweets(prev => prev.map(t => (t.id === editId ? { ...t, content: editText.trim() } : t)));
    setEditId(null);
  }

  const q = search.toLowerCase();
  const shownTweets = tweets
    .filter(t => t.content.toLowerCase().includes(q) || t.author.toLowerCase().includes(q))
    .sort((a, b) => {
      if (sortBy === 'old') return a.id - b.id;
      if (sortBy === 'likes') return b.likes - a.likes;
      return b.id - a.id;
    });

  return (
    <div className="container">
      <h1>Микроблог</h1>

      <form onSubmit={addTweet} className="form">
        <input
          type="text"
          placeholder="Имя"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          maxLength={50}
        />
        <textarea
          placeholder="Текст твита (Enter - отправить)"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          maxLength={280}
        />
        <div className="form-bottom">
          <span className="hint">{text.length}/280</span>
          <button type="submit" className="btn-main" disabled={!author.trim() || !text.trim()}>
            Отправить
          </button>
        </div>
      </form>

      <div className="toolbar">
        <input
          type="text"
          placeholder="Поиск"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="new">Сначала новые</option>
          <option value="old">Сначала старые</option>
          <option value="likes">По лайкам</option>
        </select>
      </div>

      <h2>Твиты: {shownTweets.length}</h2>

      {!loaded && <p className="hint">Загрузка...</p>}
      {loaded && shownTweets.length === 0 && <p className="hint">Ничего не найдено</p>}

      {shownTweets.map(tweet => (
        <div key={tweet.id} className="tweet">
          <div className="tweet-top">
            <b>{tweet.author}</b>
            <span className="hint">{tweet.date}</span>
          </div>

          {editId === tweet.id ? (
            <div>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={3}
                maxLength={280}
              />
              <button onClick={saveEdit}>Сохранить</button>
              <button onClick={() => setEditId(null)}>Отмена</button>
            </div>
          ) : (
            <p className="tweet-text">{tweet.content}</p>
          )}

          <div className="tweet-buttons">
            <button onClick={() => likeTweet(tweet.id)}>Лайк ({tweet.likes})</button>
            <button onClick={() => startEdit(tweet)}>Изменить</button>
            <button onClick={() => deleteTweet(tweet.id)}>Удалить</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TweetList;
