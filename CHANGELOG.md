# Changelog

All notable changes to PrepIQ will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Configurable interview prep roadmap duration based on interview date (#179)
- Optional interview date picker in prep session creation form
- Dynamic roadmap adjustment (1-10 days) based on days remaining

## [2.0.0] - 2026-05-01

### Added
- AI-powered interview prep session generation via OpenRouter
- Mock interview module with AI scoring and model feedback
- Job application tracker with Kanban and table views
- Progress dashboard with visual analytics and Recharts
- Career DNA profiling with multi-step onboarding wizard
- Local ML/NLP pipeline using spaCy NER, TF-IDF, TextBlob
- Docker Compose setup for full-stack local development
- GitHub Actions CI for automated testing
- Deployment on Vercel (frontend) and Render (backend)
- Neon PostgreSQL for managed cloud database

### Changed
- Improved auth token security with HMAC signing and PBKDF2 hashing
- Migrated from SQLite-only to PostgreSQL with SQLite fallback for tests

## [1.0.0] - 2026-04-01

### Added
- Initial release of PrepIQ
- User account management with signup and login
- Secure token-based session handling
- Basic career profile creation
- REST API with FastAPI backend
- React 18 frontend with TypeScript and Tailwind CSS
- Environment variable configuration via .env.example
- SQLite support for local development
