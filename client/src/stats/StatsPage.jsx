import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { fetchMyStatsAPI } from '../api';
import Loader from '../components/Loader';

// подключаем только то, что нужно для столбчатых графиков
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const BAR_COLOR = '#333';

function shorten(text, length = 30) {
  return text.length > length ? text.slice(0, length) + '…' : text;
}

// общие настройки горизонтального графика; fullLabels – полные подписи для подсказки
function barOptions(fullLabels) {
  return {
    indexAxis: 'y',
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        callbacks: {
          title: items => fullLabels[items[0].dataIndex],
          label: item => `Лайков: ${item.raw}`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { precision: 0, color: '#888' },
        grid: { color: '#eee' },
        border: { display: false }
      },
      y: {
        ticks: { color: '#555' },
        grid: { display: false },
        border: { display: false }
      }
    }
  };
}

function barData(labels, values) {
  return {
    labels,
    datasets: [{
      data: values,
      backgroundColor: BAR_COLOR,
      borderRadius: 4,
      borderSkipped: 'start',
      barThickness: 18
    }]
  };
}

function StatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function loadStats() {
    fetchMyStatsAPI()
      .then(res => {
        setStats(res.data);
        setError('');
        setLoading(false);
      })
      .catch(err => {
        setError('Не удалось загрузить статистику: ' + (err.response?.data?.error || 'сервер недоступен'));
        setLoading(false);
      });
  }

  useEffect(() => {
    loadStats();
  }, []);

  function retry() {
    setLoading(true);
    setError('');
    loadStats();
  }

  if (loading) {
    return <div className="feed stats"><Loader /></div>;
  }

  if (error) {
    return (
      <div className="feed stats">
        <div className="message">
          <p className="error">{error}</p>
          <button className="btn-main" onClick={retry}>Повторить</button>
        </div>
      </div>
    );
  }

  const { totals, tweets, tags } = stats;

  if (totals.posts === 0) {
    return (
      <div className="feed stats">
        <p className="hint message">У вас пока нет постов. Напишите первый твит в ленте – и здесь появится статистика.</p>
      </div>
    );
  }

  const topTweets = tweets.slice(0, 10);

  return (
    <div className="feed stats">
      <div className="stat-cards">
        <div className="stat-card">
          <div className="hint">Постов</div>
          <div className="stat-value">{totals.posts}</div>
        </div>
        <div className="stat-card">
          <div className="hint">Лайков</div>
          <div className="stat-value">{totals.likes}</div>
        </div>
        <div className="stat-card">
          <div className="hint">В среднем на пост</div>
          <div className="stat-value">{totals.average}</div>
        </div>
        <div className="stat-card">
          <div className="hint">Лучший пост</div>
          <div className="stat-value">♥ {totals.best.likesCount}</div>
          <div className="hint">{shorten(totals.best.content, 40)}</div>
        </div>
      </div>

      <div className="stat-block">
        <h3>Лайки по постам</h3>
        <p className="hint">Топ-{topTweets.length} ваших постов по количеству лайков</p>
        <div className="chart" style={{ height: topTweets.length * 32 + 40 }}>
          <Bar
            data={barData(topTweets.map(t => shorten(t.content)), topTweets.map(t => t.likesCount))}
            options={barOptions(topTweets.map(t => t.content))}
          />
        </div>
      </div>

      <div className="stat-block">
        <h3>Лайки по тегам</h3>
        <p className="hint">Сумма лайков постов с каждым тегом</p>
        {tags.length === 0 ? (
          <p className="hint">В ваших постах нет тегов.</p>
        ) : (
          <>
            <div className="chart" style={{ height: tags.length * 32 + 40 }}>
              <Bar
                data={barData(tags.map(t => t.tag), tags.map(t => t.likes))}
                options={barOptions(tags.map(t => t.tag))}
              />
            </div>

            <table className="admin-table stat-table">
              <thead>
                <tr>
                  <th>Тег</th>
                  <th className="right">Постов</th>
                  <th className="right">Лайков</th>
                  <th className="right">В среднем на пост</th>
                </tr>
              </thead>
              <tbody>
                {tags.map(t => (
                  <tr key={t.tag}>
                    <td><span className="tag">{t.tag}</span></td>
                    <td className="right">{t.posts}</td>
                    <td className="right">{t.likes}</td>
                    <td className="right">{t.average}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

export default StatsPage;
