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
  const [search, setSearch] = useState('');

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    clearCache();
    setPage('feed');
    setSearch('');
    setToken(null);
  }

  // поиск работает по ленте и страницам с постами, с остальных страниц переходим в ленту
  function changeSearch(value) {
    setSearch(value);
    if (!['feed', 'mine', 'user'].includes(page)) {
      setPage('feed');
    }
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
        search={search}
        onChangePage={setPage}
        onSearchChange={changeSearch}
        onLogout={logout}
      />
      {page === 'feed' && (
        <TweetList key="feed" search={search} onSearchChange={changeSearch} onAuthorClick={openProfile} />
      )}
      {page === 'mine' && (
        <TweetList
          key="mine"
          author={localStorage.getItem('email')}
          title="Мои посты"
          showSort
          search={search}
          onSearchChange={changeSearch}
          onAuthorClick={openProfile}
        />
      )}
      {page === 'user' && (
        <UserPage
          email={profileEmail}
          search={search}
          onSearchChange={changeSearch}
          onBack={() => setPage('feed')}
          onAuthorClick={openProfile}
        />
      )}
      {page === 'stats' && <StatsPage />}
      {page === 'admin' && isAdmin && <AdminPanel />}
    </div>
  );
}

export default App;
