import { useState, useEffect } from 'react';
import { fetchLogsAPI } from '../api';
import Loader from '../components/Loader';

function LogsTab({ users }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // журнал загружается при смене страницы или поиска
  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      fetchLogsAPI(page, search, controller.signal)
        .then(res => {
          setLogs(res.data.logs);
          setPages(res.data.pages || 1);
          setTotal(res.data.total);
          setLoading(false);
        })
        .catch(err => {
          if (err.name === 'CanceledError') return;
          setError('Не удалось загрузить журнал: ' + (err.response?.data?.error || 'сервер недоступен'));
          setLoading(false);
        });
    }, search ? 500 : 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, search]);

  function changeSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function emailById(id) {
    const user = users.find(u => u.id === id);
    return user ? user.email : `id ${id}`;
  }

  return (
    <>
      <div className="search">
        <input
          type="text"
          placeholder="Поиск по email или IP"
          value={search}
          onChange={e => changeSearch(e.target.value)}
        />
        <p className="hint">Найдено записей: {total}</p>
      </div>

      {loading && <Loader />}

      {error && <p className="error message">{error}</p>}

      {!loading && !error && logs.length === 0 && (
        <p className="hint message">Ничего не найдено</p>
      )}

      {!loading && !error && logs.length > 0 && (
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
        <button onClick={() => setPage(page - 1)} disabled={page <= 1 || loading}>
          ← Назад
        </button>
        <span className="hint">Страница {page} из {pages}</span>
        <button onClick={() => setPage(page + 1)} disabled={page >= pages || loading}>
          Вперёд →
        </button>
      </div>
    </>
  );
}

export default LogsTab;
