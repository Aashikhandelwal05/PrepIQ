# PrepIQ

[![CI](https://github.com/your-org/prepiq/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/prepiq/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

PrepIQ is an open-source interview preparation workspace for students and early-career professionals. It combines profile onboarding, interview prep plan generation, mock interview feedback, progress tracking, and job application management in one full-stack project.

## Why this project exists

Candidates usually split preparation across notes apps, spreadsheets, trackers, and mock interview tools. PrepIQ brings those workflows into one product so contributors can work on a practical codebase with frontend, backend, documentation, testing, and DevOps tasks.

## Demo

- Local frontend: `http://localhost:8080`
- Local backend: `http://localhost:8000`
- API health check: `http://localhost:8000/api/health`
- Demo screenshots/video: maintainer input required before publishing

## Recommended deployment stack

- Frontend: Vercel
- Backend: Koyeb
- Database: Neon Postgres

This repo is prepared for that setup:

- [vercel.json](./vercel.json) adds an SPA rewrite so React Router routes work on Vercel refreshes and deep links
- [Dockerfile.backend](./Dockerfile.backend) now binds to Koyeb's `PORT` environment variable
- `.env.example` defaults OpenRouter to `openrouter/free`

## Features

- Account signup, login, and session persistence
- Career DNA onboarding profile
- AI-assisted interview prep sessions with fallback mock generation
- Mock interview answer scoring and feedback
- Job application tracking with editable details
- Progress dashboard for prep activity and scores

## Tech stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI, Framer Motion, Recharts
- Backend: FastAPI, SQLAlchemy
- Database: PostgreSQL in Docker, SQLite for automated smoke tests
- Auth: HMAC-signed bearer tokens with PBKDF2 password hashing
- Tooling: ESLint, Vitest, Docker, Docker Compose, GitHub Actions

## Project structure

```text
.
├── backend/
│   ├── app/main.py            # FastAPI app, models, schemas, routes
│   ├── requirements.txt       # Python dependencies
│   └── tests/test_api.py      # Backend smoke tests
├── docs/open-source/
│   ├── ISSUE_BACKLOG.md       # Suggested issues for contributors
│   ├── LABELS.md              # Recommended GitHub labels
│   └── ROADMAP.md             # High-level roadmap
├── src/
│   ├── components/            # App shell and reusable UI
│   ├── lib/                   # API helpers, state hooks, utilities
│   ├── pages/                 # Route-level pages
│   └── test/                  # Frontend test setup
├── .github/
│   ├── ISSUE_TEMPLATE/        # Bug and feature templates
│   ├── workflows/ci.yml       # Lint, build, and test workflow
│   └── pull_request_template.md
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── README.md
```

## Quick start

### Option 1: Docker Compose

1. Copy `.env.example` to `.env`
2. Review the environment values
3. Run:

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

### Option 2: Manual local setup

Prerequisites:

- Node.js 22+
- Python 3.10+
- PostgreSQL 16+

1. Copy `.env.example` to `.env`
2. Create a database named `prepiq`
3. Update `DATABASE_URL` if your local Postgres host is not `localhost`
4. Install frontend dependencies:

```bash
npm install
```

5. Install backend dependencies:

```bash
python -m pip install -r backend/requirements.txt
```

6. Start the backend:

```bash
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

7. Start the frontend:

```bash
npm run dev
```

## Deployment

### 1. Create the Neon database

1. Create a free Neon project
2. Copy the Postgres connection string
3. Make sure the final connection string includes `sslmode=require`

Example:

```text
postgresql+psycopg://<user>:<password>@<host>/<db>?sslmode=require
```

Use that value for `DATABASE_URL` in Koyeb.

### 2. Deploy the backend to Koyeb

Create a Koyeb Web Service from this GitHub repository.

Recommended settings:

- Builder: Dockerfile
- Dockerfile path: `Dockerfile.backend`
- Service type: Web Service

Environment variables:

- `DATABASE_URL=<your Neon SQLAlchemy URL>`
- `APP_SECRET=<long random secret>`
- `ACCESS_TOKEN_TTL_HOURS=168`
- `CORS_ORIGINS=https://<your-vercel-domain>`
- `OPENROUTER_API_KEY=<your key>`
- `OPENROUTER_MODEL=openrouter/free`
- `OPENROUTER_APP_URL=https://<your-vercel-domain>`
- `OPENROUTER_APP_NAME=PrepIQ`
- `OPENROUTER_TIMEOUT_SECONDS=30`

Health check:

- Path: `/api/health`

After deploy, note the backend URL:

```text
https://<your-koyeb-service>.koyeb.app
```

### 3. Deploy the frontend to Vercel

Import the same GitHub repository into Vercel.

Use:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

Set this environment variable in Vercel:

- `VITE_API_BASE_URL=https://<your-koyeb-service>.koyeb.app`

Then redeploy the frontend.

### 4. Update backend CORS

Make sure Koyeb backend `CORS_ORIGINS` exactly includes your Vercel frontend URL, for example:

```text
https://prepiq-demo.vercel.app
```

If you use a preview domain and a production domain, include both as a comma-separated list.

## Environment variables

See `.env.example`.

- `DATABASE_URL`: SQLAlchemy connection string
- `APP_SECRET`: signing secret for bearer tokens
- `ACCESS_TOKEN_TTL_HOURS`: token expiry window
- `CORS_ORIGINS`: allowed frontend origins
- `OPENROUTER_API_KEY`: optional AI provider key
- `OPENROUTER_MODEL`: optional provider model name
- `OPENROUTER_APP_URL`: referer header for OpenRouter
- `OPENROUTER_APP_NAME`: app title for OpenRouter
- `OPENROUTER_TIMEOUT_SECONDS`: request timeout for provider calls
- `VITE_API_BASE_URL`: explicit frontend API URL for built deployments

## OpenRouter integration

PrepIQ supports OpenRouter for live prep-plan generation and mock-answer evaluation.

- Keep `OPENROUTER_API_KEY` on the backend only
- If the provider is unavailable, the backend falls back to deterministic mock content
- Maintainer input is required before publishing production model and billing guidance

## Quality checks

Frontend:

```bash
npm run lint
npm test
npm run build
npx tsc --noEmit
```

Backend:

```bash
python -m compileall backend
python -m unittest discover -s backend/tests -p "test_*.py"
```

## Open-source readiness

- Contribution guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Code of conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- License: [LICENSE](./LICENSE)
- Issue backlog: [docs/open-source/ISSUE_BACKLOG.md](./docs/open-source/ISSUE_BACKLOG.md)
- Labels guide: [docs/open-source/LABELS.md](./docs/open-source/LABELS.md)

## Good first contributions

- Improve validation and error handling in major flows
- Add demo data and stronger documentation
- Expand test coverage for backend auth and frontend state handling
- Improve filters, analytics, and accessibility
- Add better contributor automation and docs

## Known owner inputs still needed

- Public demo URL and screenshots
- Final GitHub org/repo path for the CI badge
- Production secret management policy
- Final Vercel domain
- Final Koyeb backend domain
- OpenRouter billing and model policy

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
