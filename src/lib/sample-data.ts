import type { LogEvent } from './types';

// Deterministic PRNG so the synthetic dataset is reproducible per seed.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Margaret', 'Anthony', 'Sandra', 'Mark', 'Ashley', 'Donald', 'Kimberly',
  'Steven', 'Emily', 'Paul', 'Donna', 'Andrew', 'Michelle', 'Joshua', 'Carol',
  'Kenneth', 'Amanda', 'Kevin', 'Dorothy', 'Brian', 'Melissa', 'George', 'Deborah',
  'Edward', 'Stephanie', 'Ronald', 'Rebecca', 'Timothy', 'Sharon', 'Jason', 'Laura',
  'Jeffrey', 'Cynthia', 'Ryan', 'Kathleen', 'Jacob', 'Amy', 'Gary', 'Shirley',
  'Nicholas', 'Angela', 'Eric', 'Helen', 'Jonathan', 'Anna', 'Stephen', 'Brenda',
  'Larry', 'Pamela', 'Justin', 'Nicole', 'Scott', 'Emma', 'Brandon', 'Samantha',
  'Benjamin', 'Katherine', 'Samuel', 'Christine', 'Gregory', 'Debra', 'Frank', 'Rachel',
  'Alexander', 'Catherine', 'Raymond', 'Carolyn', 'Patrick', 'Janet', 'Jack', 'Ruth',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts',
];

const DEPARTMENTS = ['Finance', 'Trading', 'Compliance', 'IT', 'Operations', 'Audit', 'Risk'];

const ACCESS_TYPES = [
  'login',
  'logout',
  'file_read',
  'file_write',
  'file_delete',
  'database_query',
  'admin_action',
];

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}

function randomIp(rng: () => number): string {
  return `10.${Math.floor(rng() * 256)}.${Math.floor(rng() * 256)}.${Math.floor(rng() * 256)}`;
}

export function generateSampleLogs(
  employeeCount = 100,
  eventsPerEmployee = 50,
  seed = 42,
): LogEvent[] {
  const rng = mulberry32(seed);
  const events: LogEvent[] = [];
  let id = 1;

  // Pre-generate employee roster with a "behavioral profile" so anomalies are
  // coherent rather than random noise.
  interface Profile {
    id: string;
    name: string;
    department: string;
    anomalous: boolean;
    baseLoginHour: number; // mean login hour
    baseSession: number; // mean session minutes
    failRate: number;
    modRate: number; // probability a file event is a modification
    offHoursRate: number; // probability of off-hours login
  }

  const profiles: Profile[] = [];
  for (let i = 0; i < employeeCount; i++) {
    const name = `${pick(FIRST_NAMES, rng)} ${pick(LAST_NAMES, rng)}`;
    // ~10% anomalous employees
    const anomalous = rng() < 0.1;
    profiles.push({
      id: `EMP${pad(i + 1, 4)}`,
      name,
      department: pick(DEPARTMENTS, rng),
      anomalous,
      baseLoginHour: anomalous ? 23 : 8 + Math.floor(rng() * 2),
      baseSession: anomalous ? 20 + rng() * 30 : 240 + rng() * 180,
      failRate: anomalous ? 0.25 + rng() * 0.3 : 0.02 + rng() * 0.05,
      modRate: anomalous ? 0.5 + rng() * 0.4 : 0.05 + rng() * 0.1,
      offHoursRate: anomalous ? 0.4 + rng() * 0.3 : 0.02 + rng() * 0.03,
    });
  }

  const now = new Date();
  for (const p of profiles) {
    for (let e = 0; e < eventsPerEmployee; e++) {
      // Timestamp within the last 30 days.
      const dayOffset = Math.floor(rng() * 30);
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);

      const offHours = rng() < p.offHoursRate;
      const hour = offHours
        ? Math.floor(rng() * 5) + 22 // 22:00 - 02:00
        : p.baseLoginHour + Math.floor(rng() * 2);
      const minute = Math.floor(rng() * 60);
      const hh = pad(((hour % 24) + 24) % 24);
      const mm = pad(minute);
      const loginTime = `${hh}:${mm}`;

      date.setHours(hour % 24, minute, Math.floor(rng() * 60), 0);
      const timestamp = date.toISOString();

      const accessType = pick(ACCESS_TYPES, rng);
      const failed = accessType === 'login' && rng() < p.failRate;
      const sessionDuration =
        accessType === 'login' || accessType === 'logout'
          ? Math.round(p.baseSession * (0.5 + rng()))
          : 0;

      let fileModified = '';
      if (accessType === 'file_write' || accessType === 'file_delete') {
        fileModified = `report_${Math.floor(rng() * 1000)}.xlsx`;
      } else if (accessType === 'file_read') {
        fileModified = '';
      }

      events.push({
        id: id++,
        timestamp,
        employee_id: p.id,
        employee_name: p.name,
        login_time: loginTime,
        ip_address: randomIp(rng),
        access_type: accessType,
        file_modified: fileModified,
        session_duration: sessionDuration,
        login_status: failed ? 'failed' : 'success',
      });
    }
  }

  // Sort by timestamp for a clean log.
  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  // Re-assign ids in chronological order.
  events.forEach((ev, i) => (ev.id = i + 1));
  return events;
}
