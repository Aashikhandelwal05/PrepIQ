from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Integer, JSON, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


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