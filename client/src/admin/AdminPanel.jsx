import { useState, useEffect } from 'react';
import { fetchUsersAPI } from '../api';
import UsersTab from './UsersTab';
import LogsTab from './LogsTab';

function AdminPanel() {
  const [tab, setTab] = useState('users');
  const [notice, setNotice] = useState('');

  // список пользователей нужен обеим вкладкам: таблице и журналу (email по userId)
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function loadUsers() {
    fetchUsersAPI()
      .then(res => {
        setUsers(res.data.users);
        setError('');
        setLoading(false);
      })
      .catch(err => {
        setError('Не удалось загрузить пользователей: ' + (err.response?.data?.error || 'сервер недоступен'));
        setLoading(false);
      });
  }

  // загрузка один раз при открытии админки
  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

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
        <UsersTab
          users={users}
          loading={loading}
          error={error}
          onReload={loadUsers}
          onNotice={setNotice}
        />
      )}

      {tab === 'logs' && <LogsTab users={users} />}
    </div>
  );
}

export default AdminPanel;
