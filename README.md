# 🛡️ BehaviorGuard AI

> **Behavioral-Based Feature Extraction for Anomaly Detection in Corporate Systems**

BehaviorGuard AI is an enterprise-grade full-stack WebAssembly application designed for security analysts and SOC teams. It detects anomalous employee behavior and potential insider threats by aggregating raw activity logs into multidimensional behavioral features and running an isolated anomaly detection model locally in the browser.

---

## 🌟 Features

- **Executive Security Dashboard**: High-level telemetry including total employee count, aggregate event logs, flagged risk profiles, average risk scores, login activity timelines, and real-time anomaly distribution charts.
- **Log Ingestion & Parsing**: Drag-and-drop CSV upload with strict client-side validation schema, database persistence, automated feature pipeline extraction, and trigger-based model retraining.
- **Behavioral Feature Extraction**: Computes per-employee vectors across seven key parameters:
  - Average login time & frequency
  - Failed authentication attempts
  - Session durations
  - File access & modification rates
  - Resource query frequencies
- **Machine Learning Engine**: Pure TypeScript implementation of an Isolation Forest algorithm (scikit-learn equivalent) producing normalized 0–100 risk scores and binary *Normal / Anomalous* classifications.
- **Deep-Dive Employee Profiling**: Searchable and paginated telemetry tables with detailed activity logs, feature breakdowns, historical trends, and risk assessment metrics.
- **Granular Controls & Calibration**: Configurable model parameters (contamination rate, estimator count, random seed), on-demand manual retraining, and analyst session management.
- **Zero-Backend Seeding**: Automatically generates a synthetic baseline dataset (100 employees, 5,000+ activity logs) on first launch for immediate localized demo deployment.

---

## 🏗️ Technology Stack

BehaviorGuard AI runs entirely client-side using embedded WebAssembly database technology, ensuring high data privacy, zero server deployment costs, and persistence across reloads.

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18, TypeScript, Vite |
| **Styling & UI** | Tailwind CSS, shadcn/ui, Lucide Icons |
| **Data Visualization** | Recharts |
| **Routing** | React Router |
| **Storage & Database** | PGlite (In-browser WebAssembly Postgres backed by IndexedDB) |
| **Machine Learning Engine** | Custom Isolation Forest implementation (TypeScript, scikit-learn equivalent) |
| **Notifications** | Sonner |

---

## 🚀 Installation

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

## 📄 CSV upload format

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

## 📁 Project structure

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

## ⚙️ How it works

1. **Logs** are stored in the in-browser database (PGlite).
2. **Feature extraction** aggregates each employee's logs into seven behavioral
   features.
3. **Isolation Forest** trains on the feature matrix and scores each employee.
   Scores are normalized to a 0–100 risk score; employees below the
   contamination quantile are labeled anomalous.
4. The **dashboard and analysis pages** read the stored predictions and
   features to render charts and tables.

## 📸 Application Preview

<div align="center">

### Core Dashboard & Analytics Overview

| Executive Security Dashboard | Behavioral Anomaly Analysis |
| :---: | :---: |
| <img src="https://github.com/user-attachments/assets/cf9ad498-9659-4975-b055-c75977f5df37" width="100%" alt="BehaviorGuard AI Security Dashboard" /> | <img src="https://github.com/user-attachments/assets/8ea19c64-e220-4cbe-b048-c28dd8dbd592" width="100%" alt="Behavioral Feature Extraction & Analysis" /> |
| *Real-time metrics, risk distribution, and login timeline* | *Searchable employee threat table & risk classification* |

<br />

### Logs Ingestion & Model Calibration

| Client-Side CSV Upload & Validation | Model Hyperparameters & Settings |
| :---: | :---: |
| <img src="https://github.com/user-attachments/assets/01d86377-17f1-4fbe-808e-a7dde85ec2d1" width="100%" alt="Drag-and-Drop Log Upload Routine" /> | <img src="https://github.com/user-attachments/assets/7d58f249-09df-4bec-be1b-a29ab836a4ed" width="100%" alt="Isolation Forest Engine Settings" /> |
| *Drag-and-drop CSV validation & instant pipeline ingestion* | *Isolation Forest threshold calibration & manual retrain* |

</div>

<details>
<summary><b>🔍 View High-Resolution Screenshots & Details</b></summary>

<br />

#### 1. Security Overview Dashboard
Monitors aggregate platform metrics, calculates active anomaly percentages, and renders real-time login timelines alongside daily threat volume charts.
![BehaviorGuard AI Dashboard Direct](https://github.com/user-attachments/assets/cf9ad498-9659-4975-b055-c75977f5df37)

---

#### 2. Deep Anomaly Analysis
Presents extracted behavioral parameters (login frequencies, access counts, risk scores) in an interactive, searchable table format for security analysts.
![BehaviorGuard AI Behavioral Analysis Direct](https://github.com/user-attachments/assets/8ea19c64-e220-4cbe-b048-c28dd8dbd592)

---

#### 3. Data Ingestion Pipeline
Validates client-side CSV files against pre-defined schema constraints and streams rows straight to the localized PGlite database instance.
![BehaviorGuard AI CSV Upload Direct](https://github.com/user-attachments/assets/01d86377-17f1-4fbe-808e-a7dde85ec2d1)

---

#### 4. Model Calibration Controls
Allows fine-tuning of the machine learning model parameters, including contamination factors, estimator trees, and seed configurations.
![BehaviorGuard AI Settings Direct](https://github.com/user-attachments/assets/7d58f249-09df-4bec-be1b-a29ab836a4ed)

</details>

---


## 🔮 Future improvements

- Server-side persistence and multi-analyst accounts.
- Time-windowed anomaly detection (per-week baselines).
- Export of flagged-employee lists to CSV.
- Additional models (Local Outlier Factor, One-Class SVM) for ensemble voting.

## 📜 License

Provided as an open-source security portfolio project under the MIT License.
