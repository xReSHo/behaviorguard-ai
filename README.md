# BehaviorGuard AI — Behavioral-Based Feature Extraction for Anomaly Detection in Corporate Systems

A full-stack web application that helps security analysts at a financial
institution detect anomalous employee behavior and potential insider threats
by analyzing employee activity logs. The app extracts behavioral features per
employee, runs an Isolation Forest anomaly detection model, and surfaces
flagged employees through a security dashboard.

> Case study implementation: **Behavioral-Based Feature Extraction for
> Anomaly Detection in Corporate Systems**.

---

## Features

- **Analyst login** — single secured account, session-based access.
- **Dashboard** — total employees, total log events, flagged employees,
  average risk score, plus three charts (login activity timeline, risk score
  distribution, daily anomaly count) and a recent activity table.
- **Upload Logs** — drag-and-drop CSV upload with full column validation,
  stored in the database, with automatic feature extraction and model retrain.
- **Behavioral Feature Extraction** — per employee: average login time,
  login frequency, failed login count, average session duration, file access
  count, file modification count, access frequency.
- **Machine Learning** — Isolation Forest (scikit-learn-equivalent algorithm)
  trained automatically after every upload; produces a 0–100 risk score and a
  Normal / Anomalous classification.
- **Behavior Analysis** — searchable, sortable table of every employee with
  red badges for anomalous employees and pagination.
- **Employee Profiles** — per-employee detail with info, behavioral features,
  risk score, prediction result, and full activity history.
- **Settings** — configure Isolation Forest contamination rate, random seed,
  number of estimators; retrain the model on demand; change the analyst
  password.
- **Sample data** — on first launch, 100 employees and 5,000 log events with a
  mix of normal and anomalous behavior are generated automatically so the app
  works immediately.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Charts | Recharts |
| Routing | React Router |
| Database | PGlite (in-browser, IndexedDB-backed SQLite-compatible Postgres) |
| Machine Learning | Custom Isolation Forest implementation (scikit-learn-equivalent) |
| Notifications | Sonner |

The Isolation Forest is implemented in TypeScript and mirrors scikit-learn's
algorithm (random sub-sampling, iTrees, path-length scoring, contamination
thresholding). The database runs entirely in the browser via PGlite, so the
app runs locally with **zero backend configuration** and data persists across
reloads.

## Installation

Requires Node.js 18+.

```bash
npm install
```

## Running locally

```bash
npm run dev
```

Then open the URL printed in the terminal (typically `http://localhost:5173`).


On first launch the app seeds 100 employees and 5,000 log events automatically.
You can upload your own CSV at any time from the **Upload Logs** page.

### Production build

```bash
npm run build
npm run preview
```

## CSV upload format

The uploaded CSV must include the following columns (header row, case-insensitive):

| Column | Description | Example |
| --- | --- | --- |
| `timestamp` | ISO-8601 datetime | `2025-07-01T09:15:00Z` |
| `employee_id` | Unique employee identifier | `EMP0001` |
| `employee_name` | Full name | `Jane Doe` |
| `login_time` | Login time, `HH:MM` (24h) | `09:15` |
| `ip_address` | Source IP | `10.0.0.42` |
| `access_type` | One of: `login`, `logout`, `file_read`, `file_write`, `file_delete`, `database_query`, `admin_action` | `file_write` |
| `file_modified` | Filename or empty | `report_42.xlsx` |
| `session_duration` | Minutes (number ≥ 0) | `240` |
| `login_status` | `success` or `failed` | `success` |

Rows that fail validation are reported individually; valid rows are still
ingested.

## Project structure

```
src/
├── components/            # Reusable UI components
│   ├── ui/                # shadcn/ui primitives
│   ├── AppLayout.tsx      # Sidebar + header shell
│   ├── Sidebar.tsx        # Navigation
│   ├── StatCard.tsx       # Dashboard metric cards
│   ├── RiskBadge.tsx      # Normal/Anomalous badge
│   ├── Pagination.tsx     # Table pagination
│   └── Feedback.tsx       # Loading / empty states
├── pages/                 # Route-level views
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── UploadPage.tsx
│   ├── AnalysisPage.tsx
│   ├── ProfilesPage.tsx
│   ├── ProfilePage.tsx
│   └── SettingsPage.tsx
├── lib/                   # Core logic (API services + ML + DB)
│   ├── types.ts           # Shared domain types
│   ├── db.ts              # PGlite database layer
│   ├── isolation-forest.ts# Isolation Forest implementation
│   ├── analysis.ts        # Feature extraction + training
│   ├── sample-data.ts     # Synthetic data generator
│   ├── csv.ts             # CSV parsing + validation
│   ├── service.ts         # Orchestration service
│   └── auth.ts            # Login / session
├── App.tsx                # Routing + bootstrap
└── main.tsx
```

## How it works

1. **Logs** are stored in the in-browser database (PGlite).
2. **Feature extraction** aggregates each employee's logs into seven behavioral
   features.
3. **Isolation Forest** trains on the feature matrix and scores each employee.
   Scores are normalized to a 0–100 risk score; employees below the
   contamination quantile are labeled anomalous.
4. The **dashboard and analysis pages** read the stored predictions and
   features to render charts and tables.

## Screenshots

<img width="1899" height="902" alt="image" src="https://github.com/user-attachments/assets/cf9ad498-9659-4975-b055-c75977f5df37" />

## Future improvements

- Server-side persistence and multi-analyst accounts.
- Time-windowed anomaly detection (per-week baselines).
- Export of flagged-employee lists to CSV.
- Additional models (Local Outlier Factor, One-Class SVM) for ensemble voting.

## License

Provided as a portfolio project for educational purposes.
