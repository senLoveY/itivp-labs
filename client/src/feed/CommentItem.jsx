import { useId, useState } from 'react';
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
import UserAvatar from '../components/UserAvatar';
import PostTime from './PostTime';
import { HeartIcon } from '../components/Icons';

function repliesWord(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'ответ';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'ответа';
  return 'ответов';
}

const INITIAL_REPLIES = 2;

function CommentHeader({ author, createdAt, edited, onAuthorClick }) {
  return (
    <>
      <button type="button" className="thread-avatar" onClick={() => onAuthorClick(author)} aria-label={`Профиль: ${author}`}>
        <UserAvatar email={author} as="span" />
      </button>
      <div className="comment-top">
        <button type="button" className="thread-author" onClick={() => onAuthorClick(author)}>{author}</button>
        <PostTime value={createdAt} />
        {edited && <span className="hint">· изменено</span>}
      </div>
    </>
  );
}

function CommentItem({ comment, repliesLimit, onChange, onDelete, onAuthorClick }) {
  const user = getCurrentUser();
  const [expanded, setExpanded] = useState(false);
  const threadId = useId();
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
  const limit = repliesLimit ?? INITIAL_REPLIES;
  const replies = expanded ? comment.replies : comment.replies.slice(0, limit);
  const canToggle = comment.replies.length > limit;
  const hiddenReplies = comment.replies.length - replies.length;
  const liked = comment.likedBy?.includes(user?.email);

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
      () => onDelete(comment._id),
      'Не удалось удалить комментарий'
    );
  }

  function like() {
    run(() => likeCommentAPI(comment._id), onChange, 'Не удалось поставить лайк');
  }

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
        setReplyText('');
        setReplying(false);
        setExpanded(true);
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
      data => onChange(data),
      'Не удалось удалить ответ'
    );
  }

  return (
    <div className="comment">
      <div className={replies.length ? 'thread-entry thread-root has-replies' : 'thread-entry thread-root'}>
        <CommentHeader author={comment.author} createdAt={comment.createdAt}
          edited={comment.editHistory.length > 0} onAuthorClick={onAuthorClick} />

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

      </div>

      {replies.length > 0 && (
        <div className="replies" id={threadId}>
          {replies.map(reply => {
            const liked = reply.likedBy?.includes(user?.email);
            const canEditReply = reply.author === user?.email || user?.role === 'admin';
            const canDelete = reply.author === user?.email || canChange;

            if (reply._id === editingReplyId) {
              return (
                <div key={reply._id} className="reply thread-entry">
                  <CommentHeader author={reply.author} createdAt={reply.createdAt}
                    edited={Boolean(reply.editedAt)} onAuthorClick={onAuthorClick} />
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
              <div key={reply._id} className="reply thread-entry">
                <CommentHeader author={reply.author} createdAt={reply.createdAt}
                  edited={Boolean(reply.editedAt)} onAuthorClick={onAuthorClick} />
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

      {canToggle && (
        <button type="button" className="thread-toggle"
          aria-expanded={expanded} aria-controls={threadId}
          onClick={() => setExpanded(value => !value)}>
          {expanded ? 'Свернуть ответы' : `Показать ещё ${hiddenReplies} ${repliesWord(hiddenReplies)}`}
        </button>
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
