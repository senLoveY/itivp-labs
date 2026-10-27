import { useState } from 'react';

function TweetItem({ tweet, canChange, onLike, onDelete, onSave, onTagClick }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');

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
      <div className="avatar">{tweet.author?.[0]?.toUpperCase()}</div>

      <div className="tweet-body">
        <div className="tweet-top">
          <b>{tweet.author}</b>
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
          {canChange && (
            <>
              <button onClick={startEdit} disabled={tweet.pending}>Изменить</button>
              <button onClick={() => onDelete(tweet.id)} disabled={tweet.pending}>Удалить</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default TweetItem;
