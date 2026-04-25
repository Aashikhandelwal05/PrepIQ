# Curated Issue Backlog

## 1. Add dashboard loading and empty-state skeletons

- Labels: `frontend`, `good first issue`, `enhancement`, `difficulty: easy`, `gssoc`
- Description: Add loading placeholders for the main dashboard cards and lists so contributors can improve perceived performance without changing core data flows.

## 2. Add stronger signup password policy validation

- Labels: `backend`, `bug`, `security`, `difficulty: easy`, `gssoc`
- Description: Expand the current password validation beyond minimum length and return clearer backend error messages for weak passwords.

## 3. Add job tracker search and status filters

- Labels: `frontend`, `enhancement`, `help wanted`, `difficulty: medium`, `gssoc`
- Description: Allow contributors to search job applications by company or role and filter the board/table by status.

## 4. Add backend tests for token tampering and expiry

- Labels: `backend`, `testing`, `security`, `difficulty: medium`, `gssoc`
- Description: Cover invalid signatures, expired tokens, and forbidden cross-user access cases in automated backend tests.

## 5. Add API schema examples to FastAPI endpoints

- Labels: `backend`, `documentation`, `good first issue`, `difficulty: easy`
- Description: Improve generated API docs by adding example payloads for auth, profile, prep session, mock, and job routes.

## 6. Add onboarding step validation messages

- Labels: `frontend`, `bug`, `accessibility`, `difficulty: medium`, `gssoc`
- Description: Prevent incomplete onboarding submissions and add user-facing guidance for missing required fields.

## 7. Add sample data seeding script for local demos

- Labels: `backend`, `documentation`, `help wanted`, `difficulty: medium`
- Description: Create an optional seed script that populates demo users, sessions, mock attempts, and job applications for local screenshots and demos.

## 8. Add architecture diagram and request flow doc

- Labels: `documentation`, `good first issue`, `difficulty: easy`, `gssoc`
- Description: Document how the React frontend, FastAPI backend, storage layer, and optional OpenRouter integration interact.

## 9. Add linked prep recommendations in the job tracker

- Labels: `frontend`, `backend`, `enhancement`, `difficulty: hard`, `help wanted`
- Description: Surface recommended prep sessions from the job tracker based on company name, role, or explicit links.

## 10. Add accessibility audit for sidebar and dialogs

- Labels: `frontend`, `accessibility`, `documentation`, `difficulty: medium`
- Description: Review keyboard navigation, focus management, labels, and contrast for the main layout, dialogs, and sheets.

## 11. Add saved-session restore for interview prep filters

- Labels: `frontend`, `enhancement`, `good first issue`, `difficulty: easy`
- Description: Persist the question filters and last-opened prep session so contributors can improve continuity without changing the backend.

## 12. Add backend service layer extraction

- Labels: `backend`, `enhancement`, `difficulty: hard`, `help wanted`
- Description: Refactor `backend/app/main.py` into modules for models, auth, provider integration, and routes while preserving behavior.

## 13. Add refresh and retry controls for failed data fetches

- Labels: `frontend`, `bug`, `enhancement`, `difficulty: medium`
- Description: Expose retry actions when workspace data fails to load instead of only showing a passive error banner.

## 14. Add Playwright smoke test for auth and dashboard

- Labels: `testing`, `frontend`, `devops`, `difficulty: medium`, `gssoc`
- Description: Use the existing Playwright setup to cover the login flow and a basic dashboard render.

## 15. Add Docker docs for local troubleshooting

- Labels: `documentation`, `devops`, `good first issue`, `difficulty: easy`
- Description: Document common Docker issues such as port conflicts, stale volumes, and environment mismatches.

## 16. Add analytics explanations to the progress page

- Labels: `frontend`, `enhancement`, `good first issue`, `difficulty: easy`
- Description: Add short helper text explaining how readiness, activity, and mock score metrics are calculated.

## 17. Add backend logging improvements for provider failures

- Labels: `backend`, `devops`, `difficulty: medium`
- Description: Improve observability around OpenRouter fallbacks, timeouts, and malformed responses without exposing secrets.

## 18. Add contributor starter tasks board and mentor notes

- Labels: `documentation`, `help wanted`, `mentor-needed`, `difficulty: medium`
- Description: Create a maintainer-facing guide for triaging beginner issues and assigning mentors during open-source programs.
