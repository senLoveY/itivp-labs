import { useState, useEffect, useRef } from 'react';
import { fetchCommentsAPI, createCommentAPI, getCurrentUser } from '../api';
import { socket } from '../socket';
import Loader from '../components/Loader';
import CommentItem from './CommentItem';

function errorText(err) {
  return err.response?.data?.error || 'сервер недоступен';
}

function typingText(emails) {
  if (emails.length === 1) return `${emails[0]} печатает…`;
  return `${emails.length} ${emails.length < 5 ? 'человека' : 'человек'} печатают…`;
}

function upsert(list, comment) {
  if (list.some(c => c._id === comment._id)) {
    return list.map(c => (c._id === comment._id ? comment : c));
  }
  return [comment, ...list];
}

const PREVIEW = 3;
const PREVIEW_REPLIES = 2;
const PAGE = 20;

function CommentSection({ tweetId, full = false, commentsCount = 0, onShowAll, onCountChange, onAuthorClick }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typers, setTypers] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const typing = useRef({ active: false, timer: null });
  const sentinel = useRef(null);

  useEffect(() => {
    fetchCommentsAPI(tweetId, full ? PAGE : PREVIEW)
      .then(res => {
        setComments(res.data.comments);
        setHasMore(res.data.comments.length < res.data.total);
      })
      .catch(err => setError('Не удалось загрузить комментарии: ' + errorText(err)))
      .finally(() => setLoading(false));
  }, [tweetId, full]);

  function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchCommentsAPI(tweetId, PAGE, comments.length)
      .then(res => {
        setComments(prev => [...prev, ...res.data.comments.filter(c => !prev.some(p => p._id === c._id))]);
        setHasMore(res.data.comments.length === PAGE);
      })
      .catch(err => setError('Не удалось загрузить комментарии: ' + errorText(err)))
      .finally(() => setLoadingMore(false));
  }

  useEffect(() => {
    if (!full || !hasMore || !sentinel.current) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  });

  useEffect(() => {
    const me = getCurrentUser()?.email;

    function join() {
      socket.emit('tweet:join', tweetId, (res) => {
        if (!res?.ok) console.warn('tweet:join failed', res?.error);
      });
    }

    function onUpsert(comment) {
      if (comment.tweetId === tweetId) setComments(prev => upsert(prev, comment));
    }

    function onDelete({ id, tweetId: from }) {
      if (from === tweetId) setComments(prev => prev.filter(c => c._id !== id));
    }

    function onTyping({ tweetId: from, email, typing: isTyping }) {
      if (from !== tweetId || email === me) return;
      setTypers(prev => {
        const rest = prev.filter(e => e !== email);
        return isTyping ? [...rest, email] : rest;
      });
    }

    join();
    socket.on('connect', join);
    socket.on('comment:upsert', onUpsert);
    socket.on('comment:delete', onDelete);
    socket.on('comment:typing', onTyping);

    const state = typing.current;
    return () => {
      if (state.active) socket.emit('comment:typing', { tweetId, typing: false });
      clearTimeout(state.timer);
      state.active = false;

      socket.off('connect', join);
      socket.off('comment:upsert', onUpsert);
      socket.off('comment:delete', onDelete);
      socket.off('comment:typing', onTyping);
      socket.emit('tweet:leave', tweetId);
    };
  }, [tweetId]);

  function stopTyping() {
    const state = typing.current;
    clearTimeout(state.timer);
    if (state.active) {
      state.active = false;
      socket.emit('comment:typing', { tweetId, typing: false });
    }
  }

  function changeText(value) {
    setText(value);
    const state = typing.current;
    if (!state.active && value.trim()) {
      state.active = true;
      socket.emit('comment:typing', { tweetId, typing: true });
    }
    clearTimeout(state.timer);
    state.timer = setTimeout(stopTyping, 2000);
  }

  async function send(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;

    stopTyping();
    setSending(true);
    setError('');
    try {
      const res = await createCommentAPI(tweetId, text.trim());
      setComments(prev => upsert(prev, res.data));
      onCountChange(n => n + 1);
      setText('');
    } catch (err) {
      setError('Не удалось отправить комментарий: ' + errorText(err));
    } finally {
      setSending(false);
    }
  }

  function replaceComment(updated) {
    setComments(prev => prev.map(c => (c._id === updated._id ? updated : c)));
  }

  function removeComment(id) {
    setComments(prev => prev.filter(c => c._id !== id));
  }

  const visible = full ? comments : comments.slice(0, PREVIEW);
  const shown = visible.reduce((n, c) => n + 1 + Math.min(c.replies.length, PREVIEW_REPLIES), 0);

  return (
    <div className="comments">
      <form className="comment-form" onSubmit={send}>
        <input
          type="text"
          placeholder="Написать комментарий..."
          value={text}
          onChange={e => changeText(e.target.value)}
          maxLength={280}
        />
        <button className="btn-main" disabled={sending || !text.trim()}>Отправить</button>
        {typers.length > 0 && <span className="hint typing">{typingText(typers)}</span>}
      </form>

      {error && <p className="error comment-error">{error}</p>}
      {loading && <Loader />}
      {!loading && !error && comments.length === 0 && <p className="hint">Комментариев пока нет</p>}

      {visible.map(comment => (
        <CommentItem
          key={comment._id}
          comment={comment}
          repliesLimit={full ? undefined : PREVIEW_REPLIES}
          onShowAll={onShowAll}
          onChange={replaceComment}
          onDelete={removeComment}
          onCountChange={onCountChange}
          onAuthorClick={onAuthorClick}
        />
      ))}

      {full && hasMore && <div ref={sentinel}>{loadingMore && <Loader />}</div>}
      {!full && !loading && commentsCount > shown && (
        <button className="show-all" onClick={onShowAll}>
          Все комментарии ({commentsCount})
        </button>
      )}
    </div>
  );
}

export default CommentSection;
