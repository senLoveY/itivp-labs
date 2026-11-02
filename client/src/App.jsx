import { useEffect, useState } from 'react';
import Header from './components/Header';
import LoginForm from './auth/LoginForm';
import TweetList from './feed/TweetList';
import AdminPanel from './admin/AdminPanel';
import StatsPage from './stats/StatsPage';
import UserPage from './profile/UserPage';
import { getCurrentUser, setOnTokenExpired } from './api';
import { clearCache } from './cache';
import './App.css';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [page, setPage] = useState('feed');
  const [profileEmail, setProfileEmail] = useState('');

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    clearCache();
    setPage('feed');
    setToken(null);
  }

  useEffect(() => {
    setOnTokenExpired(logout);
  });

  // своя страница — это «Мои посты», чужая — отдельная страница пользователя
  function openProfile(email) {
    if (email === localStorage.getItem('email')) {
      setPage('mine');
    } else {
      setProfileEmail(email);
      setPage('user');
    }
    window.scrollTo(0, 0);
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
      {page === 'feed' && <TweetList key="feed" onAuthorClick={openProfile} />}
      {page === 'mine' && (
        <TweetList
          key="mine"
          author={localStorage.getItem('email')}
          title="Мои посты"
          showSort
          onAuthorClick={openProfile}
        />
      )}
      {page === 'user' && (
        <UserPage email={profileEmail} onBack={() => setPage('feed')} onAuthorClick={openProfile} />
      )}
      {page === 'stats' && <StatsPage />}
      {page === 'admin' && isAdmin && <AdminPanel />}
    </div>
  );
}

export default App;
