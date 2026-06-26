# Contributing to PrepIQ

Thanks for contributing to PrepIQ. This project is intended to be approachable for first-time contributors while still offering meaningful full-stack work.

## Before you start

1. Read the [README.md](./README.md)
2. Review [docs/open-source/ROADMAP.md](./docs/open-source/ROADMAP.md)
3. Check [docs/open-source/ISSUE_BACKLOG.md](./docs/open-source/ISSUE_BACKLOG.md)
4. Comment on an issue before starting if the change is medium or large

## Contribution flow

1. Fork the repository
2. Clone your fork:

```bash
git clone https://github.com/<your-username>/prepiq.git
cd prepiq
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/Aashikhandelwal05/prepiq.git
```

4. Create a branch from `main`:

```bash
git checkout -b feat/short-description
```

Recommended branch names:

- `feat/job-search-filters`
- `fix/onboarding-prefill`
- `docs/readme-demo-section`
- `test/backend-auth-smoke`

## Local setup

### Docker

```bash
# macOS/Linux
cp .env.example .env
docker compose up --build
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
docker compose up --build
```

### Manual

Use Python 3.10-3.12 for local backend development. The backend Docker image uses Python 3.10, and CI currently verifies Python 3.10 and 3.11.

Copy the environment template:

```bash
# macOS/Linux
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

For simple manual setup, update `.env` to use SQLite:

```env
DATABASE_URL=sqlite:///./local.db
APP_SECRET=replace-with-a-long-random-secret
VITE_API_BASE_URL=
```

> **Note:** The path `sqlite:///./local.db` is relative to the `backend/` directory, which is the working directory when you run uvicorn with `cd backend && python -m uvicorn ...`.

Install frontend dependencies:

```bash
npm install
```

Create and activate a backend virtual environment:

```bash
# macOS/Linux
python -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m spacy download en_core_web_sm
python -m textblob.download_corpora
```

```powershell
# Windows PowerShell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
python -m spacy download en_core_web_sm
python -m textblob.download_corpora
```

If you use Python 3.10 or 3.12 instead, replace `3.11` with your installed supported version.

Run the backend from the activated virtual environment:

```bash
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Run the frontend in a separate terminal:

```bash
npm run dev
```

Make sure `.env` contains a strong `APP_SECRET` before you start the backend. The app uses it to sign and verify auth tokens.

## Test credentials

When the backend starts for the first time it seeds the following accounts for local testing:

| Email | Password |
|---|---|
| `user0@example.com` — `user9@example.com` | `password123` |

You can also create your own account via the signup page or the `/api/auth/signup` endpoint.

## Development guidelines

- Keep pull requests scoped to one problem or feature
- Do not remove working features unless the issue explicitly requires it
- Add comments only where the logic is not obvious
- Update docs when setup, behavior, or architecture changes
- Add or update tests for bug fixes and core flows when practical
- Never commit real secrets or private keys

## Validation checklist

Run the checks that match your change:

```bash
npm run lint
npm test
npm run build
npx tsc --noEmit
python -m compileall backend
python -m unittest discover -s backend/tests -p "test_*.py"
```

## Pull request checklist

Before opening a PR, make sure:

- Your branch is up to date with `main`
- The PR description explains the problem and the chosen solution
- Screenshots or short recordings are included for UI changes
- Any new environment variables are reflected in `.env.example`
- Documentation changes are included when needed

## Beginner-friendly tips

- Start with issues labeled `good first issue`
- Ask questions early instead of guessing
- Mention blockers clearly in the issue or PR thread
- If you are changing both frontend and backend behavior, split the work into reviewable commits

## Need help?

- Use issues for reproducible bugs and feature proposals
- Use draft pull requests if you want feedback early
- Ask maintainers before making broad architectural changes
