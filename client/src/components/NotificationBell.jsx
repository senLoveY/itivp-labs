import { useEffect, useRef, useState } from 'react';
import { fetchNotificationsAPI, readNotificationsAPI } from '../api';
import { socket } from '../socket';
import { BellIcon } from './Icons';

const TITLES = {
  like: 'Новый лайк',
  comment: 'Новый комментарий',
  reply: 'Новый ответ'
};

function notificationText(n) {
  return `${TITLES[n.type]} от ${n.from}`;
}

function NotificationBell({ onToast }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  // история — из MongoDB через REST, новые уведомления — через сокет
  useEffect(() => {
    function load() {
      fetchNotificationsAPI()
        .then(res => {
          setItems(res.data.notifications);
          setUnread(res.data.unread);
        })
        .catch(() => {});
    }

    function onNotification(n) {
      setItems(prev => [n, ...prev].slice(0, 20));
      setUnread(prev => prev + 1);
      onToast(notificationText(n));
    }

    function onRead() {
      setUnread(0);
    }

    if (socket.connected) load();
    socket.on('connect', load);
    socket.on('notification', onNotification);
    socket.on('notifications:read', onRead);

    return () => {
      socket.off('connect', load);
      socket.off('notification', onNotification);
      socket.off('notifications:read', onRead);
    };
  }, [onToast]);

  // закрыть список по клику вне его или по Esc
  useEffect(() => {
    if (!open) return;

    function onClick(e) {
      if (!box.current.contains(e.target)) close();
    }

    function onKey(e) {
      if (e.key === 'Escape') close();
    }

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // непрочитанные подсвечены, пока список открыт, и гаснут после закрытия
  function close() {
    setOpen(false);
    setItems(prev => prev.map(n => ({ ...n, read: true })));
  }

  function toggle() {
    if (open) {
      close();
      return;
    }
    setOpen(true);
    if (unread > 0) {
      setUnread(0);
      readNotificationsAPI().catch(() => {});
    }
  }

  return (
    <div className="bell" ref={box}>
      <button className={open ? 'side-link active' : 'side-link'} onClick={toggle} title="Уведомления">
        <span className="bell-icon">
          <BellIcon />
          {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
        </span>
        <span className="side-label">Уведомления</span>
      </button>

      {open && (
        <div className="bell-menu">
          {items.length === 0 && <p className="hint bell-empty">Уведомлений пока нет</p>}
          {items.map(n => (
            <div key={n._id} className={n.read ? 'bell-item' : 'bell-item unread'}>
              <div>
                <b>{TITLES[n.type]}</b> от {n.from}
              </div>
              {n.text && <div className="bell-text">«{n.text}»</div>}
              <div className="hint">{new Date(n.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
