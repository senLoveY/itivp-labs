import { useCallback, useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import SearchBar from './components/SearchBar';
import LoginForm from './auth/LoginForm';
import TweetList from './feed/TweetList';
import AdminPanel from './admin/AdminPanel';
import StatsPage from './stats/StatsPage';
import UserPage from './profile/UserPage';
import PostPage from './post/PostPage';
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
  const [post, setPost] = useState(null);
  const [backPage, setBackPage] = useState('feed');
  const [search, setSearch] = useState('');
  const [online, setOnline] = useState(new Set());
  const [toasts, setToasts] = useState([]);
  const [connectionLost, setConnectionLost] = useState(false);

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

    let lost = false;

    function onConnect() {
      if (lost) showToast('Соединение восстановлено');
      lost = false;
      setConnectionLost(false);
    }

    function onDisconnect(reason) {
      if (reason === 'io client disconnect') return;
      lost = true;
      setConnectionLost(true);
      if (reason === 'io server disconnect') socket.connect();
    }

    function onConnectError(err) {
      if (err.message === 'Invalid or expired token.') {
        tokenExpired();
        return;
      }
      lost = true;
      setConnectionLost(true);
    }

    socket.on('users:online', onList);
    socket.on('user:online', onUserOnline);
    socket.on('user:offline', onUserOffline);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    connectSocket();

    return () => {
      socket.off('users:online', onList);
      socket.off('user:online', onUserOnline);
      socket.off('user:offline', onUserOffline);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      disconnectSocket();
      setOnline(new Set());
      setConnectionLost(false);
    };
  }, [token, showToast]);

  function openPost(tweet) {
    setPost(tweet);
    setBackPage(page);
    setPage('post');
    window.scrollTo(0, 0);
  }

  const closePost = useCallback(() => setPage(backPage), [backPage]);

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
      <div className="layout">
        <Sidebar
          email={localStorage.getItem('email')}
          isAdmin={isAdmin}
          page={page}
          onlineCount={online.size}
          onChangePage={setPage}
          onLogout={logout}
          onToast={showToast}
        />

        <main className={['stats', 'admin'].includes(page) ? 'main wide' : 'main'}>
          <SearchBar value={search} onChange={changeSearch} />
          {page === 'feed' && (
            <TweetList
              key="feed"
              search={search}
              onSearchChange={changeSearch}
              onAuthorClick={openProfile}
              onOpenPost={openPost}
            />
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
              onOpenPost={openPost}
            />
          )}
          {page === 'user' && (
            <UserPage
              email={profileEmail}
              search={search}
              onSearchChange={changeSearch}
              onBack={() => setPage('feed')}
              onAuthorClick={openProfile}
              onOpenPost={openPost}
            />
          )}
          {page === 'post' && post && (
            <PostPage
              key={post.id}
              tweet={post}
              onBack={closePost}
              onTagClick={changeSearch}
              onAuthorClick={openProfile}
            />
          )}
          {page === 'stats' && <StatsPage />}
          {page === 'admin' && isAdmin && <AdminPanel />}
        </main>
      </div>

      {connectionLost && <div className="connection-lost">Нет соединения с сервером, переподключение…</div>}
      <Toasts toasts={toasts} />
    </OnlineContext.Provider>
  );
}

export default App;
