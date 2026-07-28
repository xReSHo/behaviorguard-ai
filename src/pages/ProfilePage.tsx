import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Gauge,
  CalendarClock,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading, EmptyState } from '@/components/Feedback';
import { Pagination } from '@/components/Pagination';
import { getAllFeatures, getAllPredictions, getLogsForEmployee } from '@/lib/db';
import type { EmployeeFeatures, LogEvent, Prediction } from '@/lib/types';
import { cn } from '@/lib/utils';

const LOG_PAGE_SIZE = 10;

export function ProfilePage() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [feature, setFeature] = useState<EmployeeFeatures | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [logPage, setLogPage] = useState(1);

  useEffect(() => {
    (async () => {
      if (!name) return;
      const decoded = decodeURIComponent(name);
      const [features, preds] = await Promise.all([getAllFeatures(), getAllPredictions()]);
      const match = features.find((f) => f.employee_name === decoded);
      setFeature(match ?? null);
      if (match) {
        const p = preds.find((pr) => pr.employee_id === match.employee_id);
        setPrediction(p ?? null);
        const l = await getLogsForEmployee(match.employee_id);
        setLogs(l);
      }
      setLoading(false);
    })();
  }, [name]);

  if (loading) return <Loading label="Loading employee profile…" />;

  if (!feature) {
    return (
      <EmptyState
        icon={User}
        title="Employee not found"
        description="This employee does not have any recorded activity."
        action={
          <Button variant="outline" onClick={() => navigate('/profiles')}>
            <ArrowLeft className="h-4 w-4" />
            Back to profiles
          </Button>
        }
      />
    );
  }

  const anomalous = prediction?.label === 'Anomalous';
  const pagedLogs = logs.slice((logPage - 1) * LOG_PAGE_SIZE, logPage * LOG_PAGE_SIZE);

  const featureItems = [
    { label: 'Average Login Time', value: feature.avg_login_time, icon: Clock },
    { label: 'Login Frequency', value: feature.login_frequency, icon: Activity },
    { label: 'Failed Login Count', value: feature.failed_login_count, icon: XCircle },
    { label: 'Avg Session Duration', value: `${feature.avg_session_duration.toFixed(1)} min`, icon: CalendarClock },
    { label: 'File Accesses', value: feature.file_access_count, icon: FileText },
    { label: 'File Modifications', value: feature.file_modification_count, icon: FileText },
    { label: 'Access Frequency', value: `${feature.access_frequency.toFixed(2)}/day`, icon: Gauge },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/profiles')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground">Employee Profile</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Employee Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold',
                  anomalous
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-primary/10 text-primary',
                )}
              >
                {feature.employee_name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div>
                <p className="font-semibold text-foreground">{feature.employee_name}</p>
                <p className="text-sm text-muted-foreground">{feature.employee_id}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Prediction</span>
                <Badge variant={anomalous ? 'destructive' : 'secondary'}>
                  {anomalous ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {prediction?.label ?? 'Normal'}
                </Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Risk Score</span>
                <span
                  className={cn(
                    'text-2xl font-bold tabular-nums',
                    anomalous ? 'text-destructive' : 'text-foreground',
                  )}
                >
                  {Math.round(prediction?.risk_score ?? 0)}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    anomalous ? 'bg-destructive' : 'bg-success',
                  )}
                  style={{ width: `${Math.min(100, Math.round(prediction?.risk_score ?? 0))}%` }}
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Total log events: <span className="font-medium text-foreground">{logs.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Behavioral Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {featureItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="font-medium text-foreground">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity History</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {logs.length === 0 ? (
            <EmptyState title="No activity recorded" description="This employee has no log events." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-2 font-medium">Timestamp</th>
                    <th className="px-4 py-2 font-medium">Login Time</th>
                    <th className="px-4 py-2 font-medium">Access Type</th>
                    <th className="px-4 py-2 font-medium">IP Address</th>
                    <th className="px-4 py-2 font-medium">File</th>
                    <th className="px-4 py-2 font-medium">Duration</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-6 py-2.5 text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{log.login_time}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                          {log.access_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {log.ip_address}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {log.file_modified || '—'}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                        {log.session_duration > 0 ? `${log.session_duration}m` : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {log.login_status === 'failed' ? (
                          <Badge variant="destructive">Failed</Badge>
                        ) : (
                          <Badge variant="secondary">Success</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {logs.length > LOG_PAGE_SIZE && (
            <div className="px-6">
              <Pagination
                page={logPage}
                pageSize={LOG_PAGE_SIZE}
                total={logs.length}
                onPageChange={setLogPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
