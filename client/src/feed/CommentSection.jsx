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

// заменить комментарий с тем же _id или добавить новый в начало
function upsert(list, comment) {
  if (list.some(c => c._id === comment._id)) {
    return list.map(c => (c._id === comment._id ? comment : c));
  }
  return [comment, ...list];
}

function CommentSection({ tweetId, onCountChange, onAuthorClick }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typers, setTypers] = useState([]);
  const typing = useRef({ active: false, timer: null });

  useEffect(() => {
    fetchCommentsAPI(tweetId)
      .then(res => setComments(res.data.comments))
      .catch(err => setError('Не удалось загрузить комментарии: ' + errorText(err)))
      .finally(() => setLoading(false));
  }, [tweetId]);

  // пока ветка открыта, клиент находится в комнате поста
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

  // на сервер уходит только начало и конец набора, а не каждое нажатие
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
        {/* лежит поверх отступа под формой и не сдвигает комментарии */}
        {typers.length > 0 && <span className="hint typing">{typingText(typers)}</span>}
      </form>

      {error && <p className="error comment-error">{error}</p>}
      {loading && <Loader />}
      {!loading && !error && comments.length === 0 && <p className="hint">Комментариев пока нет</p>}

      {comments.map(comment => (
        <CommentItem
          key={comment._id}
          comment={comment}
          onChange={replaceComment}
          onDelete={removeComment}
          onCountChange={onCountChange}
          onAuthorClick={onAuthorClick}
        />
      ))}
    </div>
  );
}

export default CommentSection;
