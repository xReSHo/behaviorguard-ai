import type {
  EmployeeFeatures,
  LogEvent,
  Prediction,
} from './types';
import { IsolationForest } from './isolation-forest';

// Convert "HH:MM" to minutes since midnight.
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(min: number): string {
  const h = Math.floor(((min % 1440) + 1440) % 1440);
  const hh = Math.floor(h / 60);
  const mm = h % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

const ACCESS_TYPES = [
  'login',
  'logout',
  'file_read',
  'file_write',
  'file_delete',
  'database_query',
  'admin_action',
] as const;

export function extractFeatures(logs: LogEvent[]): EmployeeFeatures[] {
  const byEmployee = new Map<string, LogEvent[]>();
  for (const log of logs) {
    const arr = byEmployee.get(log.employee_id) ?? [];
    arr.push(log);
    byEmployee.set(log.employee_id, arr);
  }

  const features: EmployeeFeatures[] = [];
  for (const [employeeId, empLogs] of byEmployee) {
    const name = empLogs[0].employee_name;

    // Average login time (circular mean of login_time values that look like HH:MM).
    const loginTimes = empLogs
      .map((l) => l.login_time)
      .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
      .map(timeToMinutes);
    const avgLogin =
      loginTimes.length > 0
        ? minutesToTime(loginTimes.reduce((a, b) => a + b, 0) / loginTimes.length)
        : '00:00';

    const loginEvents = empLogs.filter((l) => l.access_type === 'login');
    const failedCount = loginEvents.filter((l) => l.login_status === 'failed').length;
    const sessions = empLogs.filter((l) => l.access_type === 'login' || l.access_type === 'logout');
    const avgSession =
      sessions.length > 0
        ? sessions.reduce((a, b) => a + b.session_duration, 0) / sessions.length
        : 0;

    const fileAccess = empLogs.filter((l) => l.access_type === 'file_read').length;
    const fileMods = empLogs.filter(
      (l) => l.access_type === 'file_write' || l.access_type === 'file_delete',
    ).length;

    // Access frequency = events per active day.
    const days = new Set(empLogs.map((l) => l.timestamp.slice(0, 10)));
    const accessFreq = days.size > 0 ? empLogs.length / days.size : 0;

    features.push({
      employee_id: employeeId,
      employee_name: name,
      avg_login_time: avgLogin,
      login_frequency: loginEvents.length,
      failed_login_count: failedCount,
      avg_session_duration: Math.round(avgSession * 100) / 100,
      file_access_count: fileAccess,
      file_modification_count: fileMods,
      access_frequency: Math.round(accessFreq * 100) / 100,
    });
  }

  features.sort((a, b) => a.employee_name.localeCompare(b.employee_name));
  return features;
}

// Build the numeric feature matrix used by the model. Each row corresponds to
// the same index order as `features`.
export function buildFeatureMatrix(features: EmployeeFeatures[]): number[][] {
  return features.map((f) => [
    timeToMinutes(f.avg_login_time),
    f.login_frequency,
    f.failed_login_count,
    f.avg_session_duration,
    f.file_access_count,
    f.file_modification_count,
    f.access_frequency,
  ]);
}

export interface TrainResult {
  predictions: Prediction[];
  trainedAt: string;
}

export function trainAndPredict(
  features: EmployeeFeatures[],
  settings: { contamination: number; random_seed: number; n_estimators: number },
): TrainResult {
  if (features.length === 0) {
    return { predictions: [], trainedAt: new Date().toISOString() };
  }

  const X = buildFeatureMatrix(features);
  const forest = new IsolationForest({
    nEstimators: settings.n_estimators,
    contamination: settings.contamination,
    randomSeed: settings.random_seed,
  });
  forest.fit(X);

  const scores = forest.scoreSamples(X);
  // Determine the contamination threshold from the scores themselves.
  const sorted = [...scores].sort((a, b) => a - b);
  const idx = Math.floor(settings.contamination * sorted.length);
  const cutoff = sorted[Math.min(idx, sorted.length - 1)] ?? 0;

  // Normalize raw anomaly scores (lower = more anomalous) into a 0-100 risk
  // score where 100 = most anomalous. We invert and rescale against the
  // observed score range so the output is interpretable.
  const minS = Math.min(...scores);
  const maxS = Math.max(...scores);
  const range = maxS - minS || 1;

  const predictions: Prediction[] = features.map((f, i) => {
    const s = scores[i];
    const risk = Math.round(((maxS - s) / range) * 100);
    const label = s < cutoff ? 'Anomalous' : 'Normal';
    return {
      employee_id: f.employee_id,
      risk_score: Math.max(0, Math.min(100, risk)),
      label,
      anomaly_score: s,
    };
  });

  return { predictions, trainedAt: new Date().toISOString() };
}

export { ACCESS_TYPES };
