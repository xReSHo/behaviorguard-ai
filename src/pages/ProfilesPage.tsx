import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/Pagination';
import { Loading, EmptyState } from '@/components/Feedback';
import { getAllFeatures, getAllPredictions } from '@/lib/db';
import type { EmployeeFeatures, Prediction } from '@/lib/types';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;

export function ProfilesPage() {
  const [rows, setRows] = useState<(EmployeeFeatures & { risk_score: number; label: Prediction['label'] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      const [features, preds] = await Promise.all([getAllFeatures(), getAllPredictions()]);
      const predMap = new Map(preds.map((p) => [p.employee_id, p]));
      const merged = features.map((f) => ({
        ...f,
        risk_score: predMap.get(f.employee_id)?.risk_score ?? 0,
        label: predMap.get(f.employee_id)?.label ?? 'Normal',
      }));
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loading label="Loading employee profiles…" />;

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.employee_name.toLowerCase().includes(q) || r.employee_id.toLowerCase().includes(q),
      )
    : rows;
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Employee Profiles</h2>
            <p className="text-sm text-muted-foreground">{rows.length} employees</p>
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {paged.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Users}
              title="No employees found"
              description={search ? 'Try a different search term.' : 'Upload logs to populate profiles.'}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map((r) => {
            const anomalous = r.label === 'Anomalous';
            return (
              <Link
                key={r.employee_id}
                to={`/profiles/${encodeURIComponent(r.employee_name)}`}
                className="block"
              >
                <Card
                  className={cn(
                    'h-full transition-all hover:-translate-y-0.5 hover:shadow-md',
                    anomalous && 'border-destructive/40',
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{r.employee_name}</p>
                        <p className="text-xs text-muted-foreground">{r.employee_id}</p>
                      </div>
                      <Badge variant={anomalous ? 'destructive' : 'secondary'}>
                        {anomalous ? 'Anomalous' : 'Normal'}
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Avg login</p>
                        <p className="font-medium text-foreground">{r.avg_login_time}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Failed logins</p>
                        <p className="font-medium text-foreground">{r.failed_login_count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">File mods</p>
                        <p className="font-medium text-foreground">{r.file_modification_count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Risk score</p>
                        <p
                          className={cn(
                            'font-semibold tabular-nums',
                            anomalous ? 'text-destructive' : 'text-foreground',
                          )}
                        >
                          {Math.round(r.risk_score)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-end text-xs font-medium text-primary">
                      View profile
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {filtered.length > PAGE_SIZE && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
