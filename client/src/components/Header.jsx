function Header({ email, isAdmin, page, onChangePage, onLogout }) {
  const pages = [
    { id: 'feed', title: 'Лента' },
    { id: 'stats', title: 'Статистика' }
  ];
  if (isAdmin) pages.push({ id: 'admin', title: 'Админка' });

  return (
    <header className={page === 'feed' ? 'header' : 'header header-wide'}>
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
        <div>
          <span className="hint">{email}</span>
          <button onClick={onLogout}>Выйти</button>
        </div>
      </div>
    </header>
  );
}

export default Header;
