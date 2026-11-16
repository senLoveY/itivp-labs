import { useEffect, useState } from 'react';

function parseTags(str) {
  return str
    .split(' ')
    .filter(t => t.trim())
    .map(t => (t.startsWith('#') ? t : '#' + t));
}

function TweetForm({ sending, onAdd }) {
  const email = localStorage.getItem('email') || '';
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');

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
    const tagsText = tags;
    setOpen(false);
    setText('');
    setTags('');

    const ok = await onAdd(content, parseTags(tagsText));
    if (!ok) {
      setText(content);
      setTags(tagsText);
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
                <input
                  type="text"
                  placeholder="Теги через пробел, например #micro #blog"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                />
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
