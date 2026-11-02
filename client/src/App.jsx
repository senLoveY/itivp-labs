import { useCallback, useEffect, useState } from 'react';
import Header from './components/Header';
import LoginForm from './auth/LoginForm';
import TweetList from './feed/TweetList';
import AdminPanel from './admin/AdminPanel';
import StatsPage from './stats/StatsPage';
import UserPage from './profile/UserPage';
import Toasts from './components/Toasts';
import { getCurrentUser, setOnTokenExpired, tokenExpired } from './api';
import { clearCache } from './cache';
import { socket, connectSocket, disconnectSocket } from './socket';
import { OnlineContext } from './online';
import './App.css';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [page, setPage] = useState('feed');
  const [profileEmail, setProfileEmail] = useState('');
  const [search, setSearch] = useState('');
  const [online, setOnline] = useState(new Set());
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((text) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, text }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

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

  // сокет открыт, пока пользователь авторизован
  useEffect(() => {
    if (!token) return;

    function onList(list) {
      setOnline(new Set(list));
    }

    function onUserOnline(email) {
      setOnline(prev => new Set(prev).add(email));
      showToast(`${email} в сети`);
    }

    function onUserOffline(email) {
      setOnline(prev => {
        const next = new Set(prev);
        next.delete(email);
        return next;
      });
      showToast(`${email} вышел`);
    }

    // сервер отклонил токен — выходим, как при ответе REST
    function onConnectError(err) {
      if (err.message === 'Invalid or expired token.') tokenExpired();
    }

    socket.on('users:online', onList);
    socket.on('user:online', onUserOnline);
    socket.on('user:offline', onUserOffline);
    socket.on('connect_error', onConnectError);
    connectSocket();

    return () => {
      socket.off('users:online', onList);
      socket.off('user:online', onUserOnline);
      socket.off('user:offline', onUserOffline);
      socket.off('connect_error', onConnectError);
      disconnectSocket();
      setOnline(new Set());
    };
  }, [token, showToast]);

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
    <OnlineContext.Provider value={online}>
      <Header
        email={localStorage.getItem('email')}
        isAdmin={isAdmin}
        page={page}
        search={search}
        onChangePage={setPage}
        onSearchChange={changeSearch}
        onlineCount={online.size}
        onLogout={logout}
        onToast={showToast}
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
      <Toasts toasts={toasts} />
    </OnlineContext.Provider>
  );
}

export default App;
