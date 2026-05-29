import os
import sys
import tempfile
import unittest
from pathlib import Path
from uuid import uuid4

REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_DB_PATH = REPO_ROOT / "backend" / "test-ci.db"
sys.path.insert(0, str(REPO_ROOT))

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["APP_SECRET"] = "ci-test-secret"
os.environ["CORS_ORIGINS"] = "http://localhost:8080,http://127.0.0.1:8080"

from backend.app.main import app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


class PrepIQApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if TEST_DB_PATH.exists():
            TEST_DB_PATH.unlink()
        cls.client_cm = TestClient(app)
        cls.client = cls.client_cm.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.client_cm.__exit__(None, None, None)

    def create_account(self) -> tuple[str, dict[str, str]]:
        email = f"test-{uuid4().hex[:8]}@example.com"
        response = self.client.post(
            "/api/auth/signup",
            json={"name": "Test User", "email": email, "password": "password123"},
        )
        self.assertEqual(response.status_code, 201, response.text)
        payload = response.json()
        return payload["user"]["id"], {"Authorization": f"Bearer {payload['token']}"}

    def test_health_endpoint(self) -> None:
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_load_local_env_preserves_existing_environment(self) -> None:
        from backend.app.main import load_local_env

        with tempfile.NamedTemporaryFile(
            "w", delete=False, encoding="utf-8"
        ) as env_file:
            env_file.write("PREPIQ_TEST_ENV=from-file\n")
            env_file.write("PREPIQ_EXISTING_ENV=from-file\n")
            env_path = env_file.name

        previous_env_file = os.environ.get("PREPIQ_ENV_FILE")
        previous_new = os.environ.get("PREPIQ_TEST_ENV")
        previous_existing = os.environ.get("PREPIQ_EXISTING_ENV")
        try:
            os.environ["PREPIQ_ENV_FILE"] = env_path
            os.environ.pop("PREPIQ_TEST_ENV", None)
            os.environ["PREPIQ_EXISTING_ENV"] = "already-set"

            load_local_env()

            self.assertEqual(os.environ["PREPIQ_TEST_ENV"], "from-file")
            self.assertEqual(os.environ["PREPIQ_EXISTING_ENV"], "already-set")
        finally:
            if previous_env_file is None:
                os.environ.pop("PREPIQ_ENV_FILE", None)
            else:
                os.environ["PREPIQ_ENV_FILE"] = previous_env_file
            if previous_new is None:
                os.environ.pop("PREPIQ_TEST_ENV", None)
            else:
                os.environ["PREPIQ_TEST_ENV"] = previous_new
            if previous_existing is None:
                os.environ.pop("PREPIQ_EXISTING_ENV", None)
            else:
                os.environ["PREPIQ_EXISTING_ENV"] = previous_existing
            os.unlink(env_path)

    def test_extract_skills_endpoint_returns_skill_list(self) -> None:
        from backend.app import ml

        ml._spacy_nlp = False
        _, headers = self.create_account()
        response = self.client.post(
            "/api/ml/extract-skills",
            headers=headers,
            json={"text": "Built Python and React applications with PostgreSQL."},
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertIsInstance(payload["skills"], list)
        self.assertEqual(payload["count"], len(payload["skills"]))
        self.assertIn("Python", payload["skills"])

    def test_extract_skills_endpoint_returns_multiword_skills(self) -> None:
        from backend.app import ml

        ml._spacy_nlp = False
        _, headers = self.create_account()

        response = self.client.post(
            "/api/ml/extract-skills",
            headers=headers,
            json={
                "text": """
                Worked on machine-learning, spring_boot,
                oauth/jwt auth, and google-cloud deployment
                """
            },
        )

        self.assertEqual(response.status_code, 200, response.text)

        payload = response.json()
        skills = payload["skills"]

        self.assertIn("Machine Learning", skills)
        self.assertIn("Spring Boot", skills)
        self.assertIn("Google Cloud", skills)

        # Single-word skills should still work
        self.assertIn("Oauth", skills)
        self.assertIn("JWT", skills)

    def test_match_score_endpoint_returns_score_and_label(self) -> None:
        _, headers = self.create_account()
        response = self.client.post(
            "/api/ml/match-score",
            headers=headers,
            json={
                "resumeText": "Python developer with FastAPI, SQL, and ML engineer experience.",
                "jdText": "Looking for a Python engineer with FastAPI, SQL, and machine learning skills.",
            },
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertIsInstance(payload["score"], int)
        self.assertGreaterEqual(payload["score"], 0)
        self.assertLessEqual(payload["score"], 100)
        self.assertIn(
            payload["label"], {"Strong match", "Moderate match", "Weak match"}
        )
        self.assertIn("semanticScore", payload)
        self.assertIn("keywordOverlapScore", payload)
        self.assertIn("overallScore", payload)

        # Acceptance criteria: "ML engineer" resume matched to "machine learning" JD scores > 70
        self.assertGreater(payload["score"], 70)

    def test_analyze_confidence_endpoint_returns_analysis_shape(self) -> None:
        _, headers = self.create_account()
        response = self.client.post(
            "/api/ml/analyze-confidence",
            headers=headers,
            json={
                "text": "I led a team of 4 engineers and improved deployment speed by 30 percent.",
            },
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertIsInstance(payload["confidenceScore"], int)
        self.assertIsInstance(payload["specificity"], int)
        self.assertIsInstance(payload["wordCount"], int)
        self.assertIn(payload["sentiment"], {"positive", "neutral", "negative"})
        self.assertGreater(payload["wordCount"], 0)

    def test_ml_endpoints_require_auth(self) -> None:
        response = self.client.post(
            "/api/ml/extract-skills",
            json={"text": "test"},
        )
        self.assertEqual(response.status_code, 401)

    def test_ml_endpoints_payload_size_limit(self) -> None:
        _, headers = self.create_account()
        large_text = "a" * (5 * 1024 * 1024 + 1)
        response = self.client.post(
            "/api/ml/extract-skills",
            headers=headers,
            json={"text": large_text},
        )
        self.assertEqual(response.status_code, 413)

    def test_signup_login_and_me(self) -> None:
        email = f"login-{uuid4().hex[:8]}@example.com"
        signup = self.client.post(
            "/api/auth/signup",
            json={"name": "Login User", "email": email, "password": "password123"},
        )
        self.assertEqual(signup.status_code, 201, signup.text)

        login = self.client.post(
            "/api/auth/login",
            json={"email": email, "password": "password123"},
        )
        self.assertEqual(login.status_code, 200, login.text)
        token = login.json()["token"]

        me = self.client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(me.status_code, 200, me.text)
        self.assertEqual(me.json()["email"], email)

        tampered_token = f"{token[:-1]}{'a' if token[-1] != 'a' else 'b'}"
        tampered_me = self.client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {tampered_token}"}
        )
        self.assertEqual(tampered_me.status_code, 401, tampered_me.text)

    def test_login_wrong_password_returns_401(self) -> None:
        email = f"wrongpw-{uuid4().hex[:8]}@example.com"
        self.client.post(
            "/api/auth/signup",
            json={"name": "Wrong PW User", "email": email, "password": "password123"},
        )

        response = self.client.post(
            "/api/auth/login",
            json={"email": email, "password": "wrongpassword"},
        )

        self.assertEqual(response.status_code, 401, response.text)
        self.assertIn("Invalid credentials", response.json()["detail"])

    def test_expired_token_returns_401(self) -> None:
        from datetime import timedelta

        from backend.app.main import encode_token, utc_now

        user_id, _ = self.create_account()

        expired_token = encode_token(
            {
                "sub": user_id,
                "email": "expired@example.com",
                "exp": int((utc_now() - timedelta(hours=1)).timestamp()),
            }
        )

        response = self.client.get(
            f"/api/users/{user_id}/sessions",
            headers={"Authorization": f"Bearer {expired_token}"},
        )

        self.assertEqual(response.status_code, 401, response.text)
        self.assertIn("Token expired", response.json()["detail"])

    def test_cross_user_access_returns_403(self) -> None:
        user_a_id, _ = self.create_account()
        user_b_id, headers_b = self.create_account()

        response = self.client.get(
            f"/api/users/{user_a_id}/profile",
            headers=headers_b,
        )

        self.assertEqual(response.status_code, 403, response.text)
        self.assertIn("Forbidden", response.json()["detail"])

    def test_profile_session_mock_and_job_flow(self) -> None:
        user_id, headers = self.create_account()

        profile = self.client.put(
            f"/api/users/{user_id}/profile",
            headers=headers,
            json={
                "userId": user_id,
                "fullName": "Test User",
                "email": "test@example.com",
                "targetRoles": ["Frontend Developer"],
                "dreamCompanies": ["PrepIQ"],
                "degree": "B.Tech",
                "institution": "Test Institute",
                "graduationYear": "2026",
                "coursework": "DSA, DBMS",
                "certifications": ["AWS CCP"],
                "workHistory": [
                    {
                        "id": "work-1",
                        "jobTitle": "Intern",
                        "company": "PrepIQ",
                        "from": "2025-01",
                        "to": "2025-06",
                        "responsibilities": "Built interview prep UI",
                    }
                ],
                "technicalSkills": [{"name": "React", "proficiency": "Intermediate"}],
                "softSkills": ["Communication"],
                "interviewFears": ["Technical rounds"],
                "fearNotes": "Need more practice",
                "onboardingComplete": True,
            },
        )
        self.assertEqual(profile.status_code, 200, profile.text)

        session = self.client.post(
            f"/api/users/{user_id}/sessions",
            headers=headers,
            json={
                "jobTitle": "Frontend Engineer",
                "company": "PrepIQ",
                "jdText": "Build React applications",
                "resumeText": "Worked on React and TypeScript projects",
            },
        )
        self.assertEqual(session.status_code, 201, session.text)
        session_payload = session.json()
        self.assertGreaterEqual(session_payload["readinessScore"], 0)

        mock = self.client.post(
            f"/api/users/{user_id}/mocks",
            headers=headers,
            json={
                "sessionId": session_payload["id"],
                "question": "Tell me about a project you built.",
                "userAnswer": "I built a dashboard and improved completion by 30 percent.",
            },
        )
        self.assertEqual(mock.status_code, 201, mock.text)
        self.assertIn("oneLineVerdict", mock.json()["aiFeedback"])

        mocks = self.client.get(f"/api/users/{user_id}/mocks", headers=headers)
        self.assertEqual(mocks.status_code, 200, mocks.text)
        mocks_payload = mocks.json()
        self.assertEqual(mocks_payload["total"], 1)
        self.assertEqual(mocks_payload["limit"], 20)
        self.assertEqual(mocks_payload["offset"], 0)
        self.assertEqual(len(mocks_payload["items"]), 1)
        self.assertEqual(mocks_payload["items"][0]["sessionId"], session_payload["id"])

        job = self.client.post(
            f"/api/users/{user_id}/jobs",
            headers=headers,
            json={
                "companyName": "PrepIQ",
                "jobTitle": "Frontend Engineer",
                "jobUrl": "https://example.com/jobs/123",
                "status": "Applied",
            },
        )
        self.assertEqual(job.status_code, 201, job.text)
        job_id = job.json()["id"]

        patch = self.client.patch(
            f"/api/users/{user_id}/jobs/{job_id}",
            headers=headers,
            json={
                "status": "Interview",
                "location": "Remote",
                "notes": "Follow up next week",
            },
        )
        self.assertEqual(patch.status_code, 200, patch.text)
        self.assertEqual(patch.json()["status"], "Interview")

        delete_job = self.client.delete(
            f"/api/users/{user_id}/jobs/{job_id}", headers=headers
        )
        self.assertEqual(delete_job.status_code, 204, delete_job.text)

        jobs = self.client.get(f"/api/users/{user_id}/jobs", headers=headers)
        self.assertEqual(jobs.status_code, 200, jobs.text)
        self.assertEqual(jobs.json(), [])

        delete_session = self.client.delete(
            f"/api/users/{user_id}/sessions/{session_payload['id']}",
            headers=headers,
        )
        self.assertEqual(delete_session.status_code, 204, delete_session.text)

        sessions = self.client.get(f"/api/users/{user_id}/sessions", headers=headers)
        self.assertEqual(sessions.status_code, 200, sessions.text)
        self.assertEqual(sessions.json(), [])

        mocks_after_delete = self.client.get(
            f"/api/users/{user_id}/mocks", headers=headers
        )
        self.assertEqual(mocks_after_delete.status_code, 200, mocks_after_delete.text)
        self.assertEqual(mocks_after_delete.json()["items"], [])
        self.assertEqual(mocks_after_delete.json()["total"], 0)

    def test_session_creation_validation(self) -> None:
        user_id, headers = self.create_account()

        res_empty_job = self.client.post(
            f"/api/users/{user_id}/sessions",
            headers=headers,
            json={
                "jobTitle": "   ",
                "company": "PrepIQ",
                "jdText": "Build React applications",
                "resumeText": "Worked on React and TypeScript projects",
            },
        )
        self.assertEqual(res_empty_job.status_code, 422)
        payload_job = res_empty_job.json()
        self.assertEqual(payload_job["detail"][0]["loc"], ["body", "jobTitle"])
        self.assertIn("cannot be empty or whitespace-only", payload_job["detail"][0]["msg"])

        res_empty_company = self.client.post(
            f"/api/users/{user_id}/sessions",
            headers=headers,
            json={
                "jobTitle": "Frontend Engineer",
                "company": "   ",
                "jdText": "Build React applications",
                "resumeText": "Worked on React and TypeScript projects",
            },
        )
        self.assertEqual(res_empty_company.status_code, 422)
        payload_company = res_empty_company.json()
        self.assertEqual(payload_company["detail"][0]["loc"], ["body", "company"])
        self.assertIn("cannot be empty or whitespace-only", payload_company["detail"][0]["msg"])

    def test_generate_question_endpoint(self) -> None:
        user_id, headers = self.create_account()

        # 1. Unauthenticated request should fail with 401
        res_unauth = self.client.post(
            f"/api/users/{user_id}/mock/generate-question",
            json={"role": "Frontend Developer", "difficulty": "Medium"},
        )
        self.assertEqual(res_unauth.status_code, 401)

        # 2. Authenticated request with valid data should succeed with 200
        res_auth = self.client.post(
            f"/api/users/{user_id}/mock/generate-question",
            headers=headers,
            json={"role": "Frontend Developer", "difficulty": "Medium"},
        )
        self.assertEqual(res_auth.status_code, 200, res_auth.text)
        self.assertIn("question", res_auth.json())
        self.assertIsInstance(res_auth.json()["question"], str)

        # 3. Accessing with another user's ID should fail with 403
        other_user_id = str(uuid4())
        res_other = self.client.post(
            f"/api/users/{other_user_id}/mock/generate-question",
            headers=headers,
            json={"role": "Frontend Developer", "difficulty": "Medium"},
        )
        self.assertEqual(res_other.status_code, 403)

        # 4. Invalid role should fail with 422
        res_bad_role = self.client.post(
            f"/api/users/{user_id}/mock/generate-question",
            headers=headers,
            json={"role": "Invalid Developer Role", "difficulty": "Medium"},
        )
        self.assertEqual(res_bad_role.status_code, 422)

        # 5. Invalid difficulty should fail with 422
        res_bad_diff = self.client.post(
            f"/api/users/{user_id}/mock/generate-question",
            headers=headers,
            json={"role": "Frontend Developer", "difficulty": "Super Hard"},
        )
        self.assertEqual(res_bad_diff.status_code, 422)


if __name__ == "__main__":
    unittest.main()
