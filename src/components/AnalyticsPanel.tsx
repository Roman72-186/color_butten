import { useCallback, useEffect, useState } from 'react';
import styles from '../styles/AnalyticsPanel.module.css';

const API_BASE = 'https://knopki.assaru.space/api';
const TOKEN_STORAGE_KEY = 'analyticsAdminToken';

interface DailyCount {
  date: string;
  count: number;
}

interface NamedCount {
  page: string;
  count: number;
}

interface LabelCount {
  label: string;
  count: number;
}

interface AnalyticsStats {
  totalPageviews: number;
  todayPageviews: number;
  last7DaysPageviews: number;
  uniqueSessions: number;
  dailyPageviews: DailyCount[];
  topPages: NamedCount[];
  topButtons: LabelCount[];
}

function isAnalyticsStats(data: unknown): data is AnalyticsStats {
  return typeof data === 'object' && data !== null && 'totalPageviews' in data;
}

async function fetchStats(token: string): Promise<AnalyticsStats> {
  const response = await fetch(`${API_BASE}/analytics/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    throw new Error('Неверный токен');
  }
  if (!response.ok) {
    throw new Error(`Ошибка сервера (${response.status})`);
  }

  const data: unknown = await response.json();
  if (!isAnalyticsStats(data)) {
    throw new Error('Сервер вернул неожиданный формат данных');
  }
  return data;
}

function TokenForm({ onSubmit, error, loading }: { onSubmit: (token: string) => void; error: string; loading: boolean }) {
  const [value, setValue] = useState('');

  return (
    <div className={styles.tokenCard}>
      <p className={styles.tokenHint}>Введите admin-токен, чтобы посмотреть статистику</p>
      <form
        className={styles.tokenForm}
        onSubmit={e => {
          e.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
      >
        <input
          type="password"
          className={styles.tokenInput}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Admin-токен"
          disabled={loading}
        />
        <button type="submit" className={styles.tokenSubmit} disabled={loading || !value.trim()}>
          {loading ? 'Проверяем...' : 'Войти'}
        </button>
      </form>
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.statTile}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function BarList({ items, maxRows = 10 }: { items: { name: string; count: number }[]; maxRows?: number }) {
  const top = items.slice(0, maxRows);
  const max = Math.max(1, ...top.map(i => i.count));

  if (top.length === 0) {
    return <div className={styles.empty}>Пока нет данных</div>;
  }

  return (
    <div className={styles.barList}>
      {top.map(item => (
        <div key={item.name} className={styles.barRow}>
          <span className={styles.barLabel} title={item.name}>{item.name}</span>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
          <span className={styles.barCount}>{item.count}</span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsPanel() {
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_STORAGE_KEY) ?? '');
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadStats = useCallback(async (candidateToken: string, persist: boolean) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchStats(candidateToken);
      setStats(data);
      if (persist) localStorage.setItem(TOKEN_STORAGE_KEY, candidateToken);
      setToken(candidateToken);
    } catch (err) {
      setStats(null);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить статистику');
      if (persist) localStorage.removeItem(TOKEN_STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) void loadStats(token, false);
    // загрузка только при первом появлении сохранённого токена
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitToken = useCallback((candidateToken: string) => {
    void loadStats(candidateToken, true);
  }, [loadStats]);

  if (!stats) {
    return (
      <div className={styles.panel}>
        <TokenForm onSubmit={handleSubmitToken} error={error} loading={loading} />
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.headerRow}>
        <span className={styles.title}>Аналитика конструктора</span>
        <button
          className={styles.refreshBtn}
          onClick={() => void loadStats(token, false)}
          disabled={loading}
        >
          {loading ? 'Обновляем...' : 'Обновить'}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.statsGrid}>
        <StatTile label="Заходов всего" value={stats.totalPageviews} />
        <StatTile label="Заходов сегодня" value={stats.todayPageviews} />
        <StatTile label="Заходов за 7 дней" value={stats.last7DaysPageviews} />
        <StatTile label="Уникальных сессий" value={stats.uniqueSessions} />
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Заходы по дням (30 дней)</h3>
        <BarList
          items={stats.dailyPageviews.map(d => ({ name: d.date, count: d.count }))}
          maxRows={30}
        />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Топ вкладок по посещениям</h3>
        <BarList items={stats.topPages.map(p => ({ name: p.page, count: p.count }))} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Топ кнопок по кликам</h3>
        <BarList items={stats.topButtons.map(b => ({ name: b.label, count: b.count }))} />
      </section>
    </div>
  );
}
