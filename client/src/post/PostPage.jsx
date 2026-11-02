import { useEffect, useRef, useState } from 'react';
import { likeTweetAPI, updateTweetAPI, deleteTweetAPI, fetchCommentCountsAPI, getCurrentUser } from '../api';
import { clearCache } from '../cache';
import { socket } from '../socket';
import TweetItem from '../feed/TweetItem';

function errorText(err) {
  return err.response?.data?.error || 'сервер недоступен';
}

function PostPage({ tweet: initial, onBack, onTagClick, onAuthorClick }) {
  const user = getCurrentUser();
  const [tweet, setTweet] = useState(initial);
  const [commentsCount, setCommentsCount] = useState(0);
  const [notice, setNotice] = useState('');
  const liking = useRef(false);

  useEffect(() => {
    fetchCommentCountsAPI([tweet.id])
      .then(res => setCommentsCount(res.data[tweet.id] || 0))
      .catch(() => {});
  }, [tweet.id]);

  useEffect(() => {
    function onUpdate(updated) {
      if (updated.id === tweet.id) setTweet(prev => ({ ...updated, liked: prev.liked }));
    }

    function onDelete({ id }) {
      if (id === tweet.id) onBack();
    }

    function onLike({ id, likesCount }) {
      if (id === tweet.id) setTweet(prev => ({ ...prev, likesCount }));
    }

    function onCount({ tweetId, count }) {
      if (tweetId === tweet.id) setCommentsCount(count);
    }

    socket.on('tweet:update', onUpdate);
    socket.on('tweet:delete', onDelete);
    socket.on('tweet:like', onLike);
    socket.on('comment:count', onCount);
    return () => {
      socket.off('tweet:update', onUpdate);
      socket.off('tweet:delete', onDelete);
      socket.off('tweet:like', onLike);
      socket.off('comment:count', onCount);
    };
  }, [tweet.id, onBack]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function like() {
    if (liking.current) return;
    liking.current = true;
    const old = tweet;
    setTweet(prev => ({ ...prev, liked: !prev.liked, likesCount: prev.likesCount + (prev.liked ? -1 : 1) }));

    try {
      const res = await likeTweetAPI(tweet.id);
      clearCache();
      setTweet(prev => ({ ...prev, liked: res.data.liked, likesCount: res.data.likesCount }));
    } catch (err) {
      setTweet(old);
      setNotice('Не удалось поставить лайк: ' + errorText(err));
    } finally {
      liking.current = false;
    }
  }

  async function save(id, content) {
    const old = tweet;
    setTweet(prev => ({ ...prev, content }));

    try {
      const res = await updateTweetAPI(id, { content, hashtags: old.hashtags });
      clearCache();
      setTweet(prev => ({ ...res.data, liked: prev.liked }));
    } catch (err) {
      setTweet(old);
      setNotice('Не удалось изменить твит: ' + errorText(err));
    }
  }

  async function remove(id) {
    try {
      await deleteTweetAPI(id);
      clearCache();
      onBack();
    } catch (err) {
      setNotice('Не удалось удалить твит: ' + errorText(err));
    }
  }

  return (
    <div className="feed">
      <div className="post-head">
        <button onClick={onBack}>← Назад</button>
        <b>Пост</b>
      </div>

      {notice && <p className="error message">{notice}</p>}

      <TweetItem
        tweet={tweet}
        full
        canChange={tweet.author === user?.email || user?.role === 'admin'}
        commentsCount={commentsCount}
        onLike={like}
        onDelete={remove}
        onSave={save}
        onTagClick={onTagClick}
        onAuthorClick={onAuthorClick}
        onCommentsCountChange={(id, update) => setCommentsCount(n => Math.max(0, update(n)))}
      />
    </div>
  );
}

export default PostPage;
