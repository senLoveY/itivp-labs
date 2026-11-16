import { useEffect, useId, useRef, useState } from 'react';
import CloseIcon from '../components/CloseIcon';
import UserAvatar from '../components/UserAvatar';
import { tweetImageURL } from '../api';
import SortablePostImages from './SortablePostImages';
import { moveItem } from './moveItem';
import TagInput from './TagInput';
import { collectTags } from './tags';

export default function EditPostDialog({ tweet, images, onSave, onClose }) {
  const dialog = useRef(null);
  const textField = useRef(null);
  const request = useRef(false);
  const titleId = useId();
  const [original] = useState(() => ({
    content: tweet.content,
    tags: collectTags(tweet.hashtags ?? [], ''),
    images
  }));
  const [photos, setPhotos] = useState(original.images);
  const [text, setText] = useState(original.content);
  const [tags, setTags] = useState(original.tags);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    textField.current.focus();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const content = text.trim();
  const hashtags = collectTags(tags, draft);
  const photosChanged = photos.length !== original.images.length ||
    photos.some((image, index) => image.key !== original.images[index]?.key);
  const changed = photosChanged || content !== original.content.trim() ||
    hashtags.length !== original.tags.length ||
    hashtags.some((tag, index) => tag !== original.tags[index]);

  function dismiss() {
    if (!request.current) onClose();
  }

  async function save(e) {
    e.preventDefault();
    if (!content || !changed || request.current) return;
    request.current = true;
    setSaving(true);
    setError('');
    try {
      await onSave(tweet.id, content, hashtags, photosChanged ? photos : undefined);
      onClose();
    } catch (err) {
      setError(err.message || 'Не удалось сохранить публикацию.');
      setSaving(false);
    } finally {
      request.current = false;
    }
  }

  return (
    <dialog ref={dialog} className="composer-dialog" aria-labelledby={titleId}
      onCancel={e => { e.preventDefault(); dismiss(); }}
      onClick={e => { if (e.target === e.currentTarget) dismiss(); }}>
      <form className="modal" onSubmit={save}>
        <div className="modal-head">
          <h2 id={titleId}>Редактировать публикацию</h2>
          <button type="button" className="modal-cancel centered-close" aria-label="Закрыть"
            onClick={dismiss} disabled={saving}><CloseIcon /></button>
        </div>

        <div className="modal-body">
          <fieldset className="modal-fields edit-post-fields" disabled={saving} aria-label="Текст и теги">
            <div className="modal-author">
              <UserAvatar email={tweet.author} aria-hidden="true" />
              <b>{tweet.author}</b>
            </div>
            <textarea ref={textField} aria-label="Текст публикации" placeholder="Что нового?"
              rows={4} maxLength={280} value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) save(e);
              }} />
            <TagInput tags={tags} draft={draft} onChange={setTags} onDraftChange={setDraft} />
            <SortablePostImages disabled={saving}
              items={photos.map(image => ({ id: image.key, src: tweetImageURL(tweet.id, undefined, image.key) }))}
              onMove={(from, to) => setPhotos(current => moveItem(current, from, to))}
              onRemove={index => setPhotos(current => current.filter((_, i) => i !== index))} />
            {error && <p className="error" role="alert">{error}</p>}
          </fieldset>
        </div>

        <div className="modal-foot edit-post-footer">
          <span className={text.length === 280 ? 'modal-count at-limit' : 'modal-count'}>{text.length}/280</span>
          <button type="button" onClick={dismiss} disabled={saving}>Отмена</button>
          <button type="submit" className="btn-main btn-pill" disabled={saving || !content || !changed}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
