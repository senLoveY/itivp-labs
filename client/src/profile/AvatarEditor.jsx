import { useEffect, useId, useRef, useState } from 'react';
import useObjectURLs from '../hooks/useObjectURLs';
import CloseIcon from '../components/CloseIcon';

export function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 6l2-2h4l2 2h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

const formats = 'image/jpeg,image/png,image/webp,image/gif,image/avif';

export default function AvatarEditor({ initialURL, onClose, onApply }) {
  const dialog = useRef(null);
  const picker = useRef(null);
  const frame = useRef(null);
  const photo = useRef(null);
  const drag = useRef(null);
  const title = useId();
  const { createURL, releaseURL } = useObjectURLs();
  const [url, setURL] = useState('');
  const [size, setSize] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = overflow;
    };
  }, []);

  function choose(next) {
    if (!next || busy) return;
    if (!/\.(jpe?g|png|webp|gif|avif)$/i.test(next.name) && !formats.split(',').includes(next.type)) {
      setError('Выбери фото в формате JPEG, PNG, WebP, GIF или AVIF.');
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      setError('Фото должно весить не больше 10 МБ.');
      return;
    }
    setError('');
    setSize(null);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    releaseURL(url);
    setURL(createURL(next));
  }

  const width = size ? Math.max(1, size.width / size.height) * zoom : 1;
  const height = size ? Math.max(1, size.height / size.width) * zoom : 1;
  const left = (1 - width) * (position.x + 1) / 2;
  const top = (1 - height) * (position.y + 1) / 2;
  const clamp = value => Math.max(-1, Math.min(1, value));

  function move(e) {
    if (drag.current?.id !== e.pointerId) return;
    const edge = frame.current.clientWidth;
    const { x, y, start } = drag.current;
    setPosition({
      x: width > 1 ? clamp(start.x - 2 * (e.clientX - x) / (edge * (width - 1))) : 0,
      y: height > 1 ? clamp(start.y - 2 * (e.clientY - y) / (edge * (height - 1))) : 0
    });
  }

  function apply() {
    if (!size || busy) return;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) {
      setError('Не удалось обработать фото.');
      return;
    }
    context.drawImage(photo.current, left * 512, top * 512, width * 512, height * 512);
    setBusy(true);
    canvas.toBlob(blob => {
      if (!blob) {
        setBusy(false);
        setError('Не удалось обработать фото.');
        return;
      }
      onApply(new File([blob], 'avatar.png', { type: 'image/png' }));
    }, 'image/png');
  }

  return (
    <dialog ref={dialog} className="composer-dialog avatar-editor" aria-labelledby={title}
      onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="modal-head">
        <h2 id={title}>Фото профиля</h2>
        <button type="button" className="modal-cancel centered-close" aria-label="Закрыть" disabled={busy} onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="avatar-editor-body" onDragOver={e => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault();
      }} onDrop={e => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        if (e.dataTransfer.files.length === 1) choose(e.dataTransfer.files[0]);
        else setError('Выбери одно фото.');
      }}>
        <div className="avatar-crop" ref={frame}
          onPointerDown={e => {
            if (!size || e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, start: position };
          }}
          onPointerMove={move} onLostPointerCapture={() => { drag.current = null; }}>
          {url ? <img key={url} ref={photo} src={url} alt="" draggable={false}
            style={{ width: `${width * 100}%`, height: `${height * 100}%`, left: `${left * 100}%`, top: `${top * 100}%` }}
            onLoad={e => setSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
            onError={() => { setSize(null); setError('Браузер не смог открыть это фото.'); }} />
            : initialURL ? <img className="avatar-crop-current" src={initialURL} alt="Текущая аватарка" />
              : <CameraIcon />}
        </div>
        <input ref={picker} type="file" hidden accept={formats} onChange={e => {
          choose(e.target.files[0]);
          e.target.value = '';
        }} />
        <button type="button" className="btn-outline avatar-pick" disabled={busy} onClick={() => picker.current.click()}>
          <CameraIcon /> {url ? 'Выбрать другое фото' : 'Выбрать фото'}
        </button>
        {size ? <div className="avatar-crop-controls">
          <label>Масштаб <input type="range" min="1" max="3" step="0.01" value={zoom}
            onChange={e => setZoom(Number(e.target.value))} /></label>
          {width > 1 && <label>По горизонтали <input type="range" min="-1" max="1" step="0.01" value={position.x}
            onChange={e => setPosition(p => ({ ...p, x: Number(e.target.value) }))} /></label>}
          {height > 1 && <label>По вертикали <input type="range" min="-1" max="1" step="0.01" value={position.y}
            onChange={e => setPosition(p => ({ ...p, y: Number(e.target.value) }))} /></label>}
        </div> : <span className="hint">Можно перетащить фото сюда</span>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
      <div className="modal-foot avatar-editor-footer">
        <button type="button" onClick={onClose} disabled={busy}>Отмена</button>
        <button type="button" className="btn-main" onClick={apply} disabled={!size || busy}>Применить</button>
      </div>
    </dialog>
  );
}
