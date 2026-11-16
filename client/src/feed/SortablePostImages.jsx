import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CloseIcon from '../components/CloseIcon';

export default function SortablePostImages({ items, onMove, onRemove, disabled = false }) {
  const pointer = useRef(null);
  const grid = useRef(null);
  const [drag, setDrag] = useState(null);

  function start(e, index) {
    if (disabled || items.length < 2 || e.button !== 0 || pointer.current) return;
    const { width, height, left, top } = e.currentTarget.getBoundingClientRect();
    pointer.current = {
      id: e.pointerId, index, target: index, x: e.clientX, y: e.clientY,
      offsetX: e.clientX - left, offsetY: e.clientY - top, width, height, active: false, host: e.currentTarget.closest('dialog') ?? document.body
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function move(e) {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    if (!p.active && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
    p.active = true;
    const card = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-photo-index]');
    p.target = card && grid.current.contains(card)
      ? Number(card.dataset.photoIndex) : p.index;
    setDrag({ ...p, x: e.clientX, y: e.clientY });
  }

  function finish(e, apply = false) {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    pointer.current = null;
    setDrag(null);
    if (apply && p.active && p.index !== p.target) onMove(p.index, p.target);
  }

  if (!items.length) return null;

  return (
    <div ref={grid} className="sortable-post-images" aria-label="Вложения">
      {items.map((item, index) => (
        <div key={item.id} data-photo-index={index}
          className={`sortable-photo${drag?.index === index ? ' is-source' : ''}${drag?.target === index && drag.index !== index ? ' is-target' : ''}`}>
          <button type="button" className="sortable-photo-handle" disabled={disabled || items.length < 2}
            aria-label={`Переместить фото ${index + 1} из ${items.length}`}
            title={items.length > 1 ? 'Перетащить фото' : undefined}
            onPointerDown={e => start(e, index)}
            onPointerMove={move}
            onPointerUp={e => finish(e, true)}
            onPointerCancel={e => finish(e)}
            onLostPointerCapture={e => finish(e)}
            onKeyDown={e => {
              const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -2, ArrowDown: 2 }[e.key];
              if (delta === undefined) return;
              e.preventDefault();
              const target = index + delta;
              if (target >= 0 && target < items.length) onMove(index, target);
            }}>
            <img src={item.src} alt={item.alt || `Фото ${index + 1}`} draggable={false} />
          </button>
          <button type="button" className="preview-remove centered-close" disabled={disabled}
            aria-label={`Убрать фото ${index + 1}`} onClick={() => onRemove(index)}><CloseIcon /></button>
        </div>
      ))}
      {drag && createPortal(
        <img className="sortable-photo-ghost" src={items[drag.index].src} alt=""
          style={{ left: drag.x - drag.offsetX, top: drag.y - drag.offsetY, width: drag.width, height: drag.height }} />,
        // The dialog's top layer is above the rest of the document.
        drag.host
      )}
    </div>
  );
}
