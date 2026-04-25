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
git remote add upstream https://github.com/<owner-or-org>/prepiq.git
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
cp .env.example .env
docker compose up --build
```

### Manual

```bash
npm install
python -m pip install -r backend/requirements.txt
cp .env.example .env
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
npm run dev
```

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
