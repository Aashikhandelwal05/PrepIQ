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
| **Database** | PostgreSQL (Neon) · SQLite for tests |
| **AI** | OpenRouter (free models with graceful mock fallback) |
| **ML / NLP** | spaCy 3.7 (NER), scikit-learn (TF-IDF cosine similarity), TextBlob (sentiment analysis) |
| **Auth** | HMAC-signed bearer tokens, PBKDF2 password hashing |
| **Deployment** | Vercel (frontend) · Render (backend) · Neon (database) |
| **Tooling** | ESLint, Vitest, Playwright, Docker, GitHub Actions |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Python](https://www.python.org/) 3.10+
- [PostgreSQL](https://www.postgresql.org/) 16+ (or use SQLite for local dev)

### 1. Clone

```bash
git clone https://github.com/Aashikhandelwal05/prepiq.git
cd prepiq
```

### 2. Environment setup

```bash
cp .env.example .env
```

Edit `.env` with your values. For local development with SQLite:

```env
DATABASE_URL=sqlite:///./backend/local.db
APP_SECRET=any-long-random-string-only-for-local-dev
```

> ⚠️ **Never commit a real `APP_SECRET`.** It signs all auth tokens — treat it like a password.
>
> Leave `VITE_API_BASE_URL` blank for local development. The Vite dev server proxies `/api` to `localhost:8000` automatically. Only set it when deploying the frontend to a separate host (e.g. Vercel pointing at Render).

### 3. Install dependencies

```bash
# Frontend
npm install

# Backend
pip install -r backend/requirements.txt

# NLP model assets — required for ML features
python -m spacy download en_core_web_sm
python -m textblob.download_corpora
```

> If you skip the NLP step, the app still works — ML features fall back to keyword-only matching and neutral sentiment scores.

### 4. Run locally

```bash
# Terminal 1 — Backend (port 8000)
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2 — Frontend (port 8080)
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

### Docker (optional)

Runs PostgreSQL, backend, and frontend (served via nginx) together:

```bash
docker compose up --build
```

---

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | SQLAlchemy connection string | ✅ |
| `APP_SECRET` | Long random secret for signing auth tokens — **never commit a real value** | ✅ |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | ✅ |
| `ACCESS_TOKEN_TTL_HOURS` | Token expiry in hours (default: `168`) | ❌ |
| `OPENROUTER_API_KEY` | OpenRouter API key — leave blank to use the built-in mock fallback | ❌ |
| `OPENROUTER_MODEL` | Model name (default: `openrouter/free`) | ❌ |
| `OPENROUTER_APP_NAME` | App label shown on your OpenRouter dashboard | ❌ |
| `OPENROUTER_TIMEOUT_SECONDS` | Request timeout in seconds (default: `30`) | ❌ |
| `VITE_API_BASE_URL` | Backend URL for deployed frontend — **leave blank for local dev** | ❌ |

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

## 👥 Contributors

<a href="https://github.com/Aashikhandelwal05/prepiq/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Aashikhandelwal05/prepiq" alt="Contributors" />
</a>

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/Aashikhandelwal05">Aashi Khandelwal</a> and contributors
</p>
