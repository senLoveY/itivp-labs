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
      <header className="header">
        <div className="header-inner">
          <b className="logo">Микроблог</b>
          <div>
            <span className="hint">{localStorage.getItem('email')}</span>
            <button onClick={logout}>Выйти</button>
          </div>
        </div>
      </header>
      <TweetList />
    </div>
  );
}

export default App;
