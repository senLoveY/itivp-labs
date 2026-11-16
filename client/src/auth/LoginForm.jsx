import { useState } from 'react';
import { loginAPI, registerAPI } from '../api';
import { clearCache } from '../cache';

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        <div className="login-password">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            aria-label="Пароль"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(visible => !visible)}
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {showPassword ? (
                <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9 5.5A10.6 10.6 0 0 1 12 5c6 0 10 7 10 7a18 18 0 0 1-2.7 3.4M6 6.9C3.6 9 2 12 2 12s4 7 10 7a9.8 9.8 0 0 0 4.8-1.4" />
              ) : (
                <>
                  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        </div>
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
            setShowPassword(false);
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
