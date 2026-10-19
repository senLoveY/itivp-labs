import { useState } from 'react';
import TweetList from './TweetList';
import LoginForm from './LoginForm';
import { clearCache } from './cache';
import './App.css';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    clearCache();
    setToken(null);
  }

  if (!token) {
    return <LoginForm onLogin={setToken} />;
  }

  return (
    <div>
      <div className="user-bar">
        <span className="hint">Вы вошли как {localStorage.getItem('email')}</span>
        <button onClick={logout}>Выйти</button>
      </div>
      <TweetList />
    </div>
  );
}

export default App;
