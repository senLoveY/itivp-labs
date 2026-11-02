import { useState, useEffect } from 'react';
import { fetchCommentsAPI, createCommentAPI } from '../api';
import Loader from '../components/Loader';
import CommentItem from './CommentItem';

function errorText(err) {
  return err.response?.data?.error || 'сервер недоступен';
}

function CommentSection({ tweetId, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchCommentsAPI(tweetId)
      .then(res => setComments(res.data.comments))
      .catch(err => setError('Не удалось загрузить комментарии: ' + errorText(err)))
      .finally(() => setLoading(false));
  }, [tweetId]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);
    setError('');
    try {
      const res = await createCommentAPI(tweetId, text.trim());
      setComments(prev => [res.data, ...prev]);
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
          onChange={e => setText(e.target.value)}
          maxLength={280}
        />
        <button className="btn-main" disabled={sending || !text.trim()}>Отправить</button>
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
        />
      ))}
    </div>
  );
}

export default CommentSection;
