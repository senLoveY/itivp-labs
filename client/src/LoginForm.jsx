import { useState } from 'react';
import { loginAPI, registerAPI } from './api';
import { clearCache } from './cache';

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await registerAPI(email, password);
      }
      const res = await loginAPI(email, password);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('email', email);
      clearCache();
      onLogin(res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Сервер недоступен');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <h1>{isRegister ? 'Регистрация' : 'Вход'}</h1>

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
          {loading ? 'Подождите...' : isRegister ? 'Зарегистрироваться' : 'Войти'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <p className="hint">
        {isRegister ? 'Уже есть аккаунт? ' : 'Нет аккаунта? '}
        <a
          href="#"
          onClick={e => {
            e.preventDefault();
            setIsRegister(!isRegister);
            setError('');
          }}
        >
          {isRegister ? 'Войти' : 'Зарегистрироваться'}
        </a>
      </p>
    </div>
  );
}

export default LoginForm;
