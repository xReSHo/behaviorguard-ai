import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileUp,
  ListChecks,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ingestLogs } from '@/lib/service';
import { parseLogCsv } from '@/lib/csv';
import { REQUIRED_COLUMNS } from '@/lib/types';
import { cn } from '@/lib/utils';

export function UploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedCount, setParsedCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [ingesting, setIngesting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lastUploaded, setLastUploaded] = useState<{ name: string; count: number } | null>(null);

  async function handleFile(file: File): Promise<void> {
    setFileName(file.name);
    setErrors([]);
    setParsedCount(0);
    setLastUploaded(null);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrors(['Please upload a .csv file.']);
      return;
    }

    const text = await file.text();
    const { events, errors: parseErrors } = parseLogCsv(text);
    setParsedCount(events.length);
    setErrors(parseErrors);

    if (events.length === 0) {
      toast.error('No valid log rows found in the file.');
      return;
    }

    setIngesting(true);
    try {
      await ingestLogs(events);
      setLastUploaded({ name: file.name, count: events.length });
      toast.success(
        `Uploaded ${events.length} log events`,
        events.length > 0 ? { description: 'Features extracted and model retrained.' } : undefined,
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to store logs', { description: 'Please try again.' });
    } finally {
      setIngesting(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileUp className="h-4 w-4 text-primary" />
              Upload Employee Logs
            </CardTitle>
            <CardDescription>
              Upload a CSV file of employee activity logs. Features will be extracted and the model
              retrained automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-muted/30 hover:bg-muted/60',
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UploadCloud className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Drag and drop a CSV file here
                </p>
                <p className="text-xs text-muted-foreground">or click to browse</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={onInputChange}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={ingesting}
              >
                {ingesting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  'Select CSV file'
                )}
              </Button>
            </div>

            {fileName && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {parsedCount > 0
                      ? `${parsedCount} valid row${parsedCount === 1 ? '' : 's'} parsed`
                      : 'No valid rows'}
                    {errors.length > 0 && ` · ${errors.length} error${errors.length === 1 ? '' : 's'}`}
                  </p>
                </div>
                {lastUploaded?.name === fileName && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    Stored
                  </Badge>
                )}
              </div>
            )}

            {errors.length > 0 && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {errors.length} validation issue{errors.length === 1 ? '' : 's'}
                </div>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-destructive/90">
                  {errors.slice(0, 50).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {lastUploaded && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={() => navigate('/analysis')}>
                  <ListChecks className="h-4 w-4" />
                  View analysis
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Back to dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required CSV Format</CardTitle>
            <CardDescription>Your file must include these columns:</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {REQUIRED_COLUMNS.map((col) => (
                <li key={col} className="flex items-center gap-2 text-sm">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                    {col}
                  </code>
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Notes</p>
              <ul className="mt-1.5 space-y-1">
                <li>· <code className="font-mono">timestamp</code> must be ISO-8601.</li>
                <li>· <code className="font-mono">login_time</code> is HH:MM (24h).</li>
                <li>· <code className="font-mono">access_type</code> is one of login, logout,
                  file_read, file_write, file_delete, database_query, admin_action.</li>
                <li>· <code className="font-mono">login_status</code> is success or failed.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
