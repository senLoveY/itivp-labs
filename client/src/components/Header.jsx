function Header({ email, isAdmin, page, onTogglePage, onLogout }) {
  return (
    <header className={page === 'admin' ? 'header header-wide' : 'header'}>
      <div className="header-inner">
        <b className="logo">Микроблог</b>
        <div>
          <span className="hint">{email}</span>
          {isAdmin && (
            <button onClick={onTogglePage}>
              {page === 'feed' ? 'Админка' : 'Лента'}
            </button>
          )}
          <button onClick={onLogout}>Выйти</button>
        </div>
      </div>
    </header>
  );
}

export default Header;
