import type { LogEvent } from './types';
import { REQUIRED_COLUMNS } from './types';

export interface CsvParseResult {
  events: LogEvent[];
  errors: string[];
}

// Minimal CSV parser that handles quoted fields and commas inside quotes.
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseLogCsv(text: string): CsvParseResult {
  const errors: string[] = [];
  const events: LogEvent[] = [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { events, errors: ['The file is empty.'] };
  }

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    return {
      events,
      errors: [`Missing required columns: ${missing.join(', ')}`],
    };
  }

  const idx = Object.fromEntries(header.map((h, i) => [h, i])) as Record<string, number>;
  const validAccessTypes = new Set([
    'login',
    'logout',
    'file_read',
    'file_write',
    'file_delete',
    'database_query',
    'admin_action',
  ]);

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.length < header.length) {
      errors.push(`Row ${i + 1}: has fewer columns than expected.`);
      continue;
    }

    const timestamp = row[idx.timestamp];
    const employeeId = row[idx.employee_id];
    const employeeName = row[idx.employee_name];
    const loginTime = row[idx.login_time];
    const ipAddress = row[idx.ip_address];
    const accessType = row[idx.access_type];
    const fileModified = row[idx.file_modified] ?? '';
    const sessionDuration = Number(row[idx.session_duration]);
    const loginStatus = (row[idx.login_status] ?? '').toLowerCase();

    if (!timestamp || isNaN(Date.parse(timestamp))) {
      errors.push(`Row ${i + 1}: invalid timestamp "${timestamp}".`);
      continue;
    }
    if (!employeeId || !employeeName) {
      errors.push(`Row ${i + 1}: missing employee id or name.`);
      continue;
    }
    if (!/^\d{1,2}:\d{2}$/.test(loginTime)) {
      errors.push(`Row ${i + 1}: invalid login_time "${loginTime}" (expected HH:MM).`);
      continue;
    }
    if (!accessType || !validAccessTypes.has(accessType.toLowerCase())) {
      errors.push(`Row ${i + 1}: invalid access_type "${accessType}".`);
      continue;
    }
    if (isNaN(sessionDuration) || sessionDuration < 0) {
      errors.push(`Row ${i + 1}: invalid session_duration "${row[idx.session_duration]}".`);
      continue;
    }
    if (loginStatus !== 'success' && loginStatus !== 'failed') {
      errors.push(`Row ${i + 1}: invalid login_status "${loginStatus}" (expected success/failed).`);
      continue;
    }

    events.push({
      id: 0, // assigned by DB
      timestamp: new Date(timestamp).toISOString(),
      employee_id: employeeId,
      employee_name: employeeName,
      login_time: loginTime,
      ip_address: ipAddress,
      access_type: accessType.toLowerCase(),
      file_modified: fileModified,
      session_duration: sessionDuration,
      login_status: loginStatus as 'success' | 'failed',
    });
  }

  return { events, errors };
}
