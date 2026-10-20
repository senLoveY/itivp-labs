import { useState } from 'react';
import TweetList from './TweetList';
import LoginForm from './LoginForm';
import AdminPanel from './AdminPanel';
import { getCurrentUser } from './api';
import { clearCache } from './cache';
import './App.css';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [page, setPage] = useState('feed');

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    clearCache();
    setPage('feed');
    setToken(null);
  }

  if (!token) {
    return <LoginForm onLogin={setToken} />;
  }

  const isAdmin = getCurrentUser()?.role === 'admin';

  return (
    <div>
      <header className={page === 'admin' ? 'header header-wide' : 'header'}>
        <div className="header-inner">
          <b className="logo">Микроблог</b>
          <div>
            <span className="hint">{localStorage.getItem('email')}</span>
            {isAdmin && (
              <button onClick={() => setPage(page === 'feed' ? 'admin' : 'feed')}>
                {page === 'feed' ? 'Админка' : 'Лента'}
              </button>
            )}
            <button onClick={logout}>Выйти</button>
          </div>
        </div>
      </header>
      {isAdmin && page === 'admin' ? <AdminPanel /> : <TweetList />}
    </div>
  );
}

export default App;
