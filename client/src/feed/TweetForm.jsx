import { useState } from 'react';

function parseTags(str) {
  return str
    .split(' ')
    .filter(t => t.trim())
    .map(t => (t.startsWith('#') ? t : '#' + t));
}

function TweetForm({ sending, onAdd }) {
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;

    const content = text.trim();
    setText('');
    setTags('');

    const ok = await onAdd(content, parseTags(tags));
    if (!ok) setText(content);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form compose">
      <textarea
        placeholder="Текст твита (Enter - отправить)"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        maxLength={280}
      />
      <input
        type="text"
        placeholder="Теги через пробел, например #react #lab5"
        value={tags}
        onChange={e => setTags(e.target.value)}
      />
      <div className="form-bottom">
        <span className="hint">{text.length}/280</span>
        <button type="submit" className="btn-main" disabled={!text.trim() || sending}>
          {sending ? 'Отправка...' : 'Отправить'}
        </button>
      </div>
    </form>
  );
}

export default TweetForm;
