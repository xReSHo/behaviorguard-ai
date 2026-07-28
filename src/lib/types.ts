// Shared domain types for the anomaly detection application.

export interface LogEvent {
  id: number;
  timestamp: string; // ISO string of the event
  employee_id: string;
  employee_name: string;
  login_time: string; // HH:MM
  ip_address: string;
  access_type: string;
  file_modified: string; // filename or empty
  session_duration: number; // minutes
  login_status: 'success' | 'failed';
}

export type AccessType =
  | 'login'
  | 'logout'
  | 'file_read'
  | 'file_write'
  | 'file_delete'
  | 'database_query'
  | 'admin_action';

export interface EmployeeFeatures {
  employee_id: string;
  employee_name: string;
  avg_login_time: string; // HH:MM
  login_frequency: number;
  failed_login_count: number;
  avg_session_duration: number;
  file_access_count: number;
  file_modification_count: number;
  access_frequency: number;
}

export type PredictionLabel = 'Normal' | 'Anomalous';

export interface Prediction {
  employee_id: string;
  risk_score: number; // 0-100
  label: PredictionLabel;
  anomaly_score: number; // raw isolation forest score (lower = more anomalous)
}

export interface EmployeeWithAnalysis extends EmployeeFeatures {
  risk_score: number;
  label: PredictionLabel;
  log_count: number;
}

export interface ModelSettings {
  contamination: number; // 0.01 - 0.5
  random_seed: number;
  n_estimators: number;
  last_trained_at: string | null;
}

export interface DashboardStats {
  total_employees: number;
  total_log_events: number;
  flagged_employees: number;
  avg_risk_score: number;
}

export interface TimelinePoint {
  date: string; // YYYY-MM-DD
  logins: number;
  anomalies: number;
}

export interface RiskBin {
  range: string;
  count: number;
}

export interface RecentActivity {
  id: number;
  employee_name: string;
  timestamp: string;
  access_type: string;
  risk_score: number;
  label: PredictionLabel;
}

export interface AuthUser {
  username: string;
}

export const REQUIRED_COLUMNS = [
  'timestamp',
  'employee_id',
  'employee_name',
  'login_time',
  'ip_address',
  'access_type',
  'file_modified',
  'session_duration',
  'login_status',
] as const;

export const DEFAULT_SETTINGS: ModelSettings = {
  contamination: 0.1,
  random_seed: 42,
  n_estimators: 100,
  last_trained_at: null,
};
