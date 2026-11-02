import { ChartIcon, HomeIcon, LogoutIcon, ShieldIcon, UserIcon } from './Icons';
import NotificationBell from './NotificationBell';

function Sidebar({ email, isAdmin, page, onlineCount, onChangePage, onLogout, onToast }) {
  const pages = [
    { id: 'feed', title: 'Лента', icon: <HomeIcon /> },
    { id: 'mine', title: 'Мои посты', icon: <UserIcon /> },
    { id: 'stats', title: 'Статистика', icon: <ChartIcon /> }
  ];
  if (isAdmin) pages.push({ id: 'admin', title: 'Админка', icon: <ShieldIcon /> });

  return (
    <aside className="sidebar">
      <b className="logo">
        <span className="side-label">Микроблог</span>
        <span className="logo-short">М</span>
      </b>

      <nav className="side-nav">
        {pages.map(p => (
          <button
            key={p.id}
            className={page === p.id ? 'side-link active' : 'side-link'}
            onClick={() => onChangePage(p.id)}
            title={p.title}
          >
            {p.icon}
            <span className="side-label">{p.title}</span>
          </button>
        ))}
        <NotificationBell onToast={onToast} />
      </nav>

      <div className="side-bottom">
        <div className="side-online hint" title="Пользователей в сети">
          <span className="online-dot-inline" />
          <span className="side-label">В сети:</span>
          {onlineCount}
        </div>

        <div className="side-user">
          <div className="avatar">{email?.[0]?.toUpperCase()}</div>
          <span className="side-label side-email" title={email}>{email}</span>
          <button className="side-logout" onClick={onLogout} title="Выйти">
            <LogoutIcon />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
