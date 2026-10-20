import { useState } from 'react';
import Header from './components/Header';
import LoginForm from './auth/LoginForm';
import TweetList from './feed/TweetList';
import AdminPanel from './admin/AdminPanel';
import StatsPage from './stats/StatsPage';
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
      <Header
        email={localStorage.getItem('email')}
        isAdmin={isAdmin}
        page={page}
        onChangePage={setPage}
        onLogout={logout}
      />
      {page === 'feed' && <TweetList />}
      {page === 'stats' && <StatsPage />}
      {page === 'admin' && isAdmin && <AdminPanel />}
    </div>
  );
}

export default App;
