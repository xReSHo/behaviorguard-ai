import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileClock,
  AlertTriangle,
  Gauge,
  Activity,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import { RiskBadge } from '@/components/RiskBadge';
import { Loading } from '@/components/Feedback';
import {
  getDailyAnomalyCount,
  getDashboardStats,
  getLoginTimeline,
  getRecentActivity,
  getRiskDistribution,
} from '@/lib/db';
import type { DashboardStats, RecentActivity, RiskBin, TimelinePoint } from '@/lib/types';

const RISK_COLORS: Record<string, string> = {
  '0-20': 'hsl(142 71% 40%)',
  '20-40': 'hsl(142 71% 55%)',
  '40-60': 'hsl(38 92% 50%)',
  '60-80': 'hsl(20 90% 55%)',
  '80-100': 'hsl(0 84% 60%)',
};

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [riskDist, setRiskDist] = useState<RiskBin[]>([]);
  const [anomalyDaily, setAnomalyDaily] = useState<TimelinePoint[]>([]);
  const [recent, setRecent] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, tl, rd, ad, ra] = await Promise.all([
        getDashboardStats(),
        getLoginTimeline(14),
        getRiskDistribution(),
        getDailyAnomalyCount(14),
        getRecentActivity(15),
      ]);
      setStats(s);
      setTimeline(tl);
      setRiskDist(rd);
      setAnomalyDaily(ad);
      setRecent(ra);
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) {
    return <Loading label="Loading dashboard…" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Employees"
          value={stats.total_employees}
          icon={Users}
          hint="Distinct employees in logs"
        />
        <StatCard
          label="Total Log Events"
          value={stats.total_log_events.toLocaleString()}
          icon={FileClock}
          hint="Across all employees"
        />
        <StatCard
          label="Flagged Employees"
          value={stats.flagged_employees}
          icon={AlertTriangle}
          tone="danger"
          hint="Detected as anomalous"
        />
        <StatCard
          label="Average Risk Score"
          value={stats.avg_risk_score.toFixed(1)}
          icon={Gauge}
          tone={stats.avg_risk_score >= 50 ? 'danger' : 'success'}
          hint="0-100 scale"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Login Activity Timeline
            </CardTitle>
            <CardDescription>Daily successful vs failed logins (last 14 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="loginsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217 91% 50%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(217 91% 50%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="anomGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => String(d).slice(5)}
                    fontSize={11}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--popover))',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="logins"
                    name="Logins"
                    stroke="hsl(217 91% 50%)"
                    fill="url(#loginsGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="anomalies"
                    name="Failed"
                    stroke="hsl(0 84% 60%)"
                    fill="url(#anomGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Risk Score Distribution
            </CardTitle>
            <CardDescription>Number of employees per risk band</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskDist} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="range" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--popover))',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" name="Employees" radius={[6, 6, 0, 0]}>
                    {riskDist.map((bin) => (
                      <Cell key={bin.range} fill={RISK_COLORS[bin.range] ?? 'hsl(217 91% 50%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Daily Anomaly Count
            </CardTitle>
            <CardDescription>Anomalous employee events per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={anomalyDaily} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => String(d).slice(5)}
                    fontSize={11}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--popover))',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="anomalies" name="Anomalies" fill="hsl(0 84% 60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Latest log events with current risk classification</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-2 font-medium">Employee</th>
                    <th className="px-4 py-2 font-medium">Timestamp</th>
                    <th className="px-4 py-2 font-medium">Activity</th>
                    <th className="px-4 py-2 font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                        No activity recorded yet.
                      </td>
                    </tr>
                  )}
                  {recent.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => navigate(`/profiles/${row.employee_name}`)}
                    >
                      <td className="px-6 py-2.5 font-medium text-foreground">{row.employee_name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {new Date(row.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                          {row.access_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <RiskBadge score={row.risk_score} label={row.label} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
