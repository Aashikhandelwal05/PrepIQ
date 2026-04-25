import os
import sys
import unittest
from pathlib import Path
from uuid import uuid4


REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_DB_PATH = REPO_ROOT / "backend" / "test-ci.db"
sys.path.insert(0, str(REPO_ROOT))

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["APP_SECRET"] = "ci-test-secret"
os.environ["CORS_ORIGINS"] = "http://localhost:8080,http://127.0.0.1:8080"

from fastapi.testclient import TestClient

from backend.app.main import app


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

        me = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me.status_code, 200, me.text)
        self.assertEqual(me.json()["email"], email)

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
            json={"status": "Interview", "location": "Remote", "notes": "Follow up next week"},
        )
        self.assertEqual(patch.status_code, 200, patch.text)
        self.assertEqual(patch.json()["status"], "Interview")


if __name__ == "__main__":
    unittest.main()
