import { useState } from 'react';
import { loginAPI } from './api';

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await loginAPI(email, password);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('email', email);
      onLogin(res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Сервер недоступен');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1>Вход</h1>

      <form onSubmit={handleSubmit} className="form login-form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button type="submit" className="btn-main" disabled={loading || !email || !password}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default LoginForm;
