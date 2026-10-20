import { useState, useEffect } from 'react';
import { fetchTweetsAPI, createTweetAPI, updateTweetAPI, deleteTweetAPI, likeTweetAPI, getCurrentUser } from '../api';
import { getCache, setCache, clearCache } from '../cache';
import Loader from '../components/Loader';
import TweetForm from './TweetForm';
import TweetItem from './TweetItem';

const PAGE_SIZE = 10;

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

  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  function loadTweets(searchText, signal) {
    const cached = getCache(searchText);
    if (cached) {
      setTweets(cached);
      setHasMore(cached.length === PAGE_SIZE);
      setLoading(false);
      return;
    }

    fetchTweetsAPI({ search: searchText, limit: PAGE_SIZE, offset: 0 }, signal)
      .then(res => {
        setCache(searchText, res.data);
        setTweets(res.data);
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

  // возвращает true, если твит сохранён на сервере
  async function addTweet(content, hashtags) {
    const data = { content, hashtags };
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
    setSending(true);

    try {
      const res = await createTweetAPI(data);
      clearCache();
      setTweets(prev => prev.map(t => (t.id === tempId ? { ...res.data, liked: false } : t)));
      return true;
    } catch (err) {
      setTweets(prev => prev.filter(t => t.id !== tempId));
      setNotice('Не удалось добавить твит: ' + errorText(err));
      return false;
    } finally {
      setSending(false);
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

  async function saveEdit(id, newContent) {
    const old = tweets.find(t => t.id === id);

    setTweets(prev => prev.map(t => (t.id === id ? { ...t, content: newContent } : t)));

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
      <TweetForm sending={sending} onAdd={addTweet} />

      <div className="search">
        <input
          type="text"
          placeholder="Поиск"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <p className="hint">
          Загружено твитов: {tweets.length}
        </p>
      </div>

      {notice && <p className="error message">{notice}</p>}

      {loading && <Loader />}

      {error && (
        <div className="message">
          <p className="error">{error}</p>
          <button className="btn-main" onClick={retry}>Повторить</button>
        </div>
      )}

      {!loading && !error && tweets.length === 0 && <p className="hint message">Ничего не найдено</p>}

      {tweets.map(tweet => (
        <TweetItem
          key={tweet.id}
          tweet={tweet}
          canChange={canChange(tweet)}
          onLike={likeTweet}
          onDelete={deleteTweet}
          onSave={saveEdit}
          onTagClick={setSearch}
        />
      ))}

      {loadingMore && <Loader />}
      {!loading && !error && !hasMore && tweets.length > 0 && <p className="hint message">Больше твитов нет</p>}
    </div>
  );
}

export default TweetList;
