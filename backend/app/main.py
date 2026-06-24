from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import traceback
from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from urllib.parse import urlparse
from uuid import uuid4

import httpx
import resend
from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Query,
    Request,
    Response,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Integer,
    String,
    Text,
    create_engine,
    delete,
    func,
    select,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from .ml import analyze_confidence, compute_match_score, extract_skills

logger = logging.getLogger(__name__)


def load_local_env() -> None:
    env_path = os.getenv("PREPIQ_ENV_FILE", ".env")
    if not os.path.exists(env_path):
        return

    with open(env_path, encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_local_env()
# Environments where SQLite and insecure defaults are explicitly permitted.
# Any value not in this set is treated as production-like and requires real config.
_LOCAL_ENVS = {"development", "dev", "test", "local"}
APP_ENV = os.getenv("APP_ENV", "development").lower()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    # Rewrite postgresql:// and postgres:// to use psycopg v3 (postgresql+psycopg://)
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
    elif DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
else:
    if APP_ENV not in _LOCAL_ENVS:
        raise RuntimeError(
            f"[{APP_ENV.upper()}] DATABASE_URL is missing. "
            "Refusing to start — SQLite fallback is not allowed outside local/development environments. "
            f"Set APP_ENV to one of {sorted(_LOCAL_ENVS)} to permit the SQLite fallback, "
            "or set DATABASE_URL to a real database URL."
        )
    # Intentional: SQLite is the local development default when no DATABASE_URL is configured.
    DATABASE_URL = "sqlite:///./local.db"
    logger.warning(
        "DATABASE_URL not set. Falling back to local SQLite: "
        "'sqlite:///./local.db'. Do NOT use this in production."
    )

_APP_SECRET_DEFAULT = "change-me-in-production"
APP_SECRET = os.getenv("APP_SECRET", _APP_SECRET_DEFAULT)
if APP_SECRET in {_APP_SECRET_DEFAULT, ""}:
    if APP_ENV not in _LOCAL_ENVS:
        raise RuntimeError(
            f"[{APP_ENV.upper()}] APP_SECRET is unset or still has the default value. "
            "Refusing to start — set a strong secret in your environment before starting the app."
        )
    logger.warning(
        "APP_SECRET is set to the insecure default. "
        "Tokens can be forged by anyone. Do NOT use this in production."
    )

ACCESS_TOKEN_TTL_HOURS = int(os.getenv("ACCESS_TOKEN_TTL_HOURS", "168"))
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
if not OPENROUTER_API_KEY and APP_ENV not in _LOCAL_ENVS:
    logger.warning(
        "[%s] OPENROUTER_API_KEY is not set. "
        "All AI-powered features will silently use the static fallback responses.",
        APP_ENV.upper(),
    )
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
OPENROUTER_APP_URL = os.getenv(
    "OPENROUTER_APP_URL", "https://github.com/Aashikhandelwal05/prepiq"
)
OPENROUTER_APP_NAME = os.getenv("OPENROUTER_APP_NAME", "PrepIQ")
OPENROUTER_TIMEOUT_SECONDS = float(os.getenv("OPENROUTER_TIMEOUT_SECONDS", "30"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:8080,http://127.0.0.1:8080,https://prepiqfrontend.vercel.app",
    ).split(",")
    if origin.strip()
]

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, future=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


class UserTable(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    anonymous_mode: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
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
    is_estimated: Mapped[bool] = mapped_column(Boolean, default=False)
    gap_analysis: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    readiness_score: Mapped[int] = mapped_column(Integer)
    question_bank: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    roadmap: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    extracted_skills: Mapped[list[str]] = mapped_column(JSON, default=list)
    ml_match_score: Mapped[int] = mapped_column(Integer, default=0)
    interview_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
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
    linked_prep_session_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class MentorChatSessionTable(Base):
    __tablename__ = "mentor_chat_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    title: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class DailyActivityTable(Base):
    __tablename__ = "daily_activities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    date: Mapped[str] = mapped_column(String(10), index=True)
    activity_type: Mapped[str] = mapped_column(String(50))


class UserBadgeTable(Base):
    __tablename__ = "user_badges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    badge_id: Mapped[str] = mapped_column(String(50))
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class MentorChatHistoryTable(Base):
    __tablename__ = "mentor_chat_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str | None] = mapped_column(
        String(36), index=True, nullable=True
    )
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


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
    payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode(
        "utf-8"
    )
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("utf-8").rstrip("=")
    signature = hmac.new(
        APP_SECRET.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return f"{payload_b64}.{signature}"


def decode_token(token: str) -> dict[str, Any]:
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from exc

    expected = hmac.new(
        APP_SECRET.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )

    padding = "=" * (-len(payload_b64) % 4)
    payload = json.loads(
        base64.urlsafe_b64decode(f"{payload_b64}{padding}".encode()).decode("utf-8")
    )
    if payload.get("exp", 0) < int(utc_now().timestamp()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        )
    return payload


def hash_password(password: str, salt: str | None = None) -> str:
    actual_salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), actual_salt.encode("utf-8"), 200_000
    )
    return f"{actual_salt}${base64.b64encode(digest).decode('utf-8')}"


def verify_password(password: str, stored_hash: str) -> bool:
    # Backward-compatibility: hashes created by the old passlib/bcrypt era
    # start with $2b$ or $2a$.  Try bcrypt verification if passlib is available.
    if stored_hash.startswith(("$2b$", "$2a$")):
        try:
            from passlib.context import CryptContext  # type: ignore[import]
            return CryptContext(schemes=["bcrypt"], deprecated="auto").verify(
                password, stored_hash
            )
        except Exception:
            return False
    # Current format: "<salt>$<base64-pbkdf2-digest>"
    try:
        salt, _ = stored_hash.split("$", 1)
    except ValueError:
        return False
    return hmac.compare_digest(hash_password(password, salt), stored_hash)


class User(BaseModel):
    id: str
    name: str
    email: str
    anonymousMode: bool = False


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
    interviewDate: str | None = None
    jdText: str
    resumeText: str
    isEstimated: bool
    gapAnalysis: list[GapItem]
    readinessScore: int
    questionBank: list[QuestionItem]
    roadmap: list[RoadmapDay]
    extractedSkills: list[str] = []
    mlMatchScore: int = 0
    createdAt: str


class CreateInterviewSessionRequest(BaseModel):
    jobTitle: str
    company: str
    jdText: str = Field(default="", max_length=15000)
    resumeText: str = Field(default="", max_length=8000)
    interviewDate: str | None = None

    @field_validator("jobTitle", "company", mode="after")
    @classmethod
    def check_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("cannot be empty or whitespace-only")
        return v


class ConfidenceAnalysis(BaseModel):
    confidenceScore: int = 0
    sentiment: str = "neutral"
    specificity: int = 0
    wordCount: int = 0


class MockFeedback(BaseModel):
    strengths: list[str]
    missing: list[str]
    modelAnswer: str
    oneLineVerdict: str
    confidenceAnalysis: ConfidenceAnalysis = ConfidenceAnalysis()


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
    question: str = Field(max_length=2000)
    userAnswer: str = Field(max_length=10000)


class PaginatedMockAttempts(BaseModel):
    items: list[MockAttempt]
    total: int
    limit: int
    offset: int


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
    sortOrder: int
    createdAt: str
    updatedAt: str


class JobApplicationBaseRequest(BaseModel):
    @field_validator("companyName", "jobTitle", check_fields=False)
    @classmethod
    def non_empty(cls, v: str | None) -> str | None:
        if v is None:
            return v
        stripped = v.strip()
        if not stripped:
            raise ValueError("must not be empty or whitespace-only")
        return stripped

    @field_validator("jobUrl", check_fields=False)
    @classmethod
    def valid_url(cls, v: str | None) -> str | None:
        if v is None:
            return v
        stripped = v.strip()
        parsed = urlparse(stripped)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("must be a valid HTTP or HTTPS URL")
        return stripped


class CreateJobApplicationRequest(JobApplicationBaseRequest):
    companyName: str
    jobTitle: str
    jobUrl: str
    status: JobStatus


class UpdateJobApplicationRequest(JobApplicationBaseRequest):
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
    sortOrder: int | None = None


def user_from_table(user: UserTable) -> User:
    return User(
        id=user.id,
        name=user.name,
        email=user.email,
        anonymousMode=getattr(user, "anonymous_mode", False),
    )


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
        interviewDate=session.interview_date,
        jdText=session.jd_text,
        resumeText=session.resume_text,
        isEstimated=session.is_estimated,
        gapAnalysis=session.gap_analysis,
        readinessScore=session.readiness_score,
        questionBank=session.question_bank,
        roadmap=session.roadmap,
        extractedSkills=session.extracted_skills or [],
        mlMatchScore=session.ml_match_score or 0,
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
        sortOrder=job.sort_order,
        createdAt=job.created_at.isoformat(),
        updatedAt=job.updated_at.isoformat(),
    )


# ---------------------------------------------------------------------------
# Streak & Badge helpers
# ---------------------------------------------------------------------------

BADGES = [
    {"id": "first_steps", "label": "First Steps", "condition": "first_activity"},
    {"id": "week_warrior", "label": "Week Warrior", "condition": "streak_7"},
    {"id": "monthly_master", "label": "Monthly Master", "condition": "streak_30"},
    {"id": "iron_will", "label": "Iron Will", "condition": "streak_60"},
    {"id": "scholar", "label": "Scholar", "condition": "prep_10"},
    {"id": "interview_pro", "label": "Interview Pro", "condition": "mock_5"},
    {"id": "job_hunter", "label": "Job Hunter", "condition": "jobs_10"},
    {"id": "perfectionist", "label": "Perfectionist", "condition": "score_90"},
    {"id": "night_owl", "label": "Night Owl", "condition": "late_10"},
]


def track_activity(user_id: str, activity_type: str, db: Session) -> None:
    today = today_iso()
    existing = db.execute(
        select(DailyActivityTable).where(
            DailyActivityTable.user_id == user_id,
            DailyActivityTable.date == today,
            DailyActivityTable.activity_type == activity_type,
        )
    ).scalar_one_or_none()
    if not existing:
        db.add(
            DailyActivityTable(
                id=str(uuid4()),
                user_id=user_id,
                date=today,
                activity_type=activity_type,
            )
        )
        db.commit()


def check_and_unlock_badges(user_id: str, db: Session) -> list[str]:
    from datetime import date as date_type

    all_activities = (
        db.execute(
            select(DailyActivityTable).where(DailyActivityTable.user_id == user_id)
        )
        .scalars()
        .all()
    )

    already_unlocked = {
        row.badge_id
        for row in db.execute(
            select(UserBadgeTable).where(UserBadgeTable.user_id == user_id)
        )
        .scalars()
        .all()
    }

    dates_with_activity = sorted({a.date for a in all_activities})
    prep_count = sum(1 for a in all_activities if a.activity_type == "prep_session")
    mock_count = sum(1 for a in all_activities if a.activity_type == "mock_interview")
    job_count = sum(1 for a in all_activities if a.activity_type == "job_tracker")
    late_count = sum(
        1
        for a in all_activities
        if a.activity_type in ("prep_session", "mock_interview")
        and utc_now().replace(hour=int(a.date[-2:]) if False else 0).hour >= 21
    )

    # compute current streak
    streak = 0
    if dates_with_activity:
        today = today_iso()
        check = today
        for d in reversed(dates_with_activity):
            if d == check:
                streak += 1
                prev = (date_type.fromisoformat(check) - timedelta(days=1)).isoformat()
                check = prev
            elif d < check:
                break

    newly_unlocked: list[str] = []
    now = utc_now()

    def unlock(badge_id: str) -> None:
        if badge_id not in already_unlocked:
            db.add(
                UserBadgeTable(
                    id=str(uuid4()),
                    user_id=user_id,
                    badge_id=badge_id,
                    unlocked_at=now,
                )
            )
            newly_unlocked.append(badge_id)

    if dates_with_activity:
        unlock("first_steps")
    if streak >= 7:
        unlock("week_warrior")
    if streak >= 30:
        unlock("monthly_master")
    if streak >= 60:
        unlock("iron_will")
    if prep_count >= 10:
        unlock("scholar")
    if mock_count >= 5:
        unlock("interview_pro")
    if job_count >= 10:
        unlock("job_hunter")
    if late_count >= 10:
        unlock("night_owl")
    db.commit()
    return newly_unlocked


def stable_number(seed: str, minimum: int, maximum: int) -> int:
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    span = maximum - minimum + 1
    return minimum + (int(digest[:8], 16) % span)

def calculate_days_remaining(
    interview_date: str | None,
) -> int | None:

    if not interview_date:
        return None

    interview_dt = datetime.fromisoformat(interview_date).date()
    today = utc_now().date()

    if interview_dt < today:
        raise HTTPException(
            status_code=400,
            detail="Interview date cannot be in the past"
        )

    return max(
        1,
        (interview_dt - today).days
    )

def get_roadmap_days(
    days_remaining: int | None
) -> int:

    if days_remaining is None:
        return 5

    if days_remaining <= 2:
        return 2

    if days_remaining <= 5:
        return 5

    if days_remaining <= 14:
        return min(days_remaining, 10)

    return 10

async def call_openrouter_json(
    system_prompt: str,
    user_prompt: str,
    client: httpx.AsyncClient | None = None,
    history_messages: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    if GEMINI_API_KEY:
        url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
        model = GEMINI_MODEL
        headers = {
            "Authorization": f"Bearer {GEMINI_API_KEY}",
            "Content-Type": "application/json",
        }
        provider_name = "Gemini"
    else:
        if not OPENROUTER_API_KEY:
            raise OpenRouterError(
                "No API key configured (neither Gemini nor OpenRouter)"
            )
        url = "https://openrouter.ai/api/v1/chat/completions"
        model = OPENROUTER_MODEL
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": OPENROUTER_APP_URL,
            "X-Title": OPENROUTER_APP_NAME,
        }
        provider_name = "OpenRouter"

    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt},
    ]
    if history_messages:
        messages.extend(history_messages)
    messages.append({"role": "user", "content": user_prompt})

    payload = {
        "model": model,
        "response_format": {"type": "json_object"},
        "messages": messages,
    }

    max_retries = 3
    body = None
    for attempt in range(max_retries + 1):
        try:
            local_client = client
            if local_client is None:
                local_client = httpx.AsyncClient(
                    timeout=httpx.Timeout(5.0, read=OPENROUTER_TIMEOUT_SECONDS)
                )
                must_close = True
            else:
                must_close = False

            try:
                response = await local_client.post(
                    url,
                    json=payload,
                    headers=headers,
                )
            finally:
                if must_close:
                    await local_client.aclose()

            if response.status_code in (429, 503):
                if attempt < max_retries:
                    retry_after = response.headers.get("Retry-After")
                    if retry_after and retry_after.isdigit():
                        backoff = int(retry_after)
                    else:
                        backoff = 2**attempt

                    logger.warning(
                        "%s returned status %d. Retrying in %ds (attempt %d/%d)...",
                        provider_name,
                        response.status_code,
                        backoff,
                        attempt + 1,
                        max_retries,
                    )
                    await asyncio.sleep(backoff)
                    continue
                else:
                    raise OpenRouterError(
                        f"{provider_name} request failed with status {response.status_code} "
                        f"after {max_retries} retries"
                    )

            response.raise_for_status()
            body = response.json()
            break
        except httpx.HTTPStatusError as exc:
            raise OpenRouterError(
                f"{provider_name} request failed: {exc.response.status_code} {exc.response.text}"
            ) from exc
        except httpx.RequestError as exc:
            raise OpenRouterError(f"{provider_name} connection failed: {exc}") from exc

    if not body:
        raise OpenRouterError(
            f"{provider_name} request failed to return a response body"
        )

    try:
        raw_content = body["choices"][0]["message"]["content"]
        if raw_content is None:
            raise OpenRouterError(f"{provider_name} returned empty message content")
        content = raw_content.strip()
        # Clean markdown code blocks if the LLM wrapped the JSON response
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\s*\n?", "", content)
            content = re.sub(r"\n?\s*```$", "", content)
            content = content.strip()
        return json.loads(content)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise OpenRouterError(
            f"{provider_name} returned an invalid response format"
        ) from exc


async def generate_session_payload(
    job_title: str,
    company: str,
    jd_text: str,
    resume_text: str,
    days_remaining: int | None = None,
    client: httpx.AsyncClient | None = None,
) -> tuple[list[GapItem], int, list[QuestionItem], list[RoadmapDay], bool]:
    target_days = get_roadmap_days(
            days_remaining
        )
    try:
        response = await call_openrouter_json(
            system_prompt=(
                "You generate structured interview preparation data. "
                "Return valid JSON only. Do not include markdown or explanations. "
                "Use exactly this schema: "
                '{"gapAnalysis":[{"skill":"string","have":"string","need":"string","gapLevel":"Low|Medium|High"}],'
                '"readinessScore":0,'
                '"questionBank":[{"question":"string","type":"behavioral|technical|situational","difficulty":"easy|medium|hard","tip":"string"}],'
                '"roadmap":[{"day":1,"focusArea":"string","tasks":["string"]}]}. '
                "gapAnalysis must be an array with 3 to 5 items. "
                "questionBank must be an array with 6 to 10 items. "
                f"roadmap must be an array with exactly {target_days} days."
            ),
            user_prompt=(
                f"Job title: {job_title}\n"
                f"Company: {company}\n"
                f"Job description:\n{jd_text or 'Not provided'}\n\n"
                f"Resume:\n{resume_text or 'Not provided'}\n\n"
                "Generate concise, realistic prep content for an interview prep dashboard."
            ),
            client=client,
        )
        if isinstance(response, list) and len(response) > 0:
            response = response[0]
        if not isinstance(response, dict):
            response = {}
        norm_res = {k.lower(): v for k, v in response.items()}

        def norm_dict(d, mapping):
            if not isinstance(d, dict):
                return d
            norm = {}
            lowered = {k.lower().replace("_", ""): v for k, v in d.items()}
            for model_k, alternate_keys in mapping.items():
                val = None
                for alt in alternate_keys:
                    if alt in lowered:
                        val = lowered[alt]
                        break
                norm[model_k] = val
            return norm

        gap_mapping = {
            "skill": ["skill", "name"],
            "have": ["have", "current"],
            "need": ["need", "required"],
            "gapLevel": ["gaplevel", "level", "gap"],
        }
        q_mapping = {
            "question": ["question", "text"],
            "type": ["type", "category"],
            "difficulty": ["difficulty", "level"],
            "tip": ["tip", "hint"],
        }
        roadmap_mapping = {
            "day": ["day", "number"],
            "focusArea": ["focusarea", "area", "focus"],
            "tasks": ["tasks", "todo"],
        }

        raw_gap = norm_res.get("gapanalysis", [])
        gap_analysis = [
            GapItem(**norm_dict(item, gap_mapping))
            for item in raw_gap
            if isinstance(item, dict)
        ]

        readiness_val = norm_res.get("readinessscore", norm_res.get("readiness", 50))
        readiness = max(0, min(100, int(readiness_val)))

        raw_questions = norm_res.get("questionbank", [])
        question_bank = [
            QuestionItem(**norm_dict(item, q_mapping))
            for item in raw_questions
            if isinstance(item, dict)
        ]

        raw_roadmap = norm_res.get("roadmap", [])
        roadmap = [
            RoadmapDay(**norm_dict(item, roadmap_mapping))
            for item in raw_roadmap
            if isinstance(item, dict)
        ]
        if len(roadmap) != target_days:
            raise ValueError(
                "Incorrect roadmap length"
            )

        if len(roadmap) >= 1 and len(question_bank) >= 1 and len(gap_analysis) >= 1:
            return gap_analysis, readiness, question_bank, roadmap, False
    except (OpenRouterError, KeyError, TypeError, ValueError) as exc:
        logger.warning(
            "Using fallback prep session payload because OpenRouter failed: %s", exc
        )

    scores = compute_match_score(resume_text, jd_text)
    readiness = scores["overallScore"]
    gap_analysis = [
        GapItem(skill="React", have="Intermediate", need="Advanced", gapLevel="Medium"),
        GapItem(skill="System Design", have="Basic", need="Advanced", gapLevel="High"),
        GapItem(skill="TypeScript", have="Advanced", need="Advanced", gapLevel="Low"),
        GapItem(skill="CI/CD", have="Basic", need="Intermediate", gapLevel="Medium"),
        GapItem(
            skill="Testing", have="Intermediate", need="Advanced", gapLevel="Medium"
        ),
    ]
    question_bank = [
        QuestionItem(
            question="Tell me about a challenging project at your previous role.",
            type="behavioral",
            difficulty="medium",
            tip="Use the STAR method.",
        ),
        QuestionItem(
            question=f"How would you design a scalable API for {company}?",
            type="technical",
            difficulty="hard",
            tip="Start with requirements and tradeoffs.",
        ),
        QuestionItem(
            question="What would you do if a teammate disagreed with your approach?",
            type="situational",
            difficulty="easy",
            tip="Show empathy and a path to alignment.",
        ),
        QuestionItem(
            question="Explain the difference between REST and GraphQL.",
            type="technical",
            difficulty="medium",
            tip="Cover strengths, weaknesses, and use cases.",
        ),
        QuestionItem(
            question=f"Why do you want to work at {company}?",
            type="behavioral",
            difficulty="easy",
            tip="Tie your answer to specific company priorities.",
        ),
        QuestionItem(
            question="How would you handle a production outage?",
            type="situational",
            difficulty="hard",
            tip="Demonstrate triage, communication, and follow-through.",
        ),
    ]

    focus_areas = [
        "Company Research",
        "Technical Review",
        "Behavioral Prep",
        "Mock Interviews",
        "Final Review",
        "Advanced Practice",
        "System Design",
        "Leadership Stories",
        "Full Simulation",
        "Interview Readiness",
    ]

    roadmap = []

    for day in range(1, target_days + 1):
        roadmap.append(
            RoadmapDay(
                day=day,
                focusArea=focus_areas[
                    min(day - 1, len(focus_areas)-1)
                ],
                tasks=[
                    f"Complete {focus_areas[min(day - 1, len(focus_areas)-1)]}",
                    "Review weak areas",
                    "Take notes"
                ]
            )
        )
    is_estimated = not resume_text.strip() and not jd_text.strip()
    return gap_analysis, readiness, question_bank, roadmap, is_estimated


def _significant_tokens(text: str) -> set[str]:
    stopwords = {
        "the",
        "and",
        "a",
        "an",
        "of",
        "to",
        "is",
        "are",
        "in",
        "for",
        "on",
        "with",
        "that",
        "this",
        "it",
        "as",
        "at",
        "by",
        "from",
        "be",
        "or",
        "not",
        "have",
        "has",
        "was",
        "were",
        "will",
        "can",
        "i",
        "you",
        "your",
        "we",
        "our",
        "they",
        "their",
        "what",
        "which",
        "when",
        "where",
        "why",
        "how",
        "do",
        "does",
        "did",
        "so",
        "but",
        "if",
        "then",
        "because",
        "there",
        "these",
        "those",
        "meaning",
    }
    return {
        token.lower()
        for token in re.findall(r"\b[a-zA-Z]{3,}\b", text)
        if token.lower() not in stopwords
    }


FALLBACK_TECHNICAL_TERMS = {
    "model",
    "data",
    "training",
    "test",
    "accuracy",
    "performance",
    "generalize",
    "generalization",
    "variance",
    "bias",
    "overfit",
    "overfitting",
    "unseen",
    "feature",
    "dataset",
    "classification",
    "regression",
    "optimization",
    "neural",
    "network",
    "algorithm",
    "prediction",
    "validation",
    "loss",
    "error",
    "regularization",
    "parameter",
}


def _fallback_answer_quality(question: str, answer: str) -> float:
    answer_tokens = _significant_tokens(answer)
    question_tokens = _significant_tokens(question)

    overlap = len(question_tokens & answer_tokens) / max(1, len(question_tokens))
    technical_count = sum(
        1 for token in answer_tokens if token in FALLBACK_TECHNICAL_TERMS
    )
    technical_density = min(1.0, technical_count / 4)

    explanatory = bool(
        re.search(
            r"\b(?:because|since|therefore|thus|for example|specifically|explain|describe|meaning|understand|understanding)\b",
            answer,
            re.I,
        )
    )

    length_score = min(1.0, len(answer_tokens) / 20)
    quality = max(overlap, technical_density * 0.7 + length_score * 0.3)
    if explanatory:
        quality = min(1.0, quality + 0.15)
    return quality


async def evaluate_mock_attempt(
    question: str, answer: str, client: httpx.AsyncClient | None = None
) -> tuple[int, MockFeedback]:
    confidence = ConfidenceAnalysis(**analyze_confidence(answer))

    answer_text = answer.strip()
    answer_words = re.findall(r"\w+", answer_text)
    if (
        len(answer_words) < 5
        or len(answer_text) < 20
        or max((len(w) for w in answer_words), default=0) > 25
    ):
        return 1, MockFeedback(
            strengths=["Attempted to respond"],
            missing=[
                "The answer provided was unintelligible or too short to read.",
                "Provide a clear, detailed explanation.",
            ],
            modelAnswer=(
                "A strong answer should set the context, explain the challenge, describe the action taken, "
                "and close with a measurable result. Use a concrete example, include numbers where possible."
            ),
            oneLineVerdict="Answer was unintelligible or significantly lacking detail.",
            confidenceAnalysis=confidence,
        )

    try:
        response = await call_openrouter_json(
            system_prompt=(
                "You evaluate interview answers. "
                "CRITICAL: If the answer is gibberish, extremely short, or completely irrelevant, "
                "you MUST give it a low score (1-3) and state that it is unintelligible or irrelevant in the feedback. "
                "Return valid JSON only. Do not include markdown or explanations. "
                "Use exactly this schema: "
                '{"aiScore":7,"strengths":["string"],"missing":["string"],"modelAnswer":"string","oneLineVerdict":"string"}. '
                "aiScore must be an integer from 1 to 10. "
                "strengths and missing must each be arrays with 2 to 4 concise strings."
            ),
            user_prompt=(
                f"Question:\n{question}\n\n"
                f"Candidate answer:\n{answer}\n\n"
                "Evaluate the answer for a job-seeker preparation product."
            ),
            client=client,
        )
        if isinstance(response, list) and len(response) > 0:
            response = response[0]
        if not isinstance(response, dict):
            response = {}
        norm_res = {k.lower(): v for k, v in response.items()}

        score_val = norm_res.get("aiscore", norm_res.get("score", 7))
        score = max(1, min(10, int(score_val)))

        strengths = norm_res.get("strengths", ["Attempted to answer"])
        missing = norm_res.get(
            "missing", norm_res.get("areas to improve", norm_res.get("weaknesses", []))
        )
        model_answer = norm_res.get(
            "modelanswer",
            norm_res.get(
                "model_answer", "Practice structured responses using STAR method."
            ),
        )
        verdict = norm_res.get(
            "onelineverdict", norm_res.get("verdict", "Basic response submitted.")
        )

        feedback = MockFeedback(
            strengths=[str(item) for item in strengths]
            if isinstance(strengths, list)
            else [str(strengths)],
            missing=[str(item) for item in missing]
            if isinstance(missing, list)
            else [str(missing)],
            modelAnswer=str(model_answer),
            oneLineVerdict=str(verdict),
            confidenceAnalysis=confidence,
        )
        if feedback.strengths and feedback.missing:
            return score, feedback
    except (OpenRouterError, KeyError, TypeError, ValueError) as exc:
        logger.warning(
            "Using fallback mock feedback because OpenRouter failed: %s", exc
        )

    base_seed = f"{question}|{answer}"
    answer_text = answer.strip()
    answer_words = re.findall(r"\w+", answer_text)
    quality = _fallback_answer_quality(question, answer_text)

    if len(answer_words) < 10 or len(answer_text) < 40:
        score = stable_number(base_seed, 1, 3)
        strengths = ["Basic response submitted"]
        missing = [
            "Answer was too short to fully evaluate.",
            "Provide a fuller explanation with technical detail or examples.",
        ]
        verdict = "Too short and lacking detail."
    elif quality < 0.35:
        score = stable_number(base_seed, 1, 4)
        strengths = ["Attempted to answer the question"]
        missing = [
            "The answer did not clearly address the question.",
            "Add more relevant explanation and avoid one-word responses.",
        ]
        verdict = "Low relevance and insufficient detail."
    elif quality < 0.55:
        score = stable_number(base_seed, 3, 6)
        strengths = ["Some relevant terms were included"]
        missing = [
            "Explain the concept more directly in relation to the question.",
            "Add a concrete example or clearer reasoning.",
        ]
        verdict = "Basic response, needs a stronger explanation."
    else:
        score = stable_number(base_seed, 5, 8)
        if len(answer_text) > 400:
            score = min(score + 1, 10)
        if len(answer_text) < 120:
            score = max(score - 1, 4)

        strengths = [
            "Relevant concepts are referenced",
            "Answer has a reasonable structure",
        ]
        missing = [
            "Add more specific examples to strengthen the response",
            "Clarify the impact or outcome more directly",
        ]
        verdict = (
            "Excellent response with strong examples!"
            if score >= 8
            else "Good structure, but lacked specific examples"
        )

    return score, MockFeedback(
        strengths=strengths,
        missing=missing,
        modelAnswer=(
            "A strong answer should set the context, explain the challenge, describe the action taken, "
            "and close with a measurable result. Use a concrete example, include numbers where possible, "
            "and connect the outcome back to the role you are targeting."
        ),
        oneLineVerdict=verdict,
        confidenceAnalysis=confidence,
    )


# Initialize HTTPBearer security scheme for Swagger UI
security = HTTPBearer(
    scheme_name="Bearer",
    description="JWT Bearer token",
    auto_error=False,
)


def require_current_user(
    user_id: str | None = None,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> UserTable:

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )

    token = credentials.credentials
    payload = decode_token(token)

    token_user_id = payload.get("sub")

    if user_id is not None and token_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden",
        )

    user = db.get(UserTable, token_user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


async def validate_payload_size(request: Request) -> None:
    body = await request.body()
    if len(body) > 5242880:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Request entity too large",
        )

class ContactRequest(BaseModel):
    name: str
    email: str
    subject: str
    message: str
app = FastAPI(title="PrepIQ Backend", version="2.0.0")



@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    tb = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    logger.error(f"Unhandled exception: {tb}")
    return Response(
        content=f"Internal Server Error\n\nTraceback:\n{tb}",
        media_type="text/plain",
        status_code=500,
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.on_event("startup")
async def startup() -> None:
    app.state.httpx_client = httpx.AsyncClient(
        timeout=httpx.Timeout(5.0, read=OPENROUTER_TIMEOUT_SECONDS),
        limits=httpx.Limits(max_keepalive_connections=20, max_connections=100),
    )
    try:
        Base.metadata.create_all(bind=engine)

        from sqlalchemy import text

        # 1. users Table anonymous_mode column
        try:
            with engine.begin() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN anonymous_mode BOOLEAN DEFAULT FALSE"
                    )
                )
        except Exception as e:
            logging.getLogger(__name__).info(f"Migration users anonymous_mode ignored: {e}")

        # 2. mentor_chat_history Table session_id column
        try:
            with engine.begin() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE mentor_chat_history ADD COLUMN session_id VARCHAR(36)"
                    )
                )
        except Exception as e:
            logging.getLogger(__name__).info(f"Migration mentor_chat_history session_id ignored: {e}")

        # 3. interview_sessions Table interview_date column
        try:
            with engine.begin() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE interview_sessions ADD COLUMN interview_date VARCHAR(32)"
                    )
                )
        except Exception as e:
            logging.getLogger(__name__).info(f"Migration interview_sessions interview_date ignored: {e}")

        # 4. job_applications Table sort_order column
        try:
            with engine.begin() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE job_applications ADD COLUMN sort_order INTEGER DEFAULT 0"
                    )
                )
        except Exception as e:
            logging.getLogger(__name__).info(f"Migration job_applications sort_order ignored: {e}")

        # 5. interview_sessions Table is_estimated column
        try:
            with engine.begin() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE interview_sessions ADD COLUMN is_estimated BOOLEAN DEFAULT FALSE"
                    )
                )
        except Exception as e:
            logging.getLogger(__name__).info(f"Migration interview_sessions is_estimated ignored: {e}")

        # 6. mentor_chat_history data migration
        try:
            with engine.begin() as conn:
                res = conn.execute(
                    text(
                        "SELECT COUNT(*) FROM mentor_chat_history WHERE session_id IS NULL"
                    )
                )
                if res.scalar() > 0:
                    users = conn.execute(
                        text(
                            "SELECT DISTINCT user_id FROM mentor_chat_history WHERE session_id IS NULL"
                        )
                    ).fetchall()
                    for row in users:
                        uid = row[0]
                        sid = str(uuid4())
                        now_dt = utc_now()
                        conn.execute(
                            text(
                                "INSERT INTO mentor_chat_sessions (id, user_id, title, created_at, updated_at) VALUES (:id, :uid, :title, :now, :now)"
                            ),
                            {
                                "id": sid,
                                "uid": uid,
                                "title": "Previous Chats",
                                "now": now_dt,
                            },
                        )
                        conn.execute(
                            text(
                                "UPDATE mentor_chat_history SET session_id = :sid WHERE user_id = :uid AND session_id IS NULL"
                            ),
                            {"sid": sid, "uid": uid},
                        )
        except Exception as e:
            logging.getLogger(__name__).warning(f"Migration error: {e}")
    except Exception:
        logging.getLogger(__name__).exception("Failed to create database tables")
        raise


@app.on_event("shutdown")
async def shutdown() -> None:
    client = getattr(app.state, "httpx_client", None)
    if client is not None:
        await client.aclose()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
@app.post("/api/contact")
async def contact(payload: ContactRequest):
    try:
        if not RESEND_API_KEY:
            raise HTTPException(
                status_code=500,
                detail="RESEND_API_KEY is not configured"
            )

        if not CONTACT_EMAIL:
            raise HTTPException(
                status_code=500,
                detail="CONTACT_EMAIL is not configured"
            )

        resend.Emails.send(
            {
                "from": "onboarding@resend.dev",
                "to": [CONTACT_EMAIL],
                "subject": f"PrepIQ Contact: {payload.subject}",
                "reply_to": payload.email,
                "html": f"""
                <h2>New Contact Form Submission</h2>

                <p><strong>Name:</strong> {payload.name}</p>
                <p><strong>Email:</strong> {payload.email}</p>
                <p><strong>Subject:</strong> {payload.subject}</p>

                <p><strong>Message:</strong></p>
                <p>{payload.message}</p>
                """,
            }
        )

        return {
            "success": True,
            "message": "Message sent successfully"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {str(e)}"
        )


@app.get("/api/debug-db")
def debug_db(db: Session = Depends(get_db)):
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        schema = {}
        for table in tables:
            columns = inspector.get_columns(table)
            schema[table] = [col["name"] for col in columns]
        return {"status": "ok", "tables": schema}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.execute(
        select(UserTable).where(UserTable.email == payload.email.lower())
    ).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    token = encode_token(
        {
            "sub": user.id,
            "email": user.email,
            "exp": int(
                (utc_now() + timedelta(hours=ACCESS_TOKEN_TTL_HOURS)).timestamp()
            ),
        }
    )
    return AuthResponse(user=user_from_table(user), token=token)


@app.post(
    "/api/auth/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED
)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
    # Validate password strength
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters",
        )

    # Enhanced password validation
    has_upper = any(c.isupper() for c in payload.password)
    has_lower = any(c.islower() for c in payload.password)
    has_digit = any(c.isdigit() for c in payload.password)
    has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in payload.password)

    missing_requirements = []
    if not has_upper:
        missing_requirements.append("one uppercase letter")
    if not has_lower:
        missing_requirements.append("one lowercase letter")
    if not has_digit:
        missing_requirements.append("one number")
    if not has_special:
        missing_requirements.append("one special character")

    if missing_requirements:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Password must contain {', '.join(missing_requirements)}",
        )

    # Validate email format
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", payload.email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid email format",
        )

    # Validate name format (letters and spaces only)
    if not re.match(r"^[A-Za-z\s]+$", payload.name.strip()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Name can only contain letters and spaces",
        )

    # Check if email already exists
    existing = db.execute(
        select(UserTable).where(UserTable.email == payload.email.lower())
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already exists"
        )

    user = UserTable(
        id=str(uuid4()),
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
        created_at=utc_now(),
    )
    db.add(user)
    db.commit()

    token = encode_token(
        {
            "sub": user.id,
            "email": user.email,
            "exp": int(
                (utc_now() + timedelta(hours=ACCESS_TOKEN_TTL_HOURS)).timestamp()
            ),
        }
    )
    return AuthResponse(user=user_from_table(user), token=token)


@app.get("/api/auth/me", response_model=User)
def me(current_user: UserTable = Depends(require_current_user)) -> User:
    return user_from_table(current_user)


@app.get("/api/users/{user_id}/profile", response_model=CareerProfile | None)
def get_profile(
    user_id: str,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> CareerProfile | None:
    profile = db.get(ProfileTable, user_id)
    return profile_from_table(profile) if profile else None


@app.put("/api/users/{user_id}/profile", response_model=CareerProfile)
def save_profile(
    user_id: str,
    profile: CareerProfile,
    user: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> CareerProfile:
    if profile.userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Profile user mismatch"
        )

    payload = profile.model_dump(by_alias=True)
    payload["email"] = user.email
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
def get_sessions(
    user_id: str,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> list[InterviewSession]:
    rows = db.execute(
        select(InterviewSessionTable)
        .where(InterviewSessionTable.user_id == user_id)
        .order_by(InterviewSessionTable.created_at.asc())
    ).scalars()
    return [session_from_table(row) for row in rows]


@app.get("/api/users/{user_id}/sessions/{session_id}", response_model=InterviewSession)
def get_session(
    user_id: str,
    session_id: str,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> InterviewSession:
    row = db.execute(
        select(InterviewSessionTable).where(
            InterviewSessionTable.id == session_id,
            InterviewSessionTable.user_id == user_id,
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )
    return session_from_table(row)


@app.post(
    "/api/users/{user_id}/sessions",
    response_model=InterviewSession,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(validate_payload_size)],
)
async def create_session(
    user_id: str,
    payload: CreateInterviewSessionRequest,
    request: Request,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> InterviewSession:
    client = getattr(request.app.state, "httpx_client", None)
    days_remaining = calculate_days_remaining(
        payload.interviewDate
    )
    (
        gap_analysis,
        readiness,
        question_bank,
        roadmap,
        is_estimated,
    ) = await generate_session_payload(
        payload.jobTitle,
        payload.company,
        payload.jdText,
        payload.resumeText,
        days_remaining=days_remaining,
        client=client,
    )

    skills = extract_skills(payload.resumeText)
    scores = compute_match_score(payload.resumeText, payload.jdText)
    ml_score = scores["overallScore"]

    row = InterviewSessionTable(
        id=str(uuid4()),
        user_id=user_id,
        job_title=payload.jobTitle,
        company=payload.company,
        interview_date=payload.interviewDate,
        jd_text=payload.jdText,
        resume_text=payload.resumeText,
        is_estimated=is_estimated,
        gap_analysis=[item.model_dump() for item in gap_analysis],
        readiness_score=readiness,
        question_bank=[item.model_dump() for item in question_bank],
        roadmap=[item.model_dump() for item in roadmap],
        extracted_skills=skills,
        ml_match_score=ml_score,
        created_at=utc_now(),
    )
    db.add(row)
    db.commit()
    track_activity(user_id, "prep_session", db)
    return session_from_table(row)


@app.delete(
    "/api/users/{user_id}/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
def delete_session(
    user_id: str,
    session_id: str,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> Response:
    session = db.execute(
        select(InterviewSessionTable).where(
            InterviewSessionTable.id == session_id,
            InterviewSessionTable.user_id == user_id,
        )
    ).scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )

    db.execute(
        delete(MockAttemptTable).where(
            MockAttemptTable.session_id == session_id,
            MockAttemptTable.user_id == user_id,
        )
    )
    db.delete(session)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/users/{user_id}/mocks", response_model=PaginatedMockAttempts)
def get_mock_attempts(
    user_id: str,
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
        description="No. of results that will be returned (1-100)",
    ),
    offset: int = Query(
        default=0, ge=0, description="Number of results that has to be skipped"
    ),
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> PaginatedMockAttempts:
    base_filter = MockAttemptTable.user_id == user_id
    total = db.execute(
        select(func.count()).select_from(MockAttemptTable).where(base_filter)
    ).scalar_one()
    rows = (
        db.execute(
            select(MockAttemptTable)
            .where(base_filter)
            .order_by(MockAttemptTable.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
        .scalars()
        .all()
    )
    return PaginatedMockAttempts(
        items=[mock_from_table(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@app.post(
    "/api/users/{user_id}/mocks",
    response_model=MockAttempt,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(validate_payload_size)],
)
async def create_mock_attempt(
    user_id: str,
    payload: CreateMockAttemptRequest,
    request: Request,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> MockAttempt:
    if not payload.question.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Question must not be empty",
        )
    if not payload.userAnswer.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Answer must not be empty",
        )

    client = getattr(request.app.state, "httpx_client", None)
    score, feedback = await evaluate_mock_attempt(
        payload.question, payload.userAnswer, client=client
    )
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
    track_activity(user_id, "mock_interview", db)
    return mock_from_table(row)


@app.get("/api/users/{user_id}/jobs", response_model=list[JobApplication])
def get_jobs(
    user_id: str,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> list[JobApplication]:
    rows = db.execute(
        select(JobApplicationTable)
        .where(JobApplicationTable.user_id == user_id)
        .order_by(
            JobApplicationTable.sort_order.asc(), JobApplicationTable.created_at.asc()
        )
    ).scalars()
    return [job_from_table(row) for row in rows]


@app.post(
    "/api/users/{user_id}/jobs",
    response_model=JobApplication,
    status_code=status.HTTP_201_CREATED,
)
def create_job(
    user_id: str,
    payload: CreateJobApplicationRequest,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> JobApplication:
    now = utc_now()
    max_sort = db.execute(
        select(func.max(JobApplicationTable.sort_order))
        .where(JobApplicationTable.user_id == user_id)
        .where(JobApplicationTable.status == payload.status)
    ).scalar()
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
        sort_order=(max_sort or 0) + 1,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    track_activity(user_id, "job_tracker", db)
    return job_from_table(row)


@app.patch("/api/users/{user_id}/jobs/{job_id}", response_model=JobApplication)
def update_job(
    user_id: str,
    job_id: str,
    payload: UpdateJobApplicationRequest,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> JobApplication:
    job = db.execute(
        select(JobApplicationTable).where(
            JobApplicationTable.id == job_id, JobApplicationTable.user_id == user_id
        )
    ).scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job application not found"
        )

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
        "sortOrder": "sort_order",
    }
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(job, field_map[key], value)
    job.updated_at = utc_now()
    db.commit()
    return job_from_table(job)


@app.delete(
    "/api/users/{user_id}/jobs/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
def delete_job(
    user_id: str,
    job_id: str,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> Response:
    job = db.execute(
        select(JobApplicationTable).where(
            JobApplicationTable.id == job_id,
            JobApplicationTable.user_id == user_id,
        )
    ).scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job application not found"
        )

    db.delete(job)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Question Generation endpoint (no DB required)
# ---------------------------------------------------------------------------

VALID_ROLES = {
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Machine Learning Engineer",
    "Data Scientist",
}

VALID_DIFFICULTIES = {"Easy", "Medium", "Hard"}


class GenerateQuestionRequest(BaseModel):
    role: str
    difficulty: str


class GenerateQuestionResponse(BaseModel):
    question: str


@app.post(
    "/api/users/{user_id}/mock/generate-question",
    response_model=GenerateQuestionResponse,
    dependencies=[Depends(validate_payload_size)],
)
async def generate_mock_question(
    user_id: str,
    payload: GenerateQuestionRequest,
    _: UserTable = Depends(require_current_user),
) -> GenerateQuestionResponse:
    if payload.role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid role. Must be one of: {', '.join(sorted(VALID_ROLES))}",
        )
    if payload.difficulty not in VALID_DIFFICULTIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid difficulty. Must be one of: {', '.join(sorted(VALID_DIFFICULTIES))}",
        )

    try:
        response = await call_openrouter_json(
            system_prompt=(
                "You generate realistic technical and behavioral interview questions. "
                "Return valid JSON only. Do not include markdown or explanations. "
                'Use exactly this schema: {"question": "string"}. '
                "Return only the question text - no numbering, no preamble, no tips."
            ),
            user_prompt=(
                f"Generate one realistic {payload.difficulty}-level interview question "
                f"for a {payload.role} position. "
                "Return only the question itself as a JSON object."
            ),
        )
        question_text = str(response.get("question", "")).strip()
        if not question_text:
            raise OpenRouterError("Empty question returned")
        return GenerateQuestionResponse(question=question_text)

    except OpenRouterError:
        fallbacks: dict[str, dict[str, str]] = {
            "Frontend Developer": {
                "Easy": "What is the difference between `null` and `undefined` in JavaScript?",
                "Medium": "Explain how React's reconciliation algorithm determines what to re-render.",
                "Hard": "Design a virtualized list component that renders 100,000 rows without performance degradation.",
            },
            "Backend Developer": {
                "Easy": "What is the difference between SQL and NoSQL databases?",
                "Medium": "How would you design a rate-limiting middleware for a REST API?",
                "Hard": "Describe how you would implement distributed transactions across two microservices without two-phase commit.",
            },
            "Full Stack Developer": {
                "Easy": "What happens between a user typing a URL and the page loading in the browser?",
                "Medium": "How would you handle authentication state across a React SPA and a Node.js API?",
                "Hard": "Design a real-time collaborative document editor - describe both the frontend state model and the backend sync strategy.",
            },
            "Machine Learning Engineer": {
                "Easy": "What is the difference between supervised and unsupervised learning?",
                "Medium": "How would you handle class imbalance in a binary classification problem?",
                "Hard": "Describe how you would architect an end-to-end MLOps pipeline for a model serving 10M predictions per day.",
            },
            "Data Scientist": {
                "Easy": "What is the purpose of cross-validation in model evaluation?",
                "Medium": "Explain the bias-variance tradeoff and how it guides your choice of model complexity.",
                "Hard": "You suspect multicollinearity in your regression model. Walk through how you'd detect it and what you'd do.",
            },
        }
        fallback_q = fallbacks.get(payload.role, {}).get(
            payload.difficulty,
            "Tell me about a challenging technical problem you solved and how you approached it.",
        )
        return GenerateQuestionResponse(question=fallback_q)


# ---------------------------------------------------------------------------
# ML/NLP endpoints
# ---------------------------------------------------------------------------


class ExtractSkillsRequest(BaseModel):
    text: str


class ExtractSkillsResponse(BaseModel):
    skills: list[str]
    count: int


class MatchScoreRequest(BaseModel):
    resumeText: str
    jdText: str


class MatchScoreResponse(BaseModel):
    score: int
    overallScore: int
    semanticScore: int
    keywordOverlapScore: int
    label: str


class ConfidenceRequest(BaseModel):
    text: str


@app.post(
    "/api/ml/extract-skills",
    response_model=ExtractSkillsResponse,
    dependencies=[Depends(require_current_user), Depends(validate_payload_size)],
)
def ml_extract_skills(payload: ExtractSkillsRequest) -> ExtractSkillsResponse:
    skills = extract_skills(payload.text)
    return ExtractSkillsResponse(skills=skills, count=len(skills))


@app.post(
    "/api/ml/match-score",
    response_model=MatchScoreResponse,
    dependencies=[Depends(require_current_user), Depends(validate_payload_size)],
)
def ml_match_score(payload: MatchScoreRequest) -> MatchScoreResponse:
    scores = compute_match_score(payload.resumeText, payload.jdText)
    score = scores["overallScore"]
    label = (
        "Strong match"
        if score >= 70
        else "Moderate match"
        if score >= 50
        else "Weak match"
    )
    return MatchScoreResponse(
        score=score,
        overallScore=scores["overallScore"],
        semanticScore=scores["semanticScore"],
        keywordOverlapScore=scores["keywordOverlapScore"],
        label=label,
    )


@app.post(
    "/api/ml/analyze-confidence",
    response_model=ConfidenceAnalysis,
    dependencies=[Depends(require_current_user), Depends(validate_payload_size)],
)
def ml_analyze_confidence(payload: ConfidenceRequest) -> ConfidenceAnalysis:
    result = analyze_confidence(payload.text)
    return ConfidenceAnalysis(**result)


class MentorChatSessionModel(BaseModel):
    id: str
    userId: str
    title: str
    createdAt: str
    updatedAt: str


class MentorChatSessionUpdate(BaseModel):
    title: str


class MentorChatMessage(BaseModel):
    id: str
    role: str
    content: str
    created_at: str


class MentorChatRequest(BaseModel):
    message: str = Field(max_length=4000)


@app.get(
    "/api/users/{user_id}/mentor-chat/sessions",
    response_model=list[MentorChatSessionModel],
)
def get_mentor_chat_sessions(
    user_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
) -> list[MentorChatSessionModel]:
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    sessions = db.scalars(
        select(MentorChatSessionTable)
        .where(MentorChatSessionTable.user_id == user_id)
        .order_by(MentorChatSessionTable.updated_at.desc())
    ).all()

    return [
        MentorChatSessionModel(
            id=s.id,
            userId=s.user_id,
            title=s.title,
            createdAt=s.created_at.isoformat(),
            updatedAt=s.updated_at.isoformat(),
        )
        for s in sessions
    ]


@app.post(
    "/api/users/{user_id}/mentor-chat/sessions", response_model=MentorChatSessionModel
)
def create_mentor_chat_session(
    user_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
) -> MentorChatSessionModel:
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    sid = str(uuid4())
    now_dt = utc_now()
    new_session = MentorChatSessionTable(
        id=sid, user_id=user_id, title="New Chat", created_at=now_dt, updated_at=now_dt
    )
    db.add(new_session)
    db.commit()
    return MentorChatSessionModel(
        id=new_session.id,
        userId=new_session.user_id,
        title=new_session.title,
        createdAt=new_session.created_at.isoformat(),
        updatedAt=new_session.updated_at.isoformat(),
    )


@app.patch(
    "/api/users/{user_id}/mentor-chat/sessions/{session_id}",
    response_model=MentorChatSessionModel,
)
def update_mentor_chat_session(
    user_id: str,
    session_id: str,
    payload: MentorChatSessionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
) -> MentorChatSessionModel:
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    session = db.get(MentorChatSessionTable, session_id)
    if not session or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")

    session.title = payload.title
    session.updated_at = utc_now()
    db.commit()

    return MentorChatSessionModel(
        id=session.id,
        userId=session.user_id,
        title=session.title,
        createdAt=session.created_at.isoformat(),
        updatedAt=session.updated_at.isoformat(),
    )


@app.delete("/api/users/{user_id}/mentor-chat/sessions/{session_id}")
def delete_mentor_chat_session(
    user_id: str,
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
) -> dict[str, str]:
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    session = db.get(MentorChatSessionTable, session_id)
    if not session or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")

    db.execute(
        delete(MentorChatHistoryTable).where(
            MentorChatHistoryTable.session_id == session_id
        )
    )
    db.delete(session)
    db.commit()

    return {"status": "ok"}


@app.get(
    "/api/users/{user_id}/mentor-chat/sessions/{session_id}/messages",
    response_model=list[MentorChatMessage],
)
def get_mentor_chat_messages(
    user_id: str,
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
) -> list[MentorChatMessage]:
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    history = db.scalars(
        select(MentorChatHistoryTable)
        .where(
            MentorChatHistoryTable.user_id == user_id,
            MentorChatHistoryTable.session_id == session_id,
        )
        .order_by(MentorChatHistoryTable.created_at.asc())
    ).all()

    return [
        MentorChatMessage(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            created_at=msg.created_at.isoformat(),
        )
        for msg in history
    ]


@app.post(
    "/api/users/{user_id}/mentor-chat/sessions/{session_id}/messages",
    dependencies=[Depends(validate_payload_size)],
)
async def post_mentor_chat_message(
    user_id: str,
    session_id: str,
    payload: MentorChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
) -> dict[str, str]:
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    session = db.get(MentorChatSessionTable, session_id)
    if not session or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")

    now_dt = utc_now()
    user_msg_id = str(uuid4())
    user_entry = MentorChatHistoryTable(
        id=user_msg_id,
        session_id=session_id,
        user_id=user_id,
        role="user",
        content=payload.message,
        created_at=now_dt,
    )
    db.add(user_entry)

    if session.title == "New Chat":
        words = payload.message.split()
        title = " ".join(words[:5]) + ("..." if len(words) > 5 else "")
        session.title = title

    session.updated_at = now_dt
    db.commit()

    history = db.scalars(
        select(MentorChatHistoryTable)
        .where(
            MentorChatHistoryTable.user_id == user_id,
            MentorChatHistoryTable.session_id == session_id,
        )
        .order_by(MentorChatHistoryTable.created_at.asc())
    ).all()

    profile_record = db.get(ProfileTable, user_id)
    profile_info = ""
    if profile_record:
        p = profile_from_table(profile_record)
        profile_info = (
            f"User Profile Info:\n"
            f"- Target Roles: {', '.join(p.targetRoles)}\n"
            f"- Technical Skills: {', '.join([s.name for s in p.technicalSkills])}\n"
            f"- Soft Skills: {', '.join(p.softSkills)}\n"
            f"- Dream Companies: {', '.join(p.dreamCompanies)}\n"
        )

    system_prompt = (
        "You are PrepIQ AI Mentor, a friendly and professional mentor focused on learning, academics, skill development, interview preparation, and career growth.\n\n"
        "Primary Scope:\n"
        "* Career guidance\n"
        "* Study-related questions\n"
        "* Programming and technical topics\n"
        "* Interview preparation\n"
        "* Skill development\n"
        "* Resume and project guidance\n"
        "* Learning roadmaps\n"
        "* Academic support\n\n"
        "Conversation Behavior:\n"
        "* Be friendly, approachable, and conversational.\n"
        "* Accept common greetings and social interactions such as: Hi, Hello, Hey, Good morning, Good evening, How are you?, Thank you, Bye, Good night.\n"
        "* Respond naturally to these conversational messages before guiding the user toward productive mentoring discussions.\n"
        "* Do not reject users simply because they start with casual conversation.\n"
        "* Maintain a helpful and welcoming tone.\n\n"
        "Out-of-Scope Handling:\n"
        "* For questions unrelated to education, learning, skills, career development, or the user's profile, politely redirect the conversation.\n"
        "* Instead of abruptly refusing, respond in a friendly manner such as: \"I'm primarily here to help with studies, career development, interview preparation, and skill building. If you'd like help with learning, projects, academics, or career growth, I'd be happy to assist.\"\n"
        "* Allow brief casual conversation, but gradually guide the discussion back toward educational or career-focused topics.\n\n"
        "Personalization:\n"
        "* Use the user's profile, skills, goals, projects, and career interests whenever available.\n"
        "* Provide practical, actionable, and personalized guidance.\n\n"
        "Important:\n"
        "* Be mentor-like, not a strict gatekeeper.\n"
        "* Greetings, gratitude, and basic social interaction should always receive natural responses.\n"
        "* Focus on being helpful while keeping the main purpose centered on learning and career growth.\n\n"
        f"{profile_info}\n"
        "ALWAYS return JSON with a single key 'reply' containing your answer."
    )
    history_messages = [{"role": m.role, "content": m.content} for m in history[:-1]]

    try:
        response_dict = await call_openrouter_json(
            system_prompt=system_prompt,
            user_prompt=payload.message,
            history_messages=history_messages,
        )
        reply_content = response_dict.get(
            "reply", "I'm sorry, I couldn't formulate a proper reply."
        )
    except Exception as e:
        logger.error("Error calling AI: %s", e)
        reply_content = (
            "Sorry, I am having trouble connecting to the AI brain right now."
        )

    ai_dt = utc_now()
    ai_msg_id = str(uuid4())
    ai_entry = MentorChatHistoryTable(
        id=ai_msg_id,
        session_id=session_id,
        user_id=user_id,
        role="assistant",
        content=reply_content,
        created_at=ai_dt,
    )
    db.add(ai_entry)
    session.updated_at = ai_dt
    db.commit()

    return {"reply": reply_content}


class UserPreferencesUpdate(BaseModel):
    anonymousMode: bool


@app.patch("/api/users/{user_id}/preferences", response_model=User)
def update_user_preferences(
    user_id: str,
    payload: UserPreferencesUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
) -> User:
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    user_record = db.get(UserTable, user_id)
    if not user_record:
        raise HTTPException(status_code=404, detail="User not found")

    user_record.anonymous_mode = payload.anonymousMode
    db.commit()

    return user_from_table(user_record)


class AnonymousChatRequest(BaseModel):
    messages: list[dict[str, str]]


@app.post(
    "/api/users/{user_id}/mentor-chat/anonymous",
    dependencies=[Depends(validate_payload_size)],
)
async def post_anonymous_chat(
    user_id: str,
    payload: AnonymousChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
) -> dict[str, str]:
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    profile_record = db.get(ProfileTable, user_id)
    profile_info = ""
    if profile_record:
        p = profile_from_table(profile_record)
        profile_info = (
            f"User Profile Info:\n"
            f"- Target Roles: {', '.join(p.targetRoles)}\n"
            f"- Technical Skills: {', '.join([s.name for s in p.technicalSkills])}\n"
            f"- Soft Skills: {', '.join(p.softSkills)}\n"
            f"- Dream Companies: {', '.join(p.dreamCompanies)}\n"
        )

    system_prompt = (
        "You are PrepIQ AI Mentor, a friendly and professional mentor focused on learning, academics, skill development, interview preparation, and career growth.\n\n"
        "Primary Scope:\n"
        "* Career guidance\n"
        "* Study-related questions\n"
        "* Programming and technical topics\n"
        "* Interview preparation\n"
        "* Skill development\n"
        "* Resume and project guidance\n"
        "* Learning roadmaps\n"
        "* Academic support\n\n"
        "Conversation Behavior:\n"
        "* Be friendly, approachable, and conversational.\n"
        "* Accept common greetings and social interactions such as: Hi, Hello, Hey, Good morning, Good evening, How are you?, Thank you, Bye, Good night.\n"
        "* Respond naturally to these conversational messages before guiding the user toward productive mentoring discussions.\n"
        "* Do not reject users simply because they start with casual conversation.\n"
        "* Maintain a helpful and welcoming tone.\n\n"
        "Out-of-Scope Handling:\n"
        "* For questions unrelated to education, learning, skills, career development, or the user's profile, politely redirect the conversation.\n"
        "* Instead of abruptly refusing, respond in a friendly manner such as: \"I'm primarily here to help with studies, career development, interview preparation, and skill building. If you'd like help with learning, projects, academics, or career growth, I'd be happy to assist.\"\n"
        "* Allow brief casual conversation, but gradually guide the discussion back toward educational or career-focused topics.\n\n"
        "Personalization:\n"
        "* Use the user's profile, skills, goals, projects, and career interests whenever available.\n"
        "* Provide practical, actionable, and personalized guidance.\n\n"
        "Important:\n"
        "* Be mentor-like, not a strict gatekeeper.\n"
        "* Greetings, gratitude, and basic social interaction should always receive natural responses.\n"
        "* Focus on being helpful while keeping the main purpose centered on learning and career growth.\n\n"
        f"{profile_info}\n"
        "ALWAYS return JSON with a single key 'reply' containing your answer."
    )

    history_messages = [
        {"role": m["role"], "content": m["content"]} for m in payload.messages[:-1]
    ]

    try:
        response_dict = await call_openrouter_json(
            system_prompt=system_prompt,
            user_prompt=payload.messages[-1]["content"],
            history_messages=history_messages,
        )
        reply_content = response_dict.get(
            "reply", "I'm sorry, I couldn't formulate a proper reply."
        )
    except Exception as e:
        logger.error("Error calling AI: %s", e)
        reply_content = (
            "Sorry, I am having trouble connecting to the AI brain right now."
        )

    return {"reply": reply_content}


# ---------------------------------------------------------------------------
# Streak & Badges endpoints
# ---------------------------------------------------------------------------


class StreakResponse(BaseModel):
    currentStreak: int
    longestStreak: int
    todayActivityCount: int
    badges: list[dict]
    newlyUnlocked: list[str]


@app.get("/api/users/{user_id}/streak", response_model=StreakResponse)
def get_streak(
    user_id: str,
    _: UserTable = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> StreakResponse:
    from datetime import date as date_type

    all_activities = (
        db.execute(
            select(DailyActivityTable).where(DailyActivityTable.user_id == user_id)
        )
        .scalars()
        .all()
    )

    dates_with_activity = sorted({a.date for a in all_activities})
    today = today_iso()
    today_count = sum(1 for a in all_activities if a.date == today)

    # current streak
    current_streak = 0
    check = today
    for d in reversed(dates_with_activity):
        if d == check:
            current_streak += 1
            check = (date_type.fromisoformat(check) - timedelta(days=1)).isoformat()
        elif d < check:
            break

    # grace period: if today has no activity, yesterday still counts
    if today not in dates_with_activity and dates_with_activity:
        yesterday = (date_type.fromisoformat(today) - timedelta(days=1)).isoformat()
        check = yesterday
        current_streak = 0
        for d in reversed(dates_with_activity):
            if d == check:
                current_streak += 1
                check = (date_type.fromisoformat(check) - timedelta(days=1)).isoformat()
            elif d < check:
                break

    # longest streak
    longest_streak = 0
    run = 0
    prev = None
    for d in dates_with_activity:
        if prev is None:
            run = 1
        else:
            diff = (date_type.fromisoformat(d) - date_type.fromisoformat(prev)).days
            if diff == 1:
                run += 1
            else:
                run = 1
        longest_streak = max(longest_streak, run)
        prev = d

    newly_unlocked = check_and_unlock_badges(user_id, db)

    user_badges = (
        db.execute(select(UserBadgeTable).where(UserBadgeTable.user_id == user_id))
        .scalars()
        .all()
    )
    unlocked_ids = {b.badge_id for b in user_badges}

    badges_response = [
        {
            "id": b["id"],
            "label": b["label"],
            "unlocked": b["id"] in unlocked_ids,
        }
        for b in BADGES
    ]

    return StreakResponse(
        currentStreak=current_streak,
        longestStreak=longest_streak,
        todayActivityCount=today_count,
        badges=badges_response,
        newlyUnlocked=newly_unlocked,
    )
