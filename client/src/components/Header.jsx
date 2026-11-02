import { SearchIcon } from './Icons';
import NotificationBell from './NotificationBell';

function Header({ email, isAdmin, page, search, onlineCount, onChangePage, onSearchChange, onLogout, onToast }) {
  const pages = [
    { id: 'feed', title: 'Лента' },
    { id: 'mine', title: 'Мои посты' },
    { id: 'stats', title: 'Статистика' }
  ];
  if (isAdmin) pages.push({ id: 'admin', title: 'Админка' });

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-left">
          <b className="logo">Микроблог</b>
          <nav className="nav">
            {pages.map(p => (
              <button
                key={p.id}
                className={page === p.id ? 'btn-main' : ''}
                onClick={() => onChangePage(p.id)}
              >
                {p.title}
              </button>
            ))}
          </nav>
        </div>

        <div className="header-search">
          <SearchIcon />
          <input
            type="text"
            placeholder="Поиск по твитам"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => onSearchChange('')} title="Очистить">
              ×
            </button>
          )}
        </div>

        <div className="header-right">
          <span className="hint online-count">
            <span className="online-dot-inline" />
            Онлайн: {onlineCount}
          </span>
          <NotificationBell onToast={onToast} />
          <span className="hint">{email}</span>
          <button onClick={onLogout}>Выйти</button>
        </div>
      </div>
    </header>
  );
}

export default Header;
