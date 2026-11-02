import { useState } from 'react';
import {
  updateCommentAPI,
  deleteCommentAPI,
  likeCommentAPI,
  addReplyAPI,
  updateReplyAPI,
  likeReplyAPI,
  deleteReplyAPI,
  getCurrentUser
} from '../api';
import { HeartIcon } from '../components/Icons';

function CommentItem({ comment, onChange, onDelete, onCountChange, onAuthorClick }) {
  const user = getCurrentUser();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [replying, setReplying] = useState(false);
  const [replyTo, setReplyTo] = useState('');
  const [replyText, setReplyText] = useState('');
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editReplyText, setEditReplyText] = useState('');
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

  // ответ на комментарий (target пустой) или на конкретный ответ — тогда в нём сохраняется адресат
  function toggleReply(target = '') {
    if (replying && replyTo === target) {
      setReplying(false);
      return;
    }
    setReplyTo(target);
    setReplying(true);
  }

  function sendReply(e) {
    e.preventDefault();
    if (!replyText.trim() || busy) return;
    run(
      () => addReplyAPI(comment._id, replyText.trim(), replyTo || undefined),
      data => {
        onChange(data);
        onCountChange(n => n + 1);
        setReplyText('');
        setReplying(false);
      },
      'Не удалось отправить ответ'
    );
  }

  function startEditReply(reply) {
    setEditReplyText(reply.text);
    setEditingReplyId(reply._id);
  }

  function saveEditReply() {
    if (!editReplyText.trim()) return;
    run(
      () => updateReplyAPI(comment._id, editingReplyId, editReplyText.trim()),
      data => {
        onChange(data);
        setEditingReplyId(null);
      },
      'Не удалось изменить ответ'
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
        <b className="author-link" onClick={() => onAuthorClick(comment.author)}>{comment.author}</b>
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
            <HeartIcon />
            {comment.likes}
          </button>
          <button onClick={() => toggleReply()} disabled={busy}>Ответить</button>
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
            const canEditReply = reply.author === user?.email || user?.role === 'admin';
            const canDelete = reply.author === user?.email || canChange;

            if (reply._id === editingReplyId) {
              return (
                <div key={reply._id} className="reply">
                  <div className="comment-top">
                    <b>{reply.author}</b>
                  </div>
                  <textarea
                    value={editReplyText}
                    onChange={e => setEditReplyText(e.target.value)}
                    rows={2}
                    maxLength={280}
                    autoFocus
                  />
                  <button className="btn-main" onClick={saveEditReply} disabled={busy}>Сохранить</button>
                  <button onClick={() => setEditingReplyId(null)}>Отмена</button>
                </div>
              );
            }

            return (
              <div key={reply._id} className="reply">
                <div className="comment-top">
                  <b className="author-link" onClick={() => onAuthorClick(reply.author)}>{reply.author}</b>
                  <span className="hint">
                    {new Date(reply.createdAt).toLocaleString()}
                    {reply.editedAt && ' · изменено'}
                  </span>
                </div>
                <p className="comment-text">
                  {reply.replyTo && (
                    <span className="mention author-link" onClick={() => onAuthorClick(reply.replyTo)}>
                      @{reply.replyTo}
                    </span>
                  )}
                  {reply.text}
                </p>
                <div className="comment-buttons">
                  <button
                    className={liked ? 'like-btn liked' : 'like-btn'}
                    onClick={() => likeReply(reply._id)}
                    disabled={busy}
                  >
                    <HeartIcon />
                    {reply.likes}
                  </button>
                  <button onClick={() => toggleReply(reply.author)} disabled={busy}>Ответить</button>
                  {canEditReply && (
                    <button onClick={() => startEditReply(reply)} disabled={busy}>Изменить</button>
                  )}
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
        <form key={replyTo} className="comment-form reply-form" onSubmit={sendReply}>
          <input
            type="text"
            placeholder={`Ответ для ${replyTo || comment.author}`}
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
