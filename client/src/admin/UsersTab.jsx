import { useState } from 'react';
import { banUserAPI, unbanUserAPI, changeRoleAPI, getCurrentUser } from '../api';
import Loader from '../components/Loader';

function UsersTab({ users, loading, error, onReload, onNotice }) {
  const me = getCurrentUser();
  const [search, setSearch] = useState('');

  function errorText(err) {
    return err.response?.data?.error || 'сервер недоступен';
  }

  async function runAction(request, message) {
    try {
      await request();
      onNotice(message);
      onReload();
    } catch (err) {
      onNotice('Ошибка: ' + errorText(err));
    }
  }

  function ban(user) {
    const reason = window.prompt(`Причина бана для ${user.email}:`);
    if (reason === null) return;
    runAction(() => banUserAPI(user.id, reason.trim() || 'Причина не указана'), `${user.email} забанен`);
  }

  function unban(user) {
    runAction(() => unbanUserAPI(user.id), `${user.email} разбанен`);
  }

  function toggleRole(user) {
    const role = user.role === 'admin' ? 'user' : 'admin';
    runAction(() => changeRoleAPI(user.id, role), `${user.email} теперь ${role}`);
  }

  const shownUsers = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="search">
        <input
          type="text"
          placeholder="Поиск по email"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <p className="hint">Найдено: {shownUsers.length}</p>
      </div>

      {loading && <Loader />}

      {error && (
        <div className="message">
          <p className="error">{error}</p>
          <button className="btn-main" onClick={onReload}>Повторить</button>
        </div>
      )}

      {!loading && !error && shownUsers.length === 0 && (
        <p className="hint message">Ничего не найдено</p>
      )}

      {!loading && !error && shownUsers.length > 0 && (
        <div className="admin-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Регистрация</th>
                <th className="right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {shownUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={user.role === 'admin' ? 'pill pill-dark' : 'pill'}>
                      {user.role === 'admin' ? 'админ' : 'пользователь'}
                    </span>
                  </td>
                  <td>
                    {user.isBanned ? (
                      <>
                        <span className="pill pill-red">забанен</span>
                        <div className="hint">{user.banReason}</div>
                      </>
                    ) : (
                      <span className="pill">активен</span>
                    )}
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    {user.id === me.id ? (
                      <div className="hint right">это вы</div>
                    ) : (
                      <div className="admin-actions">
                        <div>
                          {user.isBanned && <button onClick={() => unban(user)}>Разбанить</button>}
                          {!user.isBanned && user.role !== 'admin' && (
                            <button className="btn-danger" onClick={() => ban(user)}>Забанить</button>
                          )}
                        </div>
                        <button onClick={() => toggleRole(user)}>
                          {user.role === 'admin' ? 'Снять админа' : 'Сделать админом'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default UsersTab;
