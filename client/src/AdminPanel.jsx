import { useState, useEffect } from 'react';
import { fetchUsersAPI, banUserAPI, unbanUserAPI, changeRoleAPI, fetchLogsAPI, getCurrentUser } from './api';

function AdminPanel() {
  const me = getCurrentUser();
  const [tab, setTab] = useState('users');
  const [notice, setNotice] = useState('');

  // пользователи
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // журнал входов
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logPages, setLogPages] = useState(1);
  const [logTotal, setLogTotal] = useState(0);

  function errorText(err) {
    return err.response?.data?.error || 'сервер недоступен';
  }

  function loadUsers() {
    fetchUsersAPI()
      .then(res => {
        setUsers(res.data.users);
        setUsersError('');
        setUsersLoading(false);
      })
      .catch(err => {
        setUsersError('Не удалось загрузить пользователей: ' + errorText(err));
        setUsersLoading(false);
      });
  }

  // загрузка один раз при открытии админки
  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // журнал загружается при смене страницы или поиска
  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      setLogsLoading(true);
      setLogsError('');
      fetchLogsAPI(logPage, logSearch, controller.signal)
        .then(res => {
          setLogs(res.data.logs);
          setLogPages(res.data.pages || 1);
          setLogTotal(res.data.total);
          setLogsLoading(false);
        })
        .catch(err => {
          if (err.name === 'CanceledError') return;
          setLogsError('Не удалось загрузить журнал: ' + errorText(err));
          setLogsLoading(false);
        });
    }, logSearch ? 500 : 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [logPage, logSearch]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function runAction(request, message) {
    try {
      await request();
      setNotice(message);
      loadUsers();
    } catch (err) {
      setNotice('Ошибка: ' + errorText(err));
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

  function emailById(id) {
    const user = users.find(u => u.id === id);
    return user ? user.email : `id ${id}`;
  }

  function changeLogSearch(value) {
    setLogSearch(value);
    setLogPage(1);
  }

  const shownUsers = users.filter(u => u.email.toLowerCase().includes(userSearch.toLowerCase()));

  return (
    <div className="feed admin">
      <div className="admin-tabs">
        <button className={tab === 'users' ? 'btn-main' : ''} onClick={() => setTab('users')}>
          Пользователи ({users.length})
        </button>
        <button className={tab === 'logs' ? 'btn-main' : ''} onClick={() => setTab('logs')}>
          Журнал входов
        </button>
      </div>

      {notice && <p className="hint message">{notice}</p>}

      {tab === 'users' && (
        <>
          <div className="search">
            <input
              type="text"
              placeholder="Поиск по email"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
            <p className="hint">Найдено: {shownUsers.length}</p>
          </div>

          {usersLoading && (
            <div className="loader">
              <span className="spinner"></span> Загрузка...
            </div>
          )}

          {usersError && (
            <div className="message">
              <p className="error">{usersError}</p>
              <button className="btn-main" onClick={loadUsers}>Повторить</button>
            </div>
          )}

          {!usersLoading && !usersError && shownUsers.length === 0 && (
            <p className="hint message">Ничего не найдено</p>
          )}

          {!usersLoading && !usersError && shownUsers.length > 0 && (
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
      )}

      {tab === 'logs' && (
        <>
          <div className="search">
            <input
              type="text"
              placeholder="Поиск по email или IP"
              value={logSearch}
              onChange={e => changeLogSearch(e.target.value)}
            />
            <p className="hint">Найдено записей: {logTotal}</p>
          </div>

          {logsLoading && (
            <div className="loader">
              <span className="spinner"></span> Загрузка...
            </div>
          )}

          {logsError && <p className="error message">{logsError}</p>}

          {!logsLoading && !logsError && logs.length === 0 && (
            <p className="hint message">Ничего не найдено</p>
          )}

          {!logsLoading && !logsError && logs.length > 0 && (
            <div className="admin-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Время</th>
                    <th>Пользователь</th>
                    <th>IP</th>
                    <th>Результат</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                      <td>{emailById(log.userId)}</td>
                      <td>{log.ip}</td>
                      <td>
                        {log.success ? (
                          <span className="pill">успешно</span>
                        ) : (
                          <span className="pill pill-red">неудачно</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pager">
            <button onClick={() => setLogPage(logPage - 1)} disabled={logPage <= 1 || logsLoading}>
              ← Назад
            </button>
            <span className="hint">Страница {logPage} из {logPages}</span>
            <button onClick={() => setLogPage(logPage + 1)} disabled={logPage >= logPages || logsLoading}>
              Вперёд →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminPanel;
