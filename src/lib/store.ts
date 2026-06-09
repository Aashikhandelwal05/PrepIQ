import { useState, useEffect, useCallback, useRef } from "react";
import { apiRequest, SESSION_KEY } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";


export interface User {
  id: string;
  name: string;
  email: string;
  anonymousMode?: boolean;
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
  extractedSkills: string[];
  mlMatchScore: number;
  isEstimated: boolean;
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

export interface ConfidenceAnalysis {
  confidenceScore: number;
  sentiment: string;
  specificity: number;
  wordCount: number;
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
    confidenceAnalysis: ConfidenceAnalysis;
  };
  createdAt: string;
}

export interface PaginatedMockAttempts {
  items: MockAttempt[];
  total: number;
  limit: number;
  offset: number;
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
  sortOrder: number;
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

// Legacy useProtectedResource hook removed in favor of TanStack React Query.

export function getMockAttemptItems(payload: MockAttempt[] | PaginatedMockAttempts): MockAttempt[] {
  return Array.isArray(payload) ? payload : payload.items;
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

  const logout = useCallback(async () => {
    // Revoke the token server-side before clearing it locally
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch {
      // Even if the server call fails, we still clear the local session
    }
    setSessionState(null);
    setSession(null);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setSessionState((prev) => {
      if (!prev) return null;
      const nextSession = { ...prev, user: updatedUser };
      setSession(nextSession);
      return nextSession;
    });
  }, []);

  return { user: session?.user ?? null, login, signup, logout, hydrated, updateUser };
}

export function useCareerProfile(userId: string | undefined) {
  const queryClient = useQueryClient();
  const profileQuery = useQuery<CareerProfile | null>({
    queryKey: ["careerProfile", userId],
    queryFn: () => apiRequest<CareerProfile>(`/api/users/${userId}/profile`),
    enabled: !!userId,
  });

  const saveProfileMutation = useMutation({
    mutationFn: (data: CareerProfile) =>
      apiRequest<CareerProfile>(`/api/users/${data.userId}/profile`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(["careerProfile", userId], saved);
    },
  });

  const saveProfile = useCallback(async (data: CareerProfile) => {
    return saveProfileMutation.mutateAsync(data);
  }, [saveProfileMutation]);

  return {
    profile: profileQuery.data ?? null,
    saveProfile,
    profileError: profileQuery.error instanceof Error ? profileQuery.error.message : null,
    profileLoading: profileQuery.isLoading,
  };
}

export function useInterviewSessions(userId: string | undefined) {
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery<InterviewSession[]>({
    queryKey: ["interviewSessions", userId],
    queryFn: () => apiRequest<InterviewSession[]>(`/api/users/${userId}/sessions`),
    enabled: !!userId,
  });

  const addSessionMutation = useMutation({
    mutationFn: (input: CreateInterviewSessionInput) => {
      if (!userId) throw new Error("User is not authenticated");
      return apiRequest<InterviewSession>(`/api/users/${userId}/sessions`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviewSessions", userId] });
    },
  });

  const addSession = useCallback(async (input: CreateInterviewSessionInput) => {
    return addSessionMutation.mutateAsync(input);
  }, [addSessionMutation]);

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => {
      if (!userId) throw new Error("User is not authenticated");
      return apiRequest<void>(`/api/users/${userId}/sessions/${sessionId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviewSessions", userId] });
    },
  });

  const deleteSession = useCallback(async (sessionId: string) => {
    return deleteSessionMutation.mutateAsync(sessionId);
  }, [deleteSessionMutation]);

  return {
    sessions: sessionsQuery.data ?? [],
    addSession,
    deleteSession,
    sessionsError: sessionsQuery.error instanceof Error ? sessionsQuery.error.message : null,
    sessionsLoading: sessionsQuery.isLoading,
  };
}

export function useMockAttempts(userId: string | undefined) {
  const queryClient = useQueryClient();
  const attemptsQuery = useQuery<MockAttempt[]>({
    queryKey: ["mockAttempts", userId],
    queryFn: async () => {
      const payload = await apiRequest<MockAttempt[] | PaginatedMockAttempts>(`/api/users/${userId}/mocks`);
      return getMockAttemptItems(payload);
    },
    enabled: !!userId,
  });

  const addAttemptMutation = useMutation({
    mutationFn: (input: CreateMockAttemptInput) => {
      if (!userId) throw new Error("User is not authenticated");
      return apiRequest<MockAttempt>(`/api/users/${userId}/mocks`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mockAttempts", userId] });
    },
  });

  const addAttempt = useCallback(async (input: CreateMockAttemptInput) => {
    return addAttemptMutation.mutateAsync(input);
  }, [addAttemptMutation]);

  return {
    attempts: attemptsQuery.data ?? [],
    addAttempt,
    attemptsError: attemptsQuery.error instanceof Error ? attemptsQuery.error.message : null,
    attemptsLoading: attemptsQuery.isLoading,
  };
}

export function useJobApplications(userId: string | undefined) {
  const queryClient = useQueryClient();
  const jobsQuery = useQuery<JobApplication[]>({
    queryKey: ["jobApplications", userId],
    queryFn: () => apiRequest<JobApplication[]>(`/api/users/${userId}/jobs`),
    enabled: !!userId,
  });

  const addJobMutation = useMutation({
    mutationFn: (input: CreateJobApplicationInput) => {
      if (!userId) throw new Error("User is not authenticated");
      return apiRequest<JobApplication>(`/api/users/${userId}/jobs`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobApplications", userId] });
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<JobApplication> }) => {
      if (!userId) throw new Error("User is not authenticated");
      return apiRequest<JobApplication>(`/api/users/${userId}/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobApplications", userId] });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: (id: string) => {
      if (!userId) throw new Error("User is not authenticated");
      return apiRequest<void>(`/api/users/${userId}/jobs/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobApplications", userId] });
    },
  });

  const addJob = useCallback(async (input: CreateJobApplicationInput) => {
    return addJobMutation.mutateAsync(input);
  }, [addJobMutation]);

  const updateJob = useCallback(async (id: string, updates: Partial<JobApplication>) => {
    return updateJobMutation.mutateAsync({ id, updates });
  }, [updateJobMutation]);

  const deleteJob = useCallback(async (id: string) => {
    return deleteJobMutation.mutateAsync(id);
  }, [deleteJobMutation]);

  const jobs = jobsQuery.data ?? [];
  return { jobs, addJob, updateJob, deleteJob, jobsError: jobsQuery.error instanceof Error ? jobsQuery.error.message : null, jobsLoading: jobsQuery.isLoading };
}

