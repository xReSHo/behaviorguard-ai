import { PGlite } from '@electric-sql/pglite';
import type { Transaction } from '@electric-sql/pglite';
import type {
  DashboardStats,
  EmployeeFeatures,
  LogEvent,
  ModelSettings,
  Prediction,
  RecentActivity,
  RiskBin,
  TimelinePoint,
} from './types';
import { DEFAULT_SETTINGS } from './types';

// PGlite gives us a real SQLite-compatible (Postgres) database running in the
// browser, backed by IndexedDB so data persists across reloads.
const db = new PGlite('idb://anomaly-db');

let ready: Promise<PGlite> | null = null;

export function getDb(): Promise<PGlite> {
  if (!ready) {
    ready = (async () => {
      await db.waitReady;
      await initSchema();
      return db;
    })();
  }
  return ready;
}

async function initSchema(): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      timestamp TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      login_time TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      access_type TEXT NOT NULL,
      file_modified TEXT NOT NULL,
      session_duration REAL NOT NULL,
      login_status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS features (
      employee_id TEXT PRIMARY KEY,
      employee_name TEXT NOT NULL,
      avg_login_time TEXT NOT NULL,
      login_frequency REAL NOT NULL,
      failed_login_count INTEGER NOT NULL,
      avg_session_duration REAL NOT NULL,
      file_access_count INTEGER NOT NULL,
      file_modification_count INTEGER NOT NULL,
      access_frequency REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS predictions (
      employee_id TEXT PRIMARY KEY,
      risk_score REAL NOT NULL,
      label TEXT NOT NULL,
      anomaly_score REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      contamination REAL NOT NULL,
      random_seed INTEGER NOT NULL,
      n_estimators INTEGER NOT NULL,
      last_trained_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_logs_employee ON logs(employee_id);
    CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
  `);

  await db.query(
    `INSERT INTO settings (id, contamination, random_seed, n_estimators, last_trained_at)
     VALUES (1, $1, $2, $3, NULL)
     ON CONFLICT (id) DO NOTHING`,
    [
      DEFAULT_SETTINGS.contamination,
      DEFAULT_SETTINGS.random_seed,
      DEFAULT_SETTINGS.n_estimators,
    ],
  );
}

// ---- Logs ----

export async function insertLogs(events: LogEvent[]): Promise<void> {
  if (events.length === 0) return;
  const d = await getDb();
  await d.transaction(async (tx: Transaction) => {
    for (const e of events) {
      await tx.query(
        `INSERT INTO logs
         (timestamp, employee_id, employee_name, login_time, ip_address,
          access_type, file_modified, session_duration, login_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          e.timestamp,
          e.employee_id,
          e.employee_name,
          e.login_time,
          e.ip_address,
          e.access_type,
          e.file_modified,
          e.session_duration,
          e.login_status,
        ],
      );
    }
  });
}

export async function countLogs(): Promise<number> {
  const d = await getDb();
  const res = await d.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM logs`);
  return res.rows[0].count;
}

export async function getAllLogs(): Promise<LogEvent[]> {
  const d = await getDb();
  const res = await d.query<LogEvent>(
    `SELECT id, timestamp, employee_id, employee_name, login_time, ip_address,
            access_type, file_modified, session_duration, login_status
     FROM logs ORDER BY timestamp ASC`,
  );
  return res.rows as LogEvent[];
}

export async function getLogsForEmployee(employeeId: string): Promise<LogEvent[]> {
  const d = await getDb();
  const res = await d.query<LogEvent>(
    `SELECT id, timestamp, employee_id, employee_name, login_time, ip_address,
            access_type, file_modified, session_duration, login_status
     FROM logs WHERE employee_id = $1 ORDER BY timestamp ASC`,
    [employeeId],
  );
  return res.rows as LogEvent[];
}

export async function getRecentActivity(limit = 50): Promise<RecentActivity[]> {
  const d = await getDb();
  const res = await d.query<RecentActivity>(
    `SELECT l.id, l.employee_name, l.timestamp, l.access_type,
            COALESCE(p.risk_score, 0) AS risk_score,
            COALESCE(p.label, 'Normal') AS label
     FROM logs l
     LEFT JOIN predictions p ON p.employee_id = l.employee_id
     ORDER BY l.timestamp DESC
     LIMIT $1`,
    [limit],
  );
  return res.rows as RecentActivity[];
}

// ---- Features ----

export async function replaceFeatures(features: EmployeeFeatures[]): Promise<void> {
  const d = await getDb();
  await d.transaction(async (tx: Transaction) => {
    await tx.query(`DELETE FROM features`);
    for (const f of features) {
      await tx.query(
        `INSERT INTO features
         (employee_id, employee_name, avg_login_time, login_frequency,
          failed_login_count, avg_session_duration, file_access_count,
          file_modification_count, access_frequency)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          f.employee_id,
          f.employee_name,
          f.avg_login_time,
          f.login_frequency,
          f.failed_login_count,
          f.avg_session_duration,
          f.file_access_count,
          f.file_modification_count,
          f.access_frequency,
        ],
      );
    }
  });
}

export async function getAllFeatures(): Promise<EmployeeFeatures[]> {
  const d = await getDb();
  const res = await d.query<EmployeeFeatures>(
    `SELECT employee_id, employee_name, avg_login_time, login_frequency,
            failed_login_count, avg_session_duration, file_access_count,
            file_modification_count, access_frequency
     FROM features ORDER BY employee_name ASC`,
  );
  return res.rows as EmployeeFeatures[];
}

// ---- Predictions ----

export async function replacePredictions(predictions: Prediction[]): Promise<void> {
  const d = await getDb();
  await d.transaction(async (tx: Transaction) => {
    await tx.query(`DELETE FROM predictions`);
    for (const p of predictions) {
      await tx.query(
        `INSERT INTO predictions (employee_id, risk_score, label, anomaly_score)
         VALUES ($1, $2, $3, $4)`,
        [p.employee_id, p.risk_score, p.label, p.anomaly_score],
      );
    }
  });
}

export async function getAllPredictions(): Promise<Prediction[]> {
  const d = await getDb();
  const res = await d.query<Prediction>(
    `SELECT employee_id, risk_score, label, anomaly_score FROM predictions`,
  );
  return res.rows as Prediction[];
}

// ---- Settings ----

export async function getSettings(): Promise<ModelSettings> {
  const d = await getDb();
  const res = await d.query<ModelSettings>(
    `SELECT contamination, random_seed, n_estimators, last_trained_at
     FROM settings WHERE id = 1`,
  );
  if (res.rows.length === 0) return DEFAULT_SETTINGS;
  const r = res.rows[0] as unknown as ModelSettings;
  return {
    contamination: r.contamination,
    random_seed: r.random_seed,
    n_estimators: r.n_estimators,
    last_trained_at: r.last_trained_at,
  };
}

export async function saveSettings(s: ModelSettings): Promise<void> {
  const d = await getDb();
  await d.query(
    `UPDATE settings SET contamination = $1, random_seed = $2, n_estimators = $3
     WHERE id = 1`,
    [s.contamination, s.random_seed, s.n_estimators],
  );
}

export async function markTrained(atIso: string): Promise<void> {
  const d = await getDb();
  await d.query(`UPDATE settings SET last_trained_at = $1 WHERE id = 1`, [atIso]);
}

// ---- Dashboard aggregates ----

export async function getDashboardStats(): Promise<DashboardStats> {
  const d = await getDb();
  const empRes = await d.query<{ count: number }>(
    `SELECT COUNT(DISTINCT employee_id)::int AS count FROM logs`,
  );
  const logRes = await d.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM logs`);
  const flagRes = await d.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM predictions WHERE label = 'Anomalous'`,
  );
  const avgRes = await d.query<{ avg: number | null }>(
    `SELECT AVG(risk_score) AS avg FROM predictions`,
  );
  return {
    total_employees: empRes.rows[0].count,
    total_log_events: logRes.rows[0].count,
    flagged_employees: flagRes.rows[0].count,
    avg_risk_score: avgRes.rows[0].avg ? Number(avgRes.rows[0].avg) : 0,
  };
}

export async function getLoginTimeline(days = 14): Promise<TimelinePoint[]> {
  const d = await getDb();
  const res = await d.query<TimelinePoint>(
    `SELECT DATE(timestamp) AS date,
            COUNT(*)::int AS logins,
            COUNT(*) FILTER (WHERE login_status = 'failed')::int AS anomalies
     FROM logs
     WHERE timestamp::date >= (CURRENT_DATE - $1::int)
     GROUP BY DATE(timestamp)
     ORDER BY date ASC`,
    [days],
  );
  return res.rows as TimelinePoint[];
}

export async function getRiskDistribution(): Promise<RiskBin[]> {
  const d = await getDb();
  const bins = [
    [0, 20],
    [20, 40],
    [40, 60],
    [60, 80],
    [80, 101],
  ];
  const out: RiskBin[] = [];
  for (const [lo, hi] of bins) {
    const res = await d.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM predictions
       WHERE risk_score >= $1 AND risk_score < $2`,
      [lo, hi],
    );
    out.push({
      range: hi === 101 ? `${lo}-100` : `${lo}-${hi}`,
      count: res.rows[0].count,
    });
  }
  return out;
}

export async function getDailyAnomalyCount(days = 14): Promise<TimelinePoint[]> {
  const d = await getDb();
  const res = await d.query<TimelinePoint>(
    `SELECT DATE(l.timestamp) AS date,
            COUNT(*) FILTER (WHERE p.label = 'Anomalous')::int AS anomalies,
            0 AS logins
     FROM logs l
     LEFT JOIN predictions p ON p.employee_id = l.employee_id
     WHERE l.timestamp::date >= (CURRENT_DATE - $1::int)
     GROUP BY DATE(l.timestamp)
     ORDER BY date ASC`,
    [days],
  );
  return res.rows as TimelinePoint[];
}
