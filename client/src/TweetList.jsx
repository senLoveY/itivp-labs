import { useState, useEffect } from 'react';
import { fetchTweetsAPI, createTweetAPI, updateTweetAPI, deleteTweetAPI, likeTweetAPI, getCurrentUser } from './api';
import { getCache, setCache, clearCache } from './cache';

const PAGE_SIZE = 10;

// временный id для твита, который ещё не сохранён на сервере
function makeTempId() {
  return Date.now();
}

function TweetList() {
  const user = getCurrentUser();
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');

  function loadTweets(searchText, signal) {
    const cached = getCache(searchText);
    if (cached) {
      setTweets(cached);
      setHasMore(cached.length === PAGE_SIZE);
      setFromCache(true);
      setLoading(false);
      return;
    }

    fetchTweetsAPI({ search: searchText, limit: PAGE_SIZE, offset: 0 }, signal)
      .then(res => {
        setCache(searchText, res.data);
        setTweets(res.data);
        setFromCache(false);
        setHasMore(res.data.length === PAGE_SIZE);
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'CanceledError') return;
        setError(err.response?.data?.error || 'Не удалось загрузить твиты. Сервер недоступен.');
        setLoading(false);
      });
  }

  function loadMore() {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);

    fetchTweetsAPI({ search, limit: PAGE_SIZE, offset: tweets.length })
      .then(res => {
        setTweets(prev => [...prev, ...res.data.filter(t => !prev.some(p => p.id === t.id))]);
        setHasMore(res.data.length === PAGE_SIZE);
        setLoadingMore(false);
      })
      .catch(err => {
        setNotice('Не удалось загрузить твиты: ' + errorText(err));
        setLoadingMore(false);
      });
  }

  // без массива зависимостей: обработчик пересоздаётся после каждого рендера
  // и всегда видит актуальные tweets, hasMore и loadingMore
  useEffect(() => {
    function handleScroll() {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
        loadMore();
      }
    }

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  });

  function retry() {
    setLoading(true);
    setError('');
    loadTweets(search);
  }

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      loadTweets(search, controller.signal);
    }, search ? 500 : 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    document.title = `Твиты (${tweets.length})`;
  }, [tweets.length]);

  function parseTags(str) {
    return str
      .split(' ')
      .filter(t => t.trim())
      .map(t => (t.startsWith('#') ? t : '#' + t));
  }

  async function addTweet(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;

    const data = { content: text.trim(), hashtags: parseTags(tags) };
    const tempId = makeTempId();
    const tempTweet = {
      ...data,
      id: tempId,
      author: localStorage.getItem('email'),
      likesCount: 0,
      createdAt: new Date().toISOString(),
      liked: false,
      pending: true
    };

    setTweets(prev => [tempTweet, ...prev]);
    setText('');
    setTags('');
    setSending(true);

    try {
      const res = await createTweetAPI(data);
      clearCache();
      setTweets(prev => prev.map(t => (t.id === tempId ? { ...res.data, liked: false } : t)));
    } catch (err) {
      setTweets(prev => prev.filter(t => t.id !== tempId));
      setText(data.content);
      setNotice('Не удалось добавить твит: ' + errorText(err));
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      addTweet(e);
    }
  }

  function errorText(err) {
    return err.response?.data?.error || 'сервер недоступен';
  }

  async function deleteTweet(id) {
    const index = tweets.findIndex(t => t.id === id);
    const removed = tweets[index];

    setTweets(prev => prev.filter(t => t.id !== id));

    try {
      await deleteTweetAPI(id);
      clearCache();
    } catch (err) {
      setTweets(prev => [...prev.slice(0, index), removed, ...prev.slice(index)]);
      setNotice('Не удалось удалить твит: ' + errorText(err));
    }
  }

  async function likeTweet(id) {
    const old = tweets.find(t => t.id === id);
    const liked = !old.liked;

    setTweets(prev => prev.map(t => (t.id === id ? { ...t, liked, likesCount: t.likesCount + (liked ? 1 : -1) } : t)));

    try {
      const res = await likeTweetAPI(id);
      clearCache();
      setTweets(prev => prev.map(t => (t.id === id ? { ...t, liked: res.data.liked, likesCount: res.data.likesCount } : t)));
    } catch (err) {
      setTweets(prev => prev.map(t => (t.id === id ? { ...t, liked: old.liked, likesCount: old.likesCount } : t)));
      setNotice('Не удалось поставить лайк: ' + errorText(err));
    }
  }

  function canChange(tweet) {
    return tweet.author === user.email || user.role === 'admin';
  }

  function startEdit(tweet) {
    setEditId(tweet.id);
    setEditText(tweet.content);
  }

  async function saveEdit() {
    if (!editText.trim()) return;

    const id = editId;
    const old = tweets.find(t => t.id === id);
    const newContent = editText.trim();

    setTweets(prev => prev.map(t => (t.id === id ? { ...t, content: newContent } : t)));
    setEditId(null);

    try {
      const res = await updateTweetAPI(id, { content: newContent, hashtags: old.hashtags });
      clearCache();
      setTweets(prev => prev.map(t => (t.id === id ? { ...res.data, liked: t.liked } : t)));
    } catch (err) {
      setTweets(prev => prev.map(t => (t.id === id ? old : t)));
      setNotice('Не удалось изменить твит: ' + errorText(err));
    }
  }

  return (
    <div className="feed">
      <form onSubmit={addTweet} className="form compose">
        <textarea
          placeholder="Текст твита (Enter - отправить)"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          maxLength={280}
        />
        <input
          type="text"
          placeholder="Теги через пробел, например #react #lab5"
          value={tags}
          onChange={e => setTags(e.target.value)}
        />
        <div className="form-bottom">
          <span className="hint">{text.length}/280</span>
          <button type="submit" className="btn-main" disabled={!text.trim() || sending}>
            {sending ? 'Отправка...' : 'Отправить'}
          </button>
        </div>
      </form>

      <div className="search">
        <input
          type="text"
          placeholder="Поиск"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <p className="hint">
          Загружено твитов: {tweets.length}
          {fromCache && ' (из кэша)'}
        </p>
      </div>

      {notice && <p className="error message">{notice}</p>}

      {loading && <p className="hint message">Загрузка...</p>}

      {error && (
        <div className="message">
          <p className="error">{error}</p>
          <button className="btn-main" onClick={retry}>Повторить</button>
        </div>
      )}

      {!loading && !error && tweets.length === 0 && <p className="hint message">Ничего не найдено</p>}

      {tweets.map(tweet => (
        <div key={tweet.id} className="tweet">
          <div className="avatar">{tweet.author?.[0]?.toUpperCase()}</div>

          <div className="tweet-body">
            <div className="tweet-top">
              <b>{tweet.author}</b>
              <span className="hint">
                {tweet.pending ? 'отправляется...' : new Date(tweet.createdAt).toLocaleString()}
              </span>
            </div>

            {editId === tweet.id ? (
              <div>
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={3}
                  maxLength={280}
                />
                <button className="btn-main" onClick={saveEdit}>Сохранить</button>
                <button onClick={() => setEditId(null)}>Отмена</button>
              </div>
            ) : (
              <p className="tweet-text">{tweet.content}</p>
            )}

            {tweet.hashtags?.length > 0 && (
              <div className="tags">
                {tweet.hashtags.map(tag => (
                  <span key={tag} className="tag" onClick={() => setSearch(tag)}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="tweet-buttons">
              <button
                className={tweet.liked ? 'like-btn liked' : 'like-btn'}
                onClick={() => likeTweet(tweet.id)}
                disabled={tweet.pending}
              >
                {tweet.liked ? '♥' : '♡'} {tweet.likesCount}
              </button>
              {canChange(tweet) && (
                <>
                  <button onClick={() => startEdit(tweet)} disabled={tweet.pending}>Изменить</button>
                  <button onClick={() => deleteTweet(tweet.id)} disabled={tweet.pending}>Удалить</button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      {loadingMore && <p className="hint message">Загрузка...</p>}
      {!loading && !error && !hasMore && tweets.length > 0 && <p className="hint message">Больше твитов нет</p>}
    </div>
  );
}

export default TweetList;
