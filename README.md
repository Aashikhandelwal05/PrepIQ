<p align="center">
  <img src="https://img.icons8.com/fluency/96/artificial-intelligence.png" alt="PrepIQ Logo" width="80" />
</p>

<h1 align="center">PrepIQ</h1>

<p align="center">
  <strong>Your AI-powered interview preparation workspace</strong>
</p>

<p align="center">
  <a href="https://prepiqfrontend.vercel.app"><img src="https://img.shields.io/badge/Live_Demo-Vercel-000?logo=vercel&logoColor=white" alt="Live Demo" /></a>
  <a href="https://prepiq-backend-c79d.onrender.com/api/health"><img src="https://img.shields.io/badge/API-Render-46E3B7?logo=render&logoColor=white" alt="API Status" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen.svg" alt="PRs Welcome" />
  <img src="https://img.shields.io/github/issues/Aashikhandelwal05/prepiq?color=0088ff" alt="Open Issues" />
</p>

---

## Table of Contents

- [Live Links](#-live-links)
- [About](#-about)
  - [Key Features](#-key-features)
- [Preview](#-preview)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#-prerequisites)
  - [Clone](#1-clone)
  - [Environment Setup](#2-environment-setup)
  - [Install Dependencies](#3-install-dependencies)
  - [Run Locally](#4-run-locally)
  - [How the API Proxy Works](#how-the-api-proxy-works)
- [Environment Variables](#-environment-variables)
- [API Endpoints](#-api-endpoints)
  - [Auth](#auth)
  - [Profile](#profile)
  - [Interview Prep](#interview-prep)
  - [Mock Interviews](#mock-interviews)
  - [Job Tracker](#job-tracker)
  - [ML / NLP](#ml--nlp)
  - [System](#system)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [Deployment](#-deployment)
- [Roadmap](#%EF%B8%8F-roadmap)
- [License](#license)

---

## 🌐 Live Links

| Service | URL |
|---------|-----|
| **Frontend** | [prepiqfrontend.vercel.app](https://prepiqfrontend.vercel.app) |
| **Backend API** | [prepiq-backend-c79d.onrender.com](https://prepiq-backend-c79d.onrender.com) |
| **API Docs** | [/docs](https://prepiq-backend-c79d.onrender.com/docs) |
| **Health Check** | [/api/health](https://prepiq-backend-c79d.onrender.com/api/health) |
| **Database** | Neon Postgres (managed) |

> **Note:** The backend runs on Render's free tier and may take ~30 seconds to wake up on first request after inactivity.

---

## 📖 About

PrepIQ is a full-stack interview preparation platform that combines career profiling, AI-assisted prep plans, mock interviews with scoring, job application tracking, and progress analytics — all in one workspace.

### Key Features

- **Account Management** — Signup, login, and persistent sessions with secure token auth
- **Career DNA Profiling** — Multi-step onboarding to capture skills, experience, and goals
- **AI Interview Prep** — Auto-generated gap analysis, question banks, and study roadmaps via OpenRouter
- **Mock Interviews** — Practice with AI-scored answers, feedback, and model responses
- **Job Application Tracker** — Kanban and table views with status, contacts, and next actions
- **Progress Dashboard** — Visual analytics for prep sessions, scores, and activity trends
- **Local ML/NLP** — spaCy NER skill extraction, TF-IDF resume–JD matching, TextBlob confidence scoring — all without an API key

---

## 🖼️ Preview

<p align="center">
  <img src="./docs/dashboard-preview.png" alt="PrepIQ Dashboard" width="700" />
</p>

<p align="center"><em>Dashboard — personalized welcome, stats overview, and quick actions</em></p>

<p align="center">
  <img src="./docs/login-preview.png" alt="PrepIQ Login" width="700" />
</p>

<p align="center"><em>Login — clean dark-themed authentication interface</em></p>

---

## ⚙️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI, Framer Motion, Recharts |
| **Backend** | FastAPI, SQLAlchemy, Pydantic v2, Uvicorn |
| **Database** | PostgreSQL (Neon) · SQLite for local dev and tests |
| **AI** | OpenRouter (free models with graceful mock fallback) |
| **ML / NLP** | spaCy 3.7 (NER), scikit-learn (TF-IDF cosine similarity), TextBlob (sentiment analysis) |
| **Auth** | HMAC-signed bearer tokens, PBKDF2 password hashing |
| **Deployment** | Vercel (frontend) · Render (backend) · Neon (database) |
| **Tooling** | ESLint, Vitest, Playwright, Docker, GitHub Actions |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Python](https://www.python.org/) 3.10-3.12 recommended
- [PostgreSQL](https://www.postgresql.org/) 16+ for Docker/production, or SQLite for simple local development

> The backend Docker image uses Python 3.10, and CI currently verifies Python 3.10 and 3.11.
> Newer Python versions may not have compatible wheels for the pinned ML/NLP dependencies.

### 1. Clone

```bash
git clone https://github.com/Aashikhandelwal05/prepiq.git
cd prepiq
```

### 2. Environment setup

Copy the example environment file:

```bash
# macOS/Linux
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

Open `.env` and update the values for your local setup.

For simple manual local development, use SQLite instead of the Docker-oriented PostgreSQL default:

```env
DATABASE_URL=sqlite:///./backend/local.db
APP_SECRET=any-long-random-string-only-for-local-dev
CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
```

> ⚠️ Never commit a real `APP_SECRET`.
> It signs authentication tokens, so treat it like a password.

For local frontend development, keep `VITE_API_BASE_URL` blank:

```env
VITE_API_BASE_URL=
```

The Vite dev server automatically proxies `/api` requests to `localhost:8000`.

Only set `VITE_API_BASE_URL` when the frontend is deployed separately, such as a Vercel frontend pointing to a Render backend URL.

### 3. Install dependencies

```bash
# Frontend
npm install
```

Create and activate a Python virtual environment before installing backend dependencies:

```bash
# macOS/Linux
python -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt

# NLP model assets — required for ML features
python -m spacy download en_core_web_sm
python -m textblob.download_corpora
```

```powershell
# Windows PowerShell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt

# NLP model assets — required for ML features
python -m spacy download en_core_web_sm
python -m textblob.download_corpora
```

If you use Python 3.10 or 3.12 instead, replace `3.11` with your installed supported version.

> If you skip the NLP step, the app still works — ML features fall back to keyword-only matching and neutral sentiment scores.

### 4. Run locally

Run the backend from the activated virtual environment:

```bash
# Terminal 1 — Backend (port 8000)
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Run the frontend in a separate terminal:

```bash
# Terminal 2 — Frontend (port 8080)
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

### How the API proxy works

When we run both servers locally, we have **two processes running on different ports**:

| Process | Command | Port |
|---------|---------|------|
| Frontend (Vite dev server) | `npm run dev` | `8080` |
| Backend (FastAPI / Uvicorn) | `python -m uvicorn ...` | `8000` |

Normally, browsers block JavaScript from making requests to a different port — a browser security rule called **CORS**. Vite solves this with a built-in **reverse proxy**: one can think of it like a silent traffic redirector sitting inside the dev server. One does not need to install or configure anything extra — it is already set up.

The proxy rule lives in `vite.config.ts`:

```ts
proxy: {
  "/api": {
    target: "http://127.0.0.1:8000",
    changeOrigin: true,
  },
},
```

Any request the React code makes to a path starting with `/api` is **automatically forwarded** by Vite to `http://127.0.0.1:8000`. FastAPI receives it as a normal request — it never knows that the browser was on a different port.

```
Browser (localhost:8080)
  │
  │  fetch("/api/auth/me")          ← relative URL, no hostname
  ▼
Vite dev server  (port 8080)
  │
  │  proxy rule: /api → 127.0.0.1:8000
  ▼
FastAPI          (port 8000)       ← receives and handles the request
```

> **Why `VITE_API_BASE_URL` must be blank for local development**
>
> The fetch wrapper in `src/lib/api.ts` prepends `VITE_API_BASE_URL` to every API call before sending it.
>
> - When it is **blank**, the URL stays relative: `/api/auth/me`
>   The browser hands it to Vite → Vite proxies it → FastAPI on port 8000 handles it. ✅
>
> - When it is **set** to `http://127.0.0.1:8000`, the URL becomes absolute: `http://127.0.0.1:8000/api/auth/me`
>   The browser sends it directly, completely bypassing Vite's proxy. The browser's CORS rules then block it, and every API call fails with a network error. ❌
>
> **Bottom line: leave `VITE_API_BASE_URL` completely empty in one's `.env` for local development.**

#### In production (Vercel → Render)

When we deploy, there is no Vite dev server running — only a pre-built bundle of static files served by a CDN. At **build time**, Vite permanently replaces every reference to `import.meta.env.VITE_API_BASE_URL` in the code with the actual value we provided. This means every API call in the deployed app becomes an absolute URL that the browser sends directly to the hosted backend, with no proxy involved:

```
Browser (prepiqfrontend.vercel.app)
  │
  │  fetch("https://prepiq-backend-c79d.onrender.com/api/auth/me")
  │          ↑ full URL baked in at build time from VITE_API_BASE_URL
  ▼
Render — FastAPI                   ← browser calls it directly, no proxy
```

Set `VITE_API_BASE_URL` in the hosting provider's environment variables (Vercel → Project Settings → Environment Variables) to the full Render backend URL. **Do not add a trailing slash.**

```
VITE_API_BASE_URL=https://prepiq-backend-c79d.onrender.com
```

> **Note:** Because `VITE_API_BASE_URL` is substituted at build time (not runtime), one must trigger a new Vercel deployment after changing it for the new value to take effect.

#### Quick reference

| Scenario | `VITE_API_BASE_URL` value | How requests reach FastAPI |
|----------|--------------------------|----------------------------|
| Local development | *(leave blank)* | Vite proxy: port 8080 → port 8000 |
| Deployed to Vercel | `https://prepiq-backend-c79d.onrender.com` | Browser → Render directly |
| Custom deployment | `https://api.yourdomain.com` | Browser → one's backend directly |

### Docker (optional)

Runs PostgreSQL, backend, and frontend (served via nginx) together:

```bash
docker compose up --build
```

---

## 🔑 Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | Database connection string used by the backend. Use PostgreSQL for Docker/production or SQLite for simple local development. | ✅ |
| `APP_SECRET` | Long random secret used for signing authentication tokens. Never commit a real value. | ✅ |
| `CORS_ORIGINS` | Comma-separated list of frontend URLs allowed to access the backend API. | ✅ |
| `ACCESS_TOKEN_TTL_HOURS` | Token expiry time in hours. Default value is `168`. | ❌ |
| `OPENROUTER_API_KEY` | OpenRouter API key. Leave blank to use the built-in mock fallback. | ❌ |
| `OPENROUTER_MODEL` | OpenRouter model name. Default value is `nvidia/nemotron-3-super-120b-a12b:free`. | ❌ |
| `OPENROUTER_APP_URL` | App URL sent to OpenRouter. | ❌ |
| `OPENROUTER_APP_NAME` | App name shown in OpenRouter. | ❌ |
| `OPENROUTER_TIMEOUT_SECONDS` | OpenRouter request timeout in seconds. Default value is `30`. | ❌ |
| `VITE_API_BASE_URL` | Backend API URL for deployed frontend builds. Leave blank for local development. | ❌ |
---

## 📡 API Endpoints

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Create a new account |
| `POST` | `/api/auth/login` | Login with email & password |
| `GET` | `/api/auth/me` | Get current user from token |

### Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/{id}/profile` | Get career DNA profile |
| `PUT` | `/api/users/{id}/profile` | Save/update profile |

### Interview Prep

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/{id}/sessions` | List all prep sessions |
| `GET` | `/api/users/{id}/sessions/{sid}` | Get session details |
| `POST` | `/api/users/{id}/sessions` | Create new AI prep session |
| `DELETE` | `/api/users/{id}/sessions/{sid}` | Delete a prep session |

### Mock Interviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/{id}/mocks` | List all mock attempts |
| `POST` | `/api/users/{id}/mocks` | Submit answer for AI scoring |

### Job Tracker

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/{id}/jobs` | List all job applications |
| `POST` | `/api/users/{id}/jobs` | Add a new application |
| `PATCH` | `/api/users/{id}/jobs/{jid}` | Update application details |
| `DELETE` | `/api/users/{id}/jobs/{jid}` | Delete an application |

### ML / NLP

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ml/extract-skills` | Extract skills from text using spaCy NER + keyword matching |
| `POST` | `/api/ml/match-score` | TF-IDF cosine similarity score between resume and job description |
| `POST` | `/api/ml/analyze-confidence` | TextBlob sentiment, specificity, and word count analysis |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |

> Full interactive API docs: [`/docs`](https://prepiq-backend-c79d.onrender.com/docs)

---

## 📁 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app — models, routes, AI logic
│   │   └── ml.py                # Local ML module: spaCy NER, TF-IDF, TextBlob
│   ├── tests/
│   │   └── test_api.py          # Backend API smoke tests
│   └── requirements.txt         # Python dependencies
│
├── src/
│   ├── components/
│   │   ├── ui/                  # 49 shadcn/ui components
│   │   ├── AppLayout.tsx        # Main layout shell
│   │   ├── AppSidebar.tsx       # Navigation sidebar
│   │   └── ScoreCircle.tsx      # Animated SVG score display
│   ├── pages/
│   │   ├── AuthPage.tsx         # Login / Signup
│   │   ├── DashboardPage.tsx    # Main dashboard with stats
│   │   ├── OnboardingPage.tsx   # Career DNA multi-step wizard
│   │   ├── InterviewPrepPage.tsx# AI prep session view
│   │   ├── MockInterviewPage.tsx# Mock interview + ML confidence analysis
│   │   ├── JobTrackerPage.tsx   # Kanban & table job tracker
│   │   ├── ProgressPage.tsx     # Analytics & progress charts
│   │   └── CareerDNAPage.tsx    # Profile viewer/editor
│   ├── lib/
│   │   ├── api.ts               # Fetch wrapper with auth token injection
│   │   ├── store.ts             # Global state and data-fetching hooks
│   │   └── utils.ts             # cn() and other utilities
│   └── hooks/                   # use-toast, use-mobile
│
├── docs/                        # Screenshots and open-source docs
├── Dockerfile.backend           # Backend Docker image
├── Dockerfile.frontend          # Frontend Docker image (nginx)
├── docker-compose.yml           # Full-stack local setup
├── vercel.json                  # Vercel SPA routing config
├── vite.config.ts               # Vite build + API proxy config
└── package.json                 # Frontend deps & scripts
```

---

## 🤝 Contributing

Contributions are welcome — bug fixes, features, docs improvements, and tests all count.

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide
2. Browse [open issues](https://github.com/Aashikhandelwal05/prepiq/issues) — look for `good first issue` and `help wanted` labels
3. Comment on an issue before starting so it can be assigned to you

### Validate before opening a PR

```bash
# Frontend
npm run lint && npm test && npm run build

# Backend
python -m compileall backend
python -m unittest discover -s backend/tests -p "test_*.py"
```

---

## 🚢 Deployment

| Service | Platform | Purpose |
|---------|----------|---------|
| Frontend | [Vercel](https://vercel.com) | Static React build served via nginx |
| Backend | [Render](https://render.com) | Dockerized FastAPI |
| Database | [Neon](https://neon.tech) | Managed PostgreSQL |

### Steps

1. **Neon** — Create a free project, copy the connection string
2. **Render** — New Web Service → Docker → `Dockerfile.backend` → set env vars
3. **Vercel** — Import repo → Vite preset → set `VITE_API_BASE_URL` to your Render URL
4. **CORS** — Update `CORS_ORIGINS` on Render with your Vercel domain

---

## 🗺️ Roadmap

- [ ] Resume upload and PDF parsing
- [ ] Multiple AI model selection in the UI
- [ ] Interview session sharing and collaboration
- [ ] Email notifications for job application updates
- [ ] Mobile-responsive PWA support
- [ ] Migrate data fetching to TanStack Query (already installed)
- [ ] End-to-end Playwright tests for auth and dashboard flows

Want to pick something up? Open an issue or comment on an existing one.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/Aashikhandelwal05">Aashi Khandelwal</a> and contributors
</p>
