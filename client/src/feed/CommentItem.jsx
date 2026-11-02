import { useState } from 'react';
import { updateCommentAPI, deleteCommentAPI, likeCommentAPI, addReplyAPI, likeReplyAPI, deleteReplyAPI, getCurrentUser } from '../api';

function CommentItem({ comment, onChange, onDelete, onCountChange }) {
  const user = getCurrentUser();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canChange = comment.author === user?.email || user?.role === 'admin';
  const liked = comment.likedBy?.includes(user?.email);

  // общий обработчик запроса: блокирует кнопки и показывает ошибку
  async function run(request, onSuccess, failText) {
    setBusy(true);
    setError('');
    try {
      const res = await request();
      onSuccess(res.data);
    } catch (err) {
      setError(failText + ': ' + (err.response?.data?.error || 'сервер недоступен'));
    } finally {
      setBusy(false);
    }
  }

  function startEdit() {
    setEditText(comment.text);
    setEditing(true);
  }

  function saveEdit() {
    if (!editText.trim()) return;
    run(
      () => updateCommentAPI(comment._id, editText.trim()),
      data => {
        onChange(data);
        setEditing(false);
      },
      'Не удалось изменить комментарий'
    );
  }

  function remove() {
    run(
      () => deleteCommentAPI(comment._id),
      () => {
        onDelete(comment._id);
        onCountChange(n => n - 1 - comment.replies.length);
      },
      'Не удалось удалить комментарий'
    );
  }

  function like() {
    run(() => likeCommentAPI(comment._id), onChange, 'Не удалось поставить лайк');
  }

  function sendReply(e) {
    e.preventDefault();
    if (!replyText.trim() || busy) return;
    run(
      () => addReplyAPI(comment._id, replyText.trim()),
      data => {
        onChange(data);
        onCountChange(n => n + 1);
        setReplyText('');
        setReplying(false);
      },
      'Не удалось отправить ответ'
    );
  }

  function likeReply(replyId) {
    run(() => likeReplyAPI(comment._id, replyId), onChange, 'Не удалось поставить лайк');
  }

  function removeReply(replyId) {
    run(
      () => deleteReplyAPI(comment._id, replyId),
      data => {
        onChange(data);
        onCountChange(n => n - 1);
      },
      'Не удалось удалить ответ'
    );
  }

  return (
    <div className="comment">
      <div className="comment-top">
        <b>{comment.author}</b>
        <span className="hint">
          {new Date(comment.createdAt).toLocaleString()}
          {comment.editHistory.length > 0 && ' · изменено'}
        </span>
      </div>

      {editing ? (
        <div>
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={2}
            maxLength={280}
            autoFocus
          />
          <button className="btn-main" onClick={saveEdit} disabled={busy}>Сохранить</button>
          <button onClick={() => setEditing(false)}>Отмена</button>
        </div>
      ) : (
        <p className="comment-text">{comment.text}</p>
      )}

      {!editing && (
        <div className="comment-buttons">
          <button className={liked ? 'like-btn liked' : 'like-btn'} onClick={like} disabled={busy}>
            {liked ? '♥' : '♡'} {comment.likes}
          </button>
          <button onClick={() => setReplying(!replying)} disabled={busy}>Ответить</button>
          {canChange && (
            <>
              <button onClick={startEdit} disabled={busy}>Изменить</button>
              <button onClick={remove} disabled={busy}>Удалить</button>
            </>
          )}
        </div>
      )}

      {error && <p className="error comment-error">{error}</p>}

      {comment.replies.length > 0 && (
        <div className="replies">
          {comment.replies.map(reply => {
            const liked = reply.likedBy?.includes(user?.email);
            const canDelete = reply.author === user?.email || canChange;

            return (
              <div key={reply._id} className="reply">
                <div className="comment-top">
                  <b>{reply.author}</b>
                  <span className="hint">{new Date(reply.createdAt).toLocaleString()}</span>
                </div>
                <p className="comment-text">{reply.text}</p>
                <div className="comment-buttons">
                  <button
                    className={liked ? 'like-btn liked' : 'like-btn'}
                    onClick={() => likeReply(reply._id)}
                    disabled={busy}
                  >
                    {liked ? '♥' : '♡'} {reply.likes}
                  </button>
                  {canDelete && (
                    <button onClick={() => removeReply(reply._id)} disabled={busy}>Удалить</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {replying && (
        <form className="comment-form reply-form" onSubmit={sendReply}>
          <input
            type="text"
            placeholder={`Ответ для ${comment.author}`}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            maxLength={280}
            autoFocus
          />
          <button className="btn-main" disabled={busy || !replyText.trim()}>Ответить</button>
        </form>
      )}
    </div>
  );
}

export default CommentItem;
