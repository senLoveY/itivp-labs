import { useEffect, useId, useRef, useState } from 'react';
import CloseIcon from '../components/CloseIcon';
import useObjectURLs from '../hooks/useObjectURLs';
import UserAvatar from '../components/UserAvatar';

import TagInput from './TagInput';
import { collectTags } from './tags';

function TweetForm({ sending, onAdd }) {
  const email = localStorage.getItem('email') || '';
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState('');
  const [attachments, setAttachments] = useState([]);
  const { createURL, releaseURL } = useObjectURLs();
  const [imageError, setImageError] = useState('');
  const imagePicker = useRef(null);
  const composer = useRef(null);
  const textField = useRef(null);
  const titleId = useId();
  const dragDepth = useRef(0);
  const [draggingImage, setDraggingImage] = useState(false);

  function attachImages(fileList) {
    const files = Array.from(fileList);
    if (!files.length) return;
    if (attachments.length + files.length > 4) {
      setImageError('Можно прикрепить до четырёх изображений.');
      return;
    }
    if (files.some(file => !/\.(jpe?g|png|webp|gif|avif)$/i.test(file.name) &&
        !['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(file.type))) {
      setImageError('Выбери изображения JPEG, PNG, WebP, GIF или AVIF.');
      return;
    }
    if (files.some(file => file.size > 10 * 1024 * 1024)) {
      setImageError('Каждое изображение должно весить не больше 10 МБ.');
      return;
    }
    setImageError('');
    const added = files.map(file => ({ file, url: createURL(file) }));
    setAttachments(current => [...current, ...added]);
  }

  function selectImages(e) {
    attachImages(e.target.files);
    e.target.value = '';
  }

  function isFileDrag(e) {
    return e.dataTransfer.types.includes('Files');
  }

  useEffect(() => {
    const dialog = composer.current;
    if (!open) {
      dialog.close();
      return;
    }

    dialog.showModal();
    textField.current.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function closeComposer() {
    dragDepth.current = 0;
    setDraggingImage(false);
    setOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;

    const content = text.trim();
    const hashtags = collectTags(tags, tagDraft);
    setOpen(false);
    setText('');
    setTags([]);
    setTagDraft('');

    const ok = await onAdd(content, hashtags, attachments.map(({ file }) => file));
    if (!ok) {
      setText(content);
      setTags(hashtags);
      setOpen(true);
    } else {
      attachments.forEach(({ url }) => releaseURL(url));
      setAttachments([]);
      setImageError('');
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      handleSubmit(e);
    }
  }

  return (
    <>
      <div className="compose-row" onClick={() => !sending && setOpen(true)}>
        <UserAvatar email={email} />
        <span className="compose-placeholder">Что нового?</span>
        <button type="button" className="btn-outline" disabled={sending}>
          {sending ? 'Отправка...' : 'Опубликовать'}
        </button>
      </div>

      <dialog ref={composer} className="composer-dialog" aria-labelledby={titleId}
        onCancel={e => {
          e.preventDefault();
          closeComposer();
        }}
        onClick={e => {
          if (e.target === e.currentTarget) closeComposer();
        }}>
        <form className={draggingImage ? 'modal modal-file-drag' : 'modal'}
          onSubmit={handleSubmit}
          onDragEnter={e => {
            if (!isFileDrag(e)) return;
            e.preventDefault();
            dragDepth.current += 1;
            setDraggingImage(true);
          }}
          onDragOver={e => {
            if (!isFileDrag(e)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDragLeave={() => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (!dragDepth.current) setDraggingImage(false);
          }}
          onDrop={e => {
            if (!isFileDrag(e)) return;
            e.preventDefault();
            dragDepth.current = 0;
            setDraggingImage(false);
            attachImages(e.dataTransfer.files);
          }}>
          <div className="modal-head">
            <h2 id={titleId}>Новая публикация</h2>
            <button type="button" className="modal-cancel centered-close" aria-label="Закрыть окно"
              onClick={closeComposer}><CloseIcon /></button>
          </div>

          <div className="modal-body">
            <div className="modal-fields">
              <div className="modal-author">
                <UserAvatar email={email} aria-hidden="true" />
                <b>{email}</b>
              </div>
              <textarea
                ref={textField}
                aria-label="Текст публикации"
                placeholder="Что нового?"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={4}
                maxLength={280}
              />
              <TagInput tags={tags} draft={tagDraft} onChange={setTags} onDraftChange={setTagDraft} />
              {imageError && <p className="error" role="alert">{imageError}</p>}
              {attachments.length > 0 && (
                <div className="post-image-grid">
                  {attachments.map(({ file, url }, index) => (
                    <div className="post-image-card" key={url}>
                      <img className="post-image-preview" src={url} alt={file.name} />
                      <button type="button" className="preview-remove centered-close"
                        aria-label={`Убрать изображение ${index + 1}`} onClick={() => {
                          releaseURL(url);
                          setAttachments(current => current.filter(item => item.url !== url));
                          setImageError('');
                        }}><CloseIcon /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {draggingImage && <div className="modal-drop-hint">Отпусти изображения, чтобы прикрепить</div>}
          <div className="modal-foot">
            <div className="post-image-picker">
              <input ref={imagePicker} type="file" hidden multiple
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={selectImages} />
              <button type="button" className="attachment-button"
                aria-label="Прикрепить фото"
                title="Прикрепить фото (до 4, по 10 МБ)"
                disabled={attachments.length >= 4}
                onClick={() => imagePicker.current.click()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M21 11.5 12 20.5a5 5 0 0 1-7.1-7.1l9.4-9.4a3.5 3.5 0 0 1 5 5l-9.4 9.4a2 2 0 0 1-2.8-2.8l8.5-8.5" />
                </svg>
              </button>
            </div>
            <span className={text.length === 280 ? 'modal-count at-limit' : 'modal-count'}>
              {text.length}/280
            </span>
            <button type="submit" className="btn-main btn-pill" disabled={!text.trim() || sending}>
              Опубликовать
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export default TweetForm;
