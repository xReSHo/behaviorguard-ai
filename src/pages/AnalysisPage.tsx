import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Brain, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/Pagination';
import { Loading, EmptyState } from '@/components/Feedback';
import { getAllFeatures, getAllPredictions } from '@/lib/db';
import type { EmployeeFeatures, Prediction } from '@/lib/types';
import { cn } from '@/lib/utils';

type SortKey =
  | 'employee_name'
  | 'avg_login_time'
  | 'failed_login_count'
  | 'file_modification_count'
  | 'avg_session_duration'
  | 'risk_score';

interface Row extends EmployeeFeatures {
  risk_score: number;
  label: Prediction['label'];
}

const PAGE_SIZE = 12;

const sortConfig: Record<SortKey, { label: string; numeric: boolean }> = {
  employee_name: { label: 'Name', numeric: false },
  avg_login_time: { label: 'Avg Login', numeric: false },
  failed_login_count: { label: 'Failed Logins', numeric: true },
  file_modification_count: { label: 'File Mods', numeric: true },
  avg_session_duration: { label: 'Session (min)', numeric: true },
  risk_score: { label: 'Risk', numeric: true },
};

export function AnalysisPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('risk_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      const [features, preds] = await Promise.all([getAllFeatures(), getAllPredictions()]);
      const predMap = new Map(preds.map((p) => [p.employee_id, p]));
      const merged: Row[] = features.map((f) => {
        const p = predMap.get(f.employee_id);
        return {
          ...f,
          risk_score: p?.risk_score ?? 0,
          label: p?.label ?? 'Normal',
        };
      });
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = out.filter(
        (r) =>
          r.employee_name.toLowerCase().includes(q) ||
          r.employee_id.toLowerCase().includes(q),
      );
    }
    const { numeric } = sortConfig[sortKey];
    out = [...out].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp: number;
      if (numeric) cmp = (av as number) - (bv as number);
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [rows, search, sortKey, sortDir]);

  useEffect(() => setPage(1), [search, sortKey, sortDir]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const anomalousCount = rows.filter((r) => r.label === 'Anomalous').length;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'employee_name' ? 'asc' : 'desc');
    }
  }

  function SortHeader({ k, className }: { k: SortKey; className?: string }) {
    const active = sortKey === k;
    return (
      <button
        onClick={() => toggleSort(k)}
        className={cn(
          'inline-flex items-center gap-1 text-xs uppercase tracking-wide font-medium transition-colors hover:text-foreground',
          active ? 'text-foreground' : 'text-muted-foreground',
          className,
        )}
      >
        {sortConfig[k].label}
        {active ? (
          sortDir === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </button>
    );
  }

  if (loading) return <Loading label="Loading behavior analysis…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Behavior Analysis</h2>
            <p className="text-sm text-muted-foreground">
              {rows.length} employees · {anomalousCount} flagged anomalous
            </p>
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="px-0">
          {paged.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No employees found"
              description={
                search
                  ? 'No employees match your search. Try a different name or ID.'
                  : 'Upload logs to see behavioral analysis results.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-6 py-3 text-left">
                      <SortHeader k="employee_name" />
                    </th>
                    <th className="px-4 py-3 text-left">
                      <SortHeader k="avg_login_time" />
                    </th>
                    <th className="px-4 py-3 text-left">
                      <SortHeader k="failed_login_count" />
                    </th>
                    <th className="px-4 py-3 text-left">
                      <SortHeader k="file_modification_count" />
                    </th>
                    <th className="px-4 py-3 text-left">
                      <SortHeader k="avg_session_duration" />
                    </th>
                    <th className="px-4 py-3 text-left">
                      <SortHeader k="risk_score" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row) => {
                    const anomalous = row.label === 'Anomalous';
                    return (
                      <tr
                        key={row.employee_id}
                        className={cn(
                          'border-b last:border-0 transition-colors hover:bg-muted/40 cursor-pointer',
                          anomalous && 'bg-destructive/5',
                        )}
                        onClick={() => navigate(`/profiles/${row.employee_name}`)}
                      >
                        <td className="px-6 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{row.employee_name}</span>
                            <span className="text-xs text-muted-foreground">{row.employee_id}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {row.avg_login_time}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <span
                            className={cn(
                              row.failed_login_count > 5
                                ? 'text-destructive font-medium'
                                : 'text-muted-foreground',
                            )}
                          >
                            {row.failed_login_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {row.file_modification_count}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {row.avg_session_duration.toFixed(0)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={anomalous ? 'destructive' : 'secondary'}>
                              {anomalous ? 'Anomalous' : 'Normal'}
                            </Badge>
                            <span
                              className={cn(
                                'text-sm font-semibold tabular-nums',
                                anomalous ? 'text-destructive' : 'text-foreground',
                              )}
                            >
                              {Math.round(row.risk_score)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filtered.length > PAGE_SIZE && (
            <div className="px-6">
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
