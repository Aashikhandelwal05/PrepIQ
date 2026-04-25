import { Suspense, lazy, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { useAuth, useCareerProfile, useInterviewSessions, useMockAttempts, useJobApplications } from "@/lib/store";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const CareerDNAPage = lazy(() => import("./pages/CareerDNAPage"));
const InterviewPrepPage = lazy(() => import("./pages/InterviewPrepPage"));
const MockInterviewPage = lazy(() => import("./pages/MockInterviewPage"));
const JobTrackerPage = lazy(() => import("./pages/JobTrackerPage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));

const queryClient = new QueryClient();

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">{this.state.error?.message || "An unexpected error occurred."}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = "/dashboard"; }}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition-opacity"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function RouteFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
      Loading...
    </div>
  );
}

function AppRoutes() {
  const { user, login, signup, logout, hydrated } = useAuth();
  const { profile, saveProfile, profileError } = useCareerProfile(user?.id);
  const { sessions, addSession, sessionsError } = useInterviewSessions(user?.id);
  const { attempts, addAttempt, attemptsError } = useMockAttempts(user?.id);
  const { jobs, addJob, updateJob, jobsError } = useJobApplications(user?.id);
  const resourceErrorMessage = profileError ?? sessionsError ?? attemptsError ?? jobsError;

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!hydrated) return <RouteFallback />;
    if (!user) return <Navigate to="/login" replace />;
    return (
      <AppLayout onLogout={logout}>
        <div className="space-y-4">
          {resourceErrorMessage && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Unable to refresh some workspace data. {resourceErrorMessage}
            </div>
          )}
          {children}
        </div>
      </AppLayout>
    );
  };

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={!hydrated ? <RouteFallback /> : user ? <Navigate to="/dashboard" replace /> : <AuthPage mode="login" onLogin={login} onSignup={signup} />} />
        <Route path="/signup" element={!hydrated ? <RouteFallback /> : user ? <Navigate to="/dashboard" replace /> : <AuthPage mode="signup" onLogin={login} onSignup={signup} />} />
        <Route path="/onboarding" element={!hydrated ? <RouteFallback /> : user ? <OnboardingPage user={user} profile={profile} onSave={saveProfile} /> : <Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage user={user!} profile={profile} sessions={sessions} mocks={attempts} jobs={jobs} /></ProtectedRoute>} />
        <Route path="/career-dna" element={<ProtectedRoute><CareerDNAPage user={user!} profile={profile} /></ProtectedRoute>} />
        <Route path="/interview-prep" element={<ProtectedRoute><InterviewPrepPage sessions={sessions} onAddSession={addSession} userId={user?.id || ""} /></ProtectedRoute>} />
        <Route path="/mock-interview" element={<ProtectedRoute><MockInterviewPage sessions={sessions} attempts={attempts} onAddAttempt={addAttempt} userId={user?.id || ""} /></ProtectedRoute>} />
        <Route path="/job-tracker" element={<ProtectedRoute><JobTrackerPage jobs={jobs} sessions={sessions} onAddJob={addJob} onUpdateJob={updateJob} userId={user?.id || ""} /></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><ProgressPage mocks={attempts} sessions={sessions} /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <ErrorBoundary>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
