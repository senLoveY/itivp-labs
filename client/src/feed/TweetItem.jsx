import { useState } from 'react';
import CommentSection from './CommentSection';

function TweetItem({ tweet, canChange, commentsCount, onLike, onDelete, onSave, onTagClick, onAuthorClick, onCommentsCountChange }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [showComments, setShowComments] = useState(false);

  function startEdit() {
    setEditText(tweet.content);
    setEditing(true);
  }

  function save() {
    if (!editText.trim()) return;
    onSave(tweet.id, editText.trim());
    setEditing(false);
  }

  return (
    <div className="tweet">
      <div className="avatar author-link" onClick={() => onAuthorClick(tweet.author)}>
        {tweet.author?.[0]?.toUpperCase()}
      </div>

      <div className="tweet-body">
        <div className="tweet-top">
          <b className="author-link" onClick={() => onAuthorClick(tweet.author)}>{tweet.author}</b>
          <span className="hint">
            {tweet.pending ? 'отправляется...' : new Date(tweet.createdAt).toLocaleString()}
          </span>
        </div>

        {editing ? (
          <div>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={3}
              maxLength={280}
            />
            <button className="btn-main" onClick={save}>Сохранить</button>
            <button onClick={() => setEditing(false)}>Отмена</button>
          </div>
        ) : (
          <p className="tweet-text">{tweet.content}</p>
        )}

        {tweet.hashtags?.length > 0 && (
          <div className="tags">
            {tweet.hashtags.map(tag => (
              <span key={tag} className="tag" onClick={() => onTagClick(tag)}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="tweet-buttons">
          <button
            className={tweet.liked ? 'like-btn liked' : 'like-btn'}
            onClick={() => onLike(tweet.id)}
            disabled={tweet.pending}
          >
            {tweet.liked ? '♥' : '♡'} {tweet.likesCount}
          </button>
          <button
            className={showComments ? 'comments-btn open' : 'comments-btn'}
            onClick={() => setShowComments(!showComments)}
            disabled={tweet.pending}
            title="Комментарии"
          >
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8z" />
            </svg>
            {commentsCount > 0 ? ' ' + commentsCount : ''}
          </button>
          {canChange && (
            <>
              <button onClick={startEdit} disabled={tweet.pending}>Изменить</button>
              <button onClick={() => onDelete(tweet.id)} disabled={tweet.pending}>Удалить</button>
            </>
          )}
        </div>

        {showComments && (
          <CommentSection
            tweetId={tweet.id}
            onCountChange={update => onCommentsCountChange(tweet.id, update)}
          />
        )}
      </div>
    </div>
  );
}

export default TweetItem;
