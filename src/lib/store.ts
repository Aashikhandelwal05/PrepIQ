import { useState, useEffect, useCallback, useRef } from "react";
import { apiRequest } from "@/lib/api";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface CareerProfile {
  userId: string;
  fullName: string;
  email: string;
  targetRoles: string[];
  dreamCompanies: string[];
  degree: string;
  institution: string;
  graduationYear: string;
  coursework: string;
  certifications: string[];
  workHistory: WorkEntry[];
  technicalSkills: SkillEntry[];
  softSkills: string[];
  interviewFears: string[];
  fearNotes: string;
  onboardingComplete: boolean;
}

export interface WorkEntry {
  id: string;
  jobTitle: string;
  company: string;
  from: string;
  to: string;
  responsibilities: string;
}

export interface SkillEntry {
  name: string;
  proficiency: "Beginner" | "Intermediate" | "Expert";
}

export interface InterviewSession {
  id: string;
  userId: string;
  jobTitle: string;
  company: string;
  jdText: string;
  resumeText: string;
  gapAnalysis: GapItem[];
  readinessScore: number;
  questionBank: QuestionItem[];
  roadmap: RoadmapDay[];
  createdAt: string;
}

export interface GapItem {
  skill: string;
  have: string;
  need: string;
  gapLevel: "Low" | "Medium" | "High";
}

export interface QuestionItem {
  question: string;
  type: "behavioral" | "technical" | "situational";
  difficulty: "easy" | "medium" | "hard";
  tip: string;
}

export interface RoadmapDay {
  day: number;
  focusArea: string;
  tasks: string[];
}

export interface MockAttempt {
  id: string;
  sessionId: string;
  userId: string;
  question: string;
  userAnswer: string;
  aiScore: number;
  aiFeedback: {
    strengths: string[];
    missing: string[];
    modelAnswer: string;
    oneLineVerdict: string;
  };
  createdAt: string;
}

export interface JobApplication {
  id: string;
  userId: string;
  companyName: string;
  jobTitle: string;
  jobUrl: string;
  dateApplied: string;
  status: "Applied" | "Screening" | "Interview" | "Offer" | "Rejected" | "Ghosted";
  salaryRange: string;
  location: string;
  notes: string;
  resumeUsed: string;
  contactPerson: string;
  nextAction: string;
  nextActionDate: string;
  linkedPrepSessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInterviewSessionInput {
  jobTitle: string;
  company: string;
  jdText: string;
  resumeText: string;
}

export interface CreateMockAttemptInput {
  sessionId: string;
  question: string;
  userAnswer: string;
}

export interface CreateJobApplicationInput {
  companyName: string;
  jobTitle: string;
  jobUrl: string;
  status: JobApplication["status"];
}

const SESSION_KEY = "prepiq_session";

function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

function setSession(session: AuthSession | null) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function useProtectedResource<T>(path: string | null, fallback: T) {
  const fallbackRef = useRef(fallback);
  const [data, setData] = useState<T>(fallback);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!path) {
      setData(fallbackRef.current);
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    apiRequest<T>(path)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : "Unable to load data");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [path]);

  return [data, setData, error, loading] as const;
}

export function useAuth() {
  const [session, setSessionState] = useState<AuthSession | null>(() => getSession());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const current = getSession();
    if (!current) {
      setHydrated(true);
      return;
    }

    apiRequest<User>("/api/auth/me")
      .then((user) => {
        if (!active) return;
        const nextSession = { user, token: current.token };
        setSessionState(nextSession);
        setSession(nextSession);
      })
      .catch(() => {
        if (!active) return;
        setSessionState(null);
        setSession(null);
      })
      .finally(() => {
        if (active) setHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const nextSession = await apiRequest<AuthSession>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSessionState(nextSession);
      setSession(nextSession);
      return { success: true, user: nextSession.user };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Invalid credentials" };
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    try {
      const nextSession = await apiRequest<AuthSession>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setSessionState(nextSession);
      setSession(nextSession);
      return { success: true, user: nextSession.user };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unable to create account" };
    }
  }, []);

  const logout = useCallback(() => {
    setSessionState(null);
    setSession(null);
  }, []);

  return { user: session?.user ?? null, login, signup, logout, hydrated };
}

export function useCareerProfile(userId: string | undefined) {
  const [profile, setProfile, profileError, profileLoading] = useProtectedResource<CareerProfile | null>(userId ? `/api/users/${userId}/profile` : null, null);

  const saveProfile = useCallback(async (data: CareerProfile) => {
    const saved = await apiRequest<CareerProfile>(`/api/users/${data.userId}/profile`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    setProfile(saved);
    return saved;
  }, [setProfile]);

  return { profile, saveProfile, profileError, profileLoading };
}

export function useInterviewSessions(userId: string | undefined) {
  const [sessions, setSessions, sessionsError, sessionsLoading] = useProtectedResource<InterviewSession[]>(userId ? `/api/users/${userId}/sessions` : null, []);

  const addSession = useCallback(async (input: CreateInterviewSessionInput) => {
    if (!userId) throw new Error("User is not authenticated");
    const created = await apiRequest<InterviewSession>(`/api/users/${userId}/sessions`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    setSessions((prev) => [...prev, created]);
    return created;
  }, [setSessions, userId]);

  return { sessions, addSession, sessionsError, sessionsLoading };
}

export function useMockAttempts(userId: string | undefined) {
  const [attempts, setAttempts, attemptsError, attemptsLoading] = useProtectedResource<MockAttempt[]>(userId ? `/api/users/${userId}/mocks` : null, []);

  const addAttempt = useCallback(async (input: CreateMockAttemptInput) => {
    if (!userId) throw new Error("User is not authenticated");
    const created = await apiRequest<MockAttempt>(`/api/users/${userId}/mocks`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    setAttempts((prev) => [...prev, created]);
    return created;
  }, [setAttempts, userId]);

  return { attempts, addAttempt, attemptsError, attemptsLoading };
}

export function useJobApplications(userId: string | undefined) {
  const [jobs, setJobs, jobsError, jobsLoading] = useProtectedResource<JobApplication[]>(userId ? `/api/users/${userId}/jobs` : null, []);

  const addJob = useCallback(async (input: CreateJobApplicationInput) => {
    if (!userId) throw new Error("User is not authenticated");
    const created = await apiRequest<JobApplication>(`/api/users/${userId}/jobs`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    setJobs((prev) => [...prev, created]);
    return created;
  }, [setJobs, userId]);

  const updateJob = useCallback(async (id: string, updates: Partial<JobApplication>) => {
    if (!userId) throw new Error("User is not authenticated");
    const updated = await apiRequest<JobApplication>(`/api/users/${userId}/jobs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    setJobs((prev) => prev.map((job) => (job.id === id ? updated : job)));
    return updated;
  }, [setJobs, userId]);

  return { jobs, addJob, updateJob, jobsError, jobsLoading };
}
