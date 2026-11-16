import { useEffect, useState } from 'react';

import TagInput, { collectTags } from './TagInput';

function TweetForm({ sending, onAdd }) {
  const email = localStorage.getItem('email') || '';
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState('');

  useEffect(() => {
    if (!open) return;

    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;

    const content = text.trim();
    const hashtags = collectTags(tags, tagDraft);
    setOpen(false);
    setText('');
    setTags([]);
    setTagDraft('');

    const ok = await onAdd(content, hashtags);
    if (!ok) {
      setText(content);
      setTags(hashtags);
      setOpen(true);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  }

  return (
    <>
      <div className="compose-row" onClick={() => setOpen(true)}>
        <div className="avatar">{email[0]?.toUpperCase()}</div>
        <span className="compose-placeholder">{text || 'Что нового?'}</span>
        <button type="button" className="btn-outline" disabled={sending}>
          {sending ? 'Отправка...' : 'Опубликовать'}
        </button>
      </div>

      {open && (
        <div className="modal-backdrop" onMouseDown={() => setOpen(false)}>
          <form className="modal" onSubmit={handleSubmit} onMouseDown={e => e.stopPropagation()}>
            <div className="modal-head">
              <button type="button" className="modal-cancel" onClick={() => setOpen(false)}>
                Отмена
              </button>
              <b>Новая публикация</b>
            </div>

            <div className="modal-body">
              <div className="avatar">{email[0]?.toUpperCase()}</div>
              <div className="modal-fields">
                <b>{email}</b>
                <textarea
                  autoFocus
                  placeholder="Что нового?"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={4}
                  maxLength={280}
                />
                <TagInput tags={tags} draft={tagDraft} onChange={setTags} onDraftChange={setTagDraft} />
              </div>
            </div>

            <div className="modal-foot">
              <span className="hint">{text.length}/280 · Enter — опубликовать, Shift+Enter — новая строка</span>
              <button type="submit" className="btn-main btn-pill" disabled={!text.trim() || sending}>
                Опубликовать
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export default TweetForm;
