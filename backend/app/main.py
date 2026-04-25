from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from typing import Any, Literal
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/prepiq")
APP_SECRET = os.getenv("APP_SECRET", "change-me-in-production")
ACCESS_TOKEN_TTL_HOURS = int(os.getenv("ACCESS_TOKEN_TTL_HOURS", "168"))
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
OPENROUTER_APP_URL = os.getenv("OPENROUTER_APP_URL", "https://github.com/Aashikhandelwal05/prepiq")
OPENROUTER_APP_NAME = os.getenv("OPENROUTER_APP_NAME", "PrepIQ")
OPENROUTER_TIMEOUT_SECONDS = float(os.getenv("OPENROUTER_TIMEOUT_SECONDS", "30"))
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080").split(",")
    if origin.strip()
]

engine = create_engine(DATABASE_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


class UserTable(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ProfileTable(Base):
    __tablename__ = "profiles"

    user_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255))
    target_roles: Mapped[list[str]] = mapped_column(JSON)
    dream_companies: Mapped[list[str]] = mapped_column(JSON)
    degree: Mapped[str] = mapped_column(Text)
    institution: Mapped[str] = mapped_column(Text)
    graduation_year: Mapped[str] = mapped_column(String(20))
    coursework: Mapped[str] = mapped_column(Text)
    certifications: Mapped[list[str]] = mapped_column(JSON)
    work_history: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    technical_skills: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    soft_skills: Mapped[list[str]] = mapped_column(JSON)
    interview_fears: Mapped[list[str]] = mapped_column(JSON)
    fear_notes: Mapped[str] = mapped_column(Text)
    onboarding_complete: Mapped[bool] = mapped_column(Boolean)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class InterviewSessionTable(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    job_title: Mapped[str] = mapped_column(String(255))
    company: Mapped[str] = mapped_column(String(255))
    jd_text: Mapped[str] = mapped_column(Text)
    resume_text: Mapped[str] = mapped_column(Text)
    gap_analysis: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    readiness_score: Mapped[int] = mapped_column(Integer)
    question_bank: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    roadmap: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class MockAttemptTable(Base):
    __tablename__ = "mock_attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(36), default="")
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    question: Mapped[str] = mapped_column(Text)
    user_answer: Mapped[str] = mapped_column(Text)
    ai_score: Mapped[int] = mapped_column(Integer)
    ai_feedback: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class JobApplicationTable(Base):
    __tablename__ = "job_applications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    company_name: Mapped[str] = mapped_column(String(255))
    job_title: Mapped[str] = mapped_column(String(255))
    job_url: Mapped[str] = mapped_column(Text)
    date_applied: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32))
    salary_range: Mapped[str] = mapped_column(Text)
    location: Mapped[str] = mapped_column(Text)
    notes: Mapped[str] = mapped_column(Text)
    resume_used: Mapped[str] = mapped_column(Text)
    contact_person: Mapped[str] = mapped_column(Text)
    next_action: Mapped[str] = mapped_column(Text)
    next_action_date: Mapped[str] = mapped_column(String(32))
    linked_prep_session_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def today_iso() -> str:
    return utc_now().date().isoformat()


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def encode_token(payload: dict[str, Any]) -> str:
    payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("utf-8").rstrip("=")
    signature = hmac.new(APP_SECRET.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"


def decode_token(token: str) -> dict[str, Any]:
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    expected = hmac.new(APP_SECRET.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    padding = "=" * (-len(payload_b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(f"{payload_b64}{padding}".encode("utf-8")).decode("utf-8"))
    if payload.get("exp", 0) < int(utc_now().timestamp()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    return payload


def hash_password(password: str, salt: str | None = None) -> str:
    actual_salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), actual_salt.encode("utf-8"), 200_000)
    return f"{actual_salt}${base64.b64encode(digest).decode('utf-8')}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, _ = stored_hash.split("$", 1)
    except ValueError:
        return False
    return hmac.compare_digest(hash_password(password, salt), stored_hash)


class User(BaseModel):
    id: str
    name: str
    email: str


class AuthResponse(BaseModel):
    user: User
    token: str


class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class WorkEntry(BaseModel):
    id: str
    jobTitle: str
    company: str
    from_: str = Field(alias="from")
    to: str
    responsibilities: str

    model_config = {"populate_by_name": True}


class SkillEntry(BaseModel):
    name: str
    proficiency: Literal["Beginner", "Intermediate", "Expert"]


class CareerProfile(BaseModel):
    userId: str
    fullName: str
    email: str
    targetRoles: list[str]
    dreamCompanies: list[str]
    degree: str
    institution: str
    graduationYear: str
    coursework: str
    certifications: list[str]
    workHistory: list[WorkEntry]
    technicalSkills: list[SkillEntry]
    softSkills: list[str]
    interviewFears: list[str]
    fearNotes: str
    onboardingComplete: bool


class GapItem(BaseModel):
    skill: str
    have: str
    need: str
    gapLevel: Literal["Low", "Medium", "High"]


class QuestionItem(BaseModel):
    question: str
    type: Literal["behavioral", "technical", "situational"]
    difficulty: Literal["easy", "medium", "hard"]
    tip: str


class RoadmapDay(BaseModel):
    day: int
    focusArea: str
    tasks: list[str]


class InterviewSession(BaseModel):
    id: str
    userId: str
    jobTitle: str
    company: str
    jdText: str
    resumeText: str
    gapAnalysis: list[GapItem]
    readinessScore: int
    questionBank: list[QuestionItem]
    roadmap: list[RoadmapDay]
    createdAt: str


class CreateInterviewSessionRequest(BaseModel):
    jobTitle: str
    company: str
    jdText: str = ""
    resumeText: str = ""


class MockFeedback(BaseModel):
    strengths: list[str]
    missing: list[str]
    modelAnswer: str
    oneLineVerdict: str


class OpenRouterError(RuntimeError):
    pass


class MockAttempt(BaseModel):
    id: str
    sessionId: str
    userId: str
    question: str
    userAnswer: str
    aiScore: int
    aiFeedback: MockFeedback
    createdAt: str


class CreateMockAttemptRequest(BaseModel):
    sessionId: str = ""
    question: str
    userAnswer: str


JobStatus = Literal["Applied", "Screening", "Interview", "Offer", "Rejected", "Ghosted"]


class JobApplication(BaseModel):
    id: str
    userId: str
    companyName: str
    jobTitle: str
    jobUrl: str
    dateApplied: str
    status: JobStatus
    salaryRange: str
    location: str
    notes: str
    resumeUsed: str
    contactPerson: str
    nextAction: str
    nextActionDate: str
    linkedPrepSessionId: str | None
    createdAt: str
    updatedAt: str


class CreateJobApplicationRequest(BaseModel):
    companyName: str
    jobTitle: str
    jobUrl: str
    status: JobStatus


class UpdateJobApplicationRequest(BaseModel):
    companyName: str | None = None
    jobTitle: str | None = None
    jobUrl: str | None = None
    dateApplied: str | None = None
    status: JobStatus | None = None
    salaryRange: str | None = None
    location: str | None = None
    notes: str | None = None
    resumeUsed: str | None = None
    contactPerson: str | None = None
    nextAction: str | None = None
    nextActionDate: str | None = None
    linkedPrepSessionId: str | None = None


def user_from_table(user: UserTable) -> User:
    return User(id=user.id, name=user.name, email=user.email)


def profile_from_table(profile: ProfileTable) -> CareerProfile:
    return CareerProfile(
        userId=profile.user_id,
        fullName=profile.full_name,
        email=profile.email,
        targetRoles=profile.target_roles,
        dreamCompanies=profile.dream_companies,
        degree=profile.degree,
        institution=profile.institution,
        graduationYear=profile.graduation_year,
        coursework=profile.coursework,
        certifications=profile.certifications,
        workHistory=profile.work_history,
        technicalSkills=profile.technical_skills,
        softSkills=profile.soft_skills,
        interviewFears=profile.interview_fears,
        fearNotes=profile.fear_notes,
        onboardingComplete=profile.onboarding_complete,
    )


def session_from_table(session: InterviewSessionTable) -> InterviewSession:
    return InterviewSession(
        id=session.id,
        userId=session.user_id,
        jobTitle=session.job_title,
        company=session.company,
        jdText=session.jd_text,
        resumeText=session.resume_text,
        gapAnalysis=session.gap_analysis,
        readinessScore=session.readiness_score,
        questionBank=session.question_bank,
        roadmap=session.roadmap,
        createdAt=session.created_at.isoformat(),
    )


def mock_from_table(attempt: MockAttemptTable) -> MockAttempt:
    return MockAttempt(
        id=attempt.id,
        sessionId=attempt.session_id,
        userId=attempt.user_id,
        question=attempt.question,
        userAnswer=attempt.user_answer,
        aiScore=attempt.ai_score,
        aiFeedback=attempt.ai_feedback,
        createdAt=attempt.created_at.isoformat(),
    )


def job_from_table(job: JobApplicationTable) -> JobApplication:
    return JobApplication(
        id=job.id,
        userId=job.user_id,
        companyName=job.company_name,
        jobTitle=job.job_title,
        jobUrl=job.job_url,
        dateApplied=job.date_applied,
        status=job.status,  # type: ignore[arg-type]
        salaryRange=job.salary_range,
        location=job.location,
        notes=job.notes,
        resumeUsed=job.resume_used,
        contactPerson=job.contact_person,
        nextAction=job.next_action,
        nextActionDate=job.next_action_date,
        linkedPrepSessionId=job.linked_prep_session_id,
        createdAt=job.created_at.isoformat(),
        updatedAt=job.updated_at.isoformat(),
    )


def stable_number(seed: str, minimum: int, maximum: int) -> int:
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    span = maximum - minimum + 1
    return minimum + (int(digest[:8], 16) % span)


def call_openrouter_json(system_prompt: str, user_prompt: str) -> dict[str, Any]:
    if not OPENROUTER_API_KEY:
        raise OpenRouterError("OpenRouter is not configured")

    payload = {
        "model": OPENROUTER_MODEL,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }
    request = Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": OPENROUTER_APP_URL,
            "X-Title": OPENROUTER_APP_NAME,
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=OPENROUTER_TIMEOUT_SECONDS) as response:
            body = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise OpenRouterError(f"OpenRouter request failed: {exc.code} {detail}") from exc
    except URLError as exc:
        raise OpenRouterError(f"OpenRouter connection failed: {exc.reason}") from exc

    try:
        content = body["choices"][0]["message"]["content"]
        return json.loads(content)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise OpenRouterError("OpenRouter returned an invalid response format") from exc


def generate_session_payload(job_title: str, company: str, jd_text: str, resume_text: str) -> tuple[list[GapItem], int, list[QuestionItem], list[RoadmapDay]]:
    try:
        response = call_openrouter_json(
            system_prompt=(
                "You generate structured interview preparation data. "
                "Return valid JSON only. Do not include markdown or explanations. "
                "Use exactly this schema: "
                "{\"gapAnalysis\":[{\"skill\":\"string\",\"have\":\"string\",\"need\":\"string\",\"gapLevel\":\"Low|Medium|High\"}],"
                "\"readinessScore\":0,"
                "\"questionBank\":[{\"question\":\"string\",\"type\":\"behavioral|technical|situational\",\"difficulty\":\"easy|medium|hard\",\"tip\":\"string\"}],"
                "\"roadmap\":[{\"day\":1,\"focusArea\":\"string\",\"tasks\":[\"string\"]}]}. "
                "gapAnalysis must be an array with 3 to 5 items. "
                "questionBank must be an array with 6 to 10 items. "
                "roadmap must be an array with exactly 5 days."
            ),
            user_prompt=(
                f"Job title: {job_title}\n"
                f"Company: {company}\n"
                f"Job description:\n{jd_text or 'Not provided'}\n\n"
                f"Resume:\n{resume_text or 'Not provided'}\n\n"
                "Generate concise, realistic prep content for an interview prep dashboard."
            ),
        )
        gap_analysis = [GapItem(**item) for item in response["gapAnalysis"]]
        readiness = max(0, min(100, int(response["readinessScore"])))
        question_bank = [QuestionItem(**item) for item in response["questionBank"]]
        roadmap = [RoadmapDay(**item) for item in response["roadmap"]]
        if len(roadmap) >= 1 and len(question_bank) >= 1 and len(gap_analysis) >= 1:
            return gap_analysis, readiness, question_bank, roadmap
    except (OpenRouterError, KeyError, TypeError, ValueError):
        pass

    seed = f"{job_title}|{company}|{jd_text}|{resume_text}"
    readiness = stable_number(seed, 50, 89)
    gap_analysis = [
        GapItem(skill="React", have="Intermediate", need="Advanced", gapLevel="Medium"),
        GapItem(skill="System Design", have="Basic", need="Advanced", gapLevel="High"),
        GapItem(skill="TypeScript", have="Advanced", need="Advanced", gapLevel="Low"),
        GapItem(skill="CI/CD", have="Basic", need="Intermediate", gapLevel="Medium"),
        GapItem(skill="Testing", have="Intermediate", need="Advanced", gapLevel="Medium"),
    ]
    question_bank = [
        QuestionItem(question="Tell me about a challenging project at your previous role.", type="behavioral", difficulty="medium", tip="Use the STAR method."),
        QuestionItem(question=f"How would you design a scalable API for {company}?", type="technical", difficulty="hard", tip="Start with requirements and tradeoffs."),
        QuestionItem(question="What would you do if a teammate disagreed with your approach?", type="situational", difficulty="easy", tip="Show empathy and a path to alignment."),
        QuestionItem(question="Explain the difference between REST and GraphQL.", type="technical", difficulty="medium", tip="Cover strengths, weaknesses, and use cases."),
        QuestionItem(question=f"Why do you want to work at {company}?", type="behavioral", difficulty="easy", tip="Tie your answer to specific company priorities."),
        QuestionItem(question="How would you handle a production outage?", type="situational", difficulty="hard", tip="Demonstrate triage, communication, and follow-through."),
    ]
    roadmap = [
        RoadmapDay(day=1, focusArea="Company Research", tasks=[f"Research {company}'s products", "Study the team and stack", "Read recent company updates"]),
        RoadmapDay(day=2, focusArea="Technical Review", tasks=["Review core concepts", f"Practice {job_title}-specific problems", "Refresh system design patterns"]),
        RoadmapDay(day=3, focusArea="Behavioral Prep", tasks=["Prepare STAR stories", "Practice behavioral questions", "Review achievements with metrics"]),
        RoadmapDay(day=4, focusArea="Mock Interviews", tasks=["Run 2 mock rounds", "Review weak answers", "Refine delivery and examples"]),
        RoadmapDay(day=5, focusArea="Final Review", tasks=["Review notes", "Prepare questions to ask", "Rest before the interview"]),
    ]
    return gap_analysis, readiness, question_bank, roadmap


def evaluate_mock_attempt(question: str, answer: str) -> tuple[int, MockFeedback]:
    try:
        response = call_openrouter_json(
            system_prompt=(
                "You evaluate interview answers. "
                "Return valid JSON only. Do not include markdown or explanations. "
                "Use exactly this schema: "
                "{\"aiScore\":7,\"strengths\":[\"string\"],\"missing\":[\"string\"],\"modelAnswer\":\"string\",\"oneLineVerdict\":\"string\"}. "
                "aiScore must be an integer from 1 to 10. "
                "strengths and missing must each be arrays with 2 to 4 concise strings."
            ),
            user_prompt=(
                f"Question:\n{question}\n\n"
                f"Candidate answer:\n{answer}\n\n"
                "Evaluate the answer for a job-seeker preparation product."
            ),
        )
        score = max(1, min(10, int(response["aiScore"])))
        feedback = MockFeedback(
            strengths=[str(item) for item in response["strengths"]],
            missing=[str(item) for item in response["missing"]],
            modelAnswer=str(response["modelAnswer"]),
            oneLineVerdict=str(response["oneLineVerdict"]),
        )
        if feedback.strengths and feedback.missing:
            return score, feedback
    except (OpenRouterError, KeyError, TypeError, ValueError):
        pass

    base_seed = f"{question}|{answer}"
    answer_len = len(answer.strip())
    score = stable_number(base_seed, 5, 9)
    if answer_len > 400:
        score = min(score + 1, 10)
    if answer_len < 120:
        score = max(score - 1, 4)

    verdict = (
        "Excellent response with strong examples!"
        if score >= 8
        else "Good structure, but lacked specific examples"
        if score >= 5
        else "Needs more depth and concrete examples"
    )
    return score, MockFeedback(
        strengths=["Good structure and organization", "Relevant experience was included", "Clear communication style"],
        missing=["Could include more specific metrics", "Missing stronger articulation of impact"],
        modelAnswer=(
            "A strong answer should set the context, explain the challenge, describe the action taken, "
            "and close with a measurable result. Use a concrete example, include numbers where possible, "
            "and connect the outcome back to the role you are targeting."
        ),
        oneLineVerdict=verdict,
    )


def require_current_user(
    user_id: str,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> UserTable:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization token")

    payload = decode_token(authorization.removeprefix("Bearer ").strip())
    token_user_id = payload.get("sub")
    if token_user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    user = db.get(UserTable, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


app = FastAPI(title="PrepIQ Backend", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        logging.getLogger(__name__).exception("Failed to create database tables")
        raise


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.execute(select(UserTable).where(UserTable.email == payload.email.lower())).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = encode_token({"sub": user.id, "email": user.email, "exp": int((utc_now() + timedelta(hours=ACCESS_TOKEN_TTL_HOURS)).timestamp())})
    return AuthResponse(user=user_from_table(user), token=token)


@app.post("/api/auth/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if len(payload.password) < 8:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must be at least 8 characters")
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", payload.email):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid email format")

    existing = db.execute(select(UserTable).where(UserTable.email == payload.email.lower())).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    user = UserTable(
        id=str(uuid4()),
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
        created_at=utc_now(),
    )
    db.add(user)
    db.commit()

    token = encode_token({"sub": user.id, "email": user.email, "exp": int((utc_now() + timedelta(hours=ACCESS_TOKEN_TTL_HOURS)).timestamp())})
    return AuthResponse(user=user_from_table(user), token=token)


@app.get("/api/auth/me", response_model=User)
def me(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization token")
    payload = decode_token(authorization.removeprefix("Bearer ").strip())
    user = db.get(UserTable, payload.get("sub"))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user_from_table(user)


@app.get("/api/users/{user_id}/profile", response_model=CareerProfile | None)
def get_profile(user_id: str, _: UserTable = Depends(require_current_user), db: Session = Depends(get_db)) -> CareerProfile | None:
    profile = db.get(ProfileTable, user_id)
    return profile_from_table(profile) if profile else None


@app.put("/api/users/{user_id}/profile", response_model=CareerProfile)
def save_profile(
    user_id: str,
    profile: CareerProfile,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> CareerProfile:
    if profile.userId != user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Profile user mismatch")

    payload = profile.model_dump(by_alias=True)
    existing = db.get(ProfileTable, user_id)
    if existing:
        existing.full_name = payload["fullName"]
        existing.email = payload["email"]
        existing.target_roles = payload["targetRoles"]
        existing.dream_companies = payload["dreamCompanies"]
        existing.degree = payload["degree"]
        existing.institution = payload["institution"]
        existing.graduation_year = payload["graduationYear"]
        existing.coursework = payload["coursework"]
        existing.certifications = payload["certifications"]
        existing.work_history = payload["workHistory"]
        existing.technical_skills = payload["technicalSkills"]
        existing.soft_skills = payload["softSkills"]
        existing.interview_fears = payload["interviewFears"]
        existing.fear_notes = payload["fearNotes"]
        existing.onboarding_complete = payload["onboardingComplete"]
        existing.updated_at = utc_now()
    else:
        db.add(
            ProfileTable(
                user_id=user_id,
                full_name=payload["fullName"],
                email=payload["email"],
                target_roles=payload["targetRoles"],
                dream_companies=payload["dreamCompanies"],
                degree=payload["degree"],
                institution=payload["institution"],
                graduation_year=payload["graduationYear"],
                coursework=payload["coursework"],
                certifications=payload["certifications"],
                work_history=payload["workHistory"],
                technical_skills=payload["technicalSkills"],
                soft_skills=payload["softSkills"],
                interview_fears=payload["interviewFears"],
                fear_notes=payload["fearNotes"],
                onboarding_complete=payload["onboardingComplete"],
                updated_at=utc_now(),
            )
        )
    db.commit()
    return profile


@app.get("/api/users/{user_id}/sessions", response_model=list[InterviewSession])
def get_sessions(user_id: str, _: UserTable = Depends(require_current_user), db: Session = Depends(get_db)) -> list[InterviewSession]:
    rows = db.execute(select(InterviewSessionTable).where(InterviewSessionTable.user_id == user_id).order_by(InterviewSessionTable.created_at.asc())).scalars()
    return [session_from_table(row) for row in rows]


@app.get("/api/users/{user_id}/sessions/{session_id}", response_model=InterviewSession)
def get_session(user_id: str, session_id: str, _: UserTable = Depends(require_current_user), db: Session = Depends(get_db)) -> InterviewSession:
    row = db.execute(select(InterviewSessionTable).where(InterviewSessionTable.id == session_id, InterviewSessionTable.user_id == user_id)).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session_from_table(row)


@app.post("/api/users/{user_id}/sessions", response_model=InterviewSession, status_code=status.HTTP_201_CREATED)
def create_session(
    user_id: str,
    payload: CreateInterviewSessionRequest,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> InterviewSession:
    gap_analysis, readiness, question_bank, roadmap = generate_session_payload(payload.jobTitle, payload.company, payload.jdText, payload.resumeText)
    row = InterviewSessionTable(
        id=str(uuid4()),
        user_id=user_id,
        job_title=payload.jobTitle,
        company=payload.company,
        jd_text=payload.jdText,
        resume_text=payload.resumeText,
        gap_analysis=[item.model_dump() for item in gap_analysis],
        readiness_score=readiness,
        question_bank=[item.model_dump() for item in question_bank],
        roadmap=[item.model_dump() for item in roadmap],
        created_at=utc_now(),
    )
    db.add(row)
    db.commit()
    return session_from_table(row)


@app.get("/api/users/{user_id}/mocks", response_model=list[MockAttempt])
def get_mock_attempts(user_id: str, _: UserTable = Depends(require_current_user), db: Session = Depends(get_db)) -> list[MockAttempt]:
    rows = db.execute(select(MockAttemptTable).where(MockAttemptTable.user_id == user_id).order_by(MockAttemptTable.created_at.asc())).scalars()
    return [mock_from_table(row) for row in rows]


@app.post("/api/users/{user_id}/mocks", response_model=MockAttempt, status_code=status.HTTP_201_CREATED)
def create_mock_attempt(
    user_id: str,
    payload: CreateMockAttemptRequest,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> MockAttempt:
    if not payload.question.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Question must not be empty")
    if not payload.userAnswer.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Answer must not be empty")
    score, feedback = evaluate_mock_attempt(payload.question, payload.userAnswer)
    row = MockAttemptTable(
        id=str(uuid4()),
        session_id=payload.sessionId,
        user_id=user_id,
        question=payload.question,
        user_answer=payload.userAnswer,
        ai_score=score,
        ai_feedback=feedback.model_dump(),
        created_at=utc_now(),
    )
    db.add(row)
    db.commit()
    return mock_from_table(row)


@app.get("/api/users/{user_id}/jobs", response_model=list[JobApplication])
def get_jobs(user_id: str, _: UserTable = Depends(require_current_user), db: Session = Depends(get_db)) -> list[JobApplication]:
    rows = db.execute(select(JobApplicationTable).where(JobApplicationTable.user_id == user_id).order_by(JobApplicationTable.created_at.asc())).scalars()
    return [job_from_table(row) for row in rows]


@app.post("/api/users/{user_id}/jobs", response_model=JobApplication, status_code=status.HTTP_201_CREATED)
def create_job(
    user_id: str,
    payload: CreateJobApplicationRequest,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> JobApplication:
    now = utc_now()
    row = JobApplicationTable(
        id=str(uuid4()),
        user_id=user_id,
        company_name=payload.companyName,
        job_title=payload.jobTitle,
        job_url=payload.jobUrl,
        date_applied=today_iso(),
        status=payload.status,
        salary_range="",
        location="",
        notes="",
        resume_used="",
        contact_person="",
        next_action="",
        next_action_date="",
        linked_prep_session_id=None,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    return job_from_table(row)


@app.patch("/api/users/{user_id}/jobs/{job_id}", response_model=JobApplication)
def update_job(
    user_id: str,
    job_id: str,
    payload: UpdateJobApplicationRequest,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> JobApplication:
    job = db.execute(select(JobApplicationTable).where(JobApplicationTable.id == job_id, JobApplicationTable.user_id == user_id)).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job application not found")

    field_map = {
        "companyName": "company_name",
        "jobTitle": "job_title",
        "jobUrl": "job_url",
        "dateApplied": "date_applied",
        "status": "status",
        "salaryRange": "salary_range",
        "location": "location",
        "notes": "notes",
        "resumeUsed": "resume_used",
        "contactPerson": "contact_person",
        "nextAction": "next_action",
        "nextActionDate": "next_action_date",
        "linkedPrepSessionId": "linked_prep_session_id",
    }
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(job, field_map[key], value)
    job.updated_at = utc_now()
    db.commit()
    return job_from_table(job)
