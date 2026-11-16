import { useContext, useRef, useState } from 'react';
import UserAvatar from '../components/UserAvatar';
import CloseIcon from '../components/CloseIcon';
import TagInput, { collectTags } from './TagInput';
import CommentSection from './CommentSection';
import { HeartIcon, CommentIcon } from '../components/Icons';
import { tweetImageURL } from '../api';
import { OnlineContext } from '../online';

function TweetItem({ tweet, full = false, canChange, commentsCount, onLike, onDelete, onSave, onTagClick, onAuthorClick, onOpenPost }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [editTags, setEditTags] = useState([]);
  const [tagDraft, setTagDraft] = useState('');
  const [showComments, setShowComments] = useState(false);
  const online = useContext(OnlineContext);
  const imageDialog = useRef(null);
  const galleryDrag = useRef(null);
  const [draggingGallery, setDraggingGallery] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const images = Array.isArray(tweet.image) ? tweet.image : tweet.image ? [tweet.image] : [];

  function stepImage(direction) {
    setSelectedImage(index => (index + direction + images.length) % images.length);
  }

  function startGalleryDrag(e) {
    const row = e.currentTarget;
    galleryDrag.current = null;
    if (e.pointerType !== 'mouse' || e.button !== 0 || row.scrollWidth <= row.clientWidth) return;
    galleryDrag.current = { id: e.pointerId, startX: e.clientX, left: row.scrollLeft, moved: false };
  }

  function moveGallery(e) {
    const drag = galleryDrag.current;
    if (drag?.id !== e.pointerId || !(e.buttons & 1)) return;
    const distance = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(distance) < 5) return;
    const row = e.currentTarget;
    if (!drag.moved) {
      drag.moved = true;
      row.setPointerCapture(e.pointerId);
      setDraggingGallery(true);
    }
    row.scrollLeft = drag.left - distance;
  }

  function stopGalleryDrag(e) {
    if (galleryDrag.current?.id !== e.pointerId) return;
    setDraggingGallery(false);
  }

  function startEdit() {
    setEditText(tweet.content);
    setEditTags(collectTags(tweet.hashtags ?? [], ''));
    setTagDraft('');
    setEditing(true);
  }

  function save() {
    if (!editText.trim()) return;
    onSave(tweet.id, editText.trim(), collectTags(editTags, tagDraft));
    setEditing(false);
  }

  return (
    <div className="tweet">
      <UserAvatar email={tweet.author} className="author-link" onClick={() => onAuthorClick(tweet.author)}>
        {online.has(tweet.author) && <span className="online-dot" title="В сети" />}
      </UserAvatar>

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
            <TagInput tags={editTags} draft={tagDraft} onChange={setEditTags} onDraftChange={setTagDraft} />
            <button className="btn-main" onClick={save}>Сохранить</button>
            <button onClick={() => setEditing(false)}>Отмена</button>
          </div>
        ) : (
          <p
            className={full ? 'tweet-text' : 'tweet-text clickable'}
            onClick={() => !full && !tweet.pending && onOpenPost?.(tweet)}
          >
            {tweet.content}
          </p>
        )}

        {images.length > 0 && (
          <>
            <div className="feed-media">
              <div className={`feed-media-layout${images.length === 1 ? ' feed-media-1' : ''}${draggingGallery ? ' is-dragging' : ''}`}
                onPointerDown={startGalleryDrag} onPointerMove={moveGallery}
                onPointerUp={stopGalleryDrag} onPointerCancel={stopGalleryDrag}
                onLostPointerCapture={stopGalleryDrag}
                onClickCapture={e => {
                  if (e.detail > 0 && galleryDrag.current?.moved) {
                    e.stopPropagation();
                    galleryDrag.current = null;
                  }
                }}>
                {images.map((image, index) => (
                  <button key={image.key} type="button" className="post-image-trigger"
                    style={{ '--media-ratio': image.width / image.height || 1 }}
                    aria-label={`Увеличить изображение ${index + 1}`} onClick={() => {
                      setSelectedImage(index);
                      imageDialog.current.showModal();
                    }}>
                    <img className="post-image" src={tweetImageURL(tweet.id, index)} alt={`Изображение ${index + 1} к публикации`}
                      draggable={false} loading="lazy" width={image.width} height={image.height} />
                  </button>
                ))}
              </div>
            </div>
            <dialog ref={imageDialog} className="image-dialog" aria-label="Изображения к публикации"
              onClick={e => {
                if (e.target === e.currentTarget) e.currentTarget.close();
              }}
              onKeyDown={e => {
                if (images.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
                e.preventDefault();
                stepImage(e.key === 'ArrowLeft' ? -1 : 1);
              }}>
              <button type="button" className="image-dialog-close centered-close" autoFocus aria-label="Закрыть"
                onClick={() => imageDialog.current.close()}>
                <CloseIcon />
              </button>
              <img src={tweetImageURL(tweet.id, selectedImage)} alt={`Изображение ${selectedImage + 1} к публикации`} loading="lazy" />
              {images.length > 1 && (
                <div className="image-gallery-nav">
                  <button type="button" aria-label="Предыдущее изображение" onClick={() => stepImage(-1)}>‹</button>
                  <span aria-live="polite">{selectedImage + 1} / {images.length}</span>
                  <button type="button" aria-label="Следующее изображение" onClick={() => stepImage(1)}>›</button>
                </div>
              )}
            </dialog>
          </>
        )}

        {!editing && tweet.hashtags?.length > 0 && (
          <div className="tags">
            {tweet.hashtags.map(tag => (
              <button type="button" key={tag} className="tag" onClick={() => onTagClick(tag)}>
                {tag}
              </button>
            ))}
          </div>
        )}

        <div className="tweet-buttons">
          <button
            className={tweet.liked ? 'like-btn liked' : 'like-btn'}
            onClick={() => onLike(tweet.id)}
            disabled={tweet.pending}
          >
            <HeartIcon />
            {tweet.likesCount}
          </button>
          <button
            className={showComments || full ? 'comments-btn open' : 'comments-btn'}
            onClick={() => !full && setShowComments(!showComments)}
            disabled={tweet.pending}
            title="Комментарии"
          >
            <CommentIcon />
            {commentsCount > 0 && commentsCount}
          </button>
          {canChange && (
            <>
              <button onClick={startEdit} disabled={tweet.pending}>Изменить</button>
              <button onClick={() => onDelete(tweet.id)} disabled={tweet.pending}>Удалить</button>
            </>
          )}
        </div>

        {(showComments || full) && (
          <CommentSection
            tweetId={tweet.id}
            full={full}
            commentsCount={commentsCount}
            onShowAll={() => onOpenPost?.(tweet)}
            onAuthorClick={onAuthorClick}
          />
        )}
      </div>
    </div>
  );
}

export default TweetItem;
