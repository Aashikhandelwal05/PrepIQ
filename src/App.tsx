import { Suspense, lazy, Component, useState } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import {
  useAuth,
  useCareerProfile,
  useInterviewSessions,
  useMockAttempts,
  useJobApplications,
} from "@/lib/store";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import { CommandPalette } from "./components/CommandPalette";
import ContactPage from "./pages/ContactPage";

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
const MentorChatPage = lazy(() => import("./pages/MentorChatPage"));

const queryClient = new QueryClient();

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const sanitize = (s: string) => s.replace(/[\r\n]/g, " ");
    console.error(
      "Uncaught error:",
      sanitize(error.message),
      sanitize(errorInfo.componentStack ?? ""),
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/dashboard";
              }}
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

interface ProtectedRouteProps {
  hydrated: boolean;
  user: { id: string } | null;
  logout: () => void;
  resourceErrorMessage: string | null;
  children: ReactNode;
}

/** Returns true when the error is a pure network failure (backend unreachable). */
function isNetworkError(msg: string | null): boolean {
  if (!msg) return false;
  const lower = msg.toLowerCase();
  return (
    lower.includes("failed to fetch") ||
    lower.includes("network request failed") ||
    lower.includes("networkerror") ||
    lower.includes("load failed")
  );
}

function ProtectedRoute({
  hydrated,
  user,
  logout,
  resourceErrorMessage,
  children,
}: ProtectedRouteProps) {
  const [dismissed, setDismissed] = useState(false);
  if (!hydrated) return <RouteFallback />;
  if (!user) return <Navigate to="/login" replace />;

  const networkDown = isNetworkError(resourceErrorMessage);
  const showBanner = !dismissed && !!resourceErrorMessage;

  return (
    <AppLayout onLogout={logout}>
      <div className="space-y-4">
        {showBanner && (
          <div
            className={`rounded-xl border p-3 text-sm flex items-start justify-between gap-3 ${
              networkDown
                ? "border-warning/30 bg-warning/10 text-warning"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            <span>
              {networkDown
                ? "Could not reach the server — showing cached data. Check your connection or ensure the backend is running."
                : `Some data failed to load: ${resourceErrorMessage}`}
            </span>
            <button
              onClick={() => setDismissed(true)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity text-inherit"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </AppLayout>
  );
}

function AppRoutes() {
  const { user, login, signup, logout, hydrated } = useAuth();
  const { profile, saveProfile, profileError } = useCareerProfile(user?.id);
  const { sessions, addSession, deleteSession, sessionsError } =
    useInterviewSessions(user?.id);
  const { attempts, addAttempt, attemptsError } = useMockAttempts(user?.id);
  const { jobs, addJob, updateJob, deleteJob, jobsError } = useJobApplications(
    user?.id,
  );
  const resourceErrorMessage =
    profileError ?? sessionsError ?? attemptsError ?? jobsError;

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route
          path="/login"
          element={
            !hydrated ? (
              <RouteFallback />
            ) : user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AuthPage mode="login" onLogin={login} onSignup={signup} />
            )
          }
        />
        <Route
          path="/signup"
          element={
            !hydrated ? (
              <RouteFallback />
            ) : user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AuthPage mode="signup" onLogin={login} onSignup={signup} />
            )
          }
        />
        <Route
          path="/onboarding"
          element={
            !hydrated ? (
              <RouteFallback />
            ) : user ? (
              <OnboardingPage
                user={user}
                profile={profile}
                onSave={saveProfile}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              hydrated={hydrated}
              user={user}
              logout={logout}
              resourceErrorMessage={resourceErrorMessage}
            >
              <DashboardPage
                user={user!}
                profile={profile}
                sessions={sessions}
                mocks={attempts}
                jobs={jobs}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/career-dna"
          element={
            <ProtectedRoute
              hydrated={hydrated}
              user={user}
              logout={logout}
              resourceErrorMessage={resourceErrorMessage}
            >
              <CareerDNAPage user={user!} profile={profile} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interview-prep"
          element={
            <ProtectedRoute
              hydrated={hydrated}
              user={user}
              logout={logout}
              resourceErrorMessage={resourceErrorMessage}
            >
              <InterviewPrepPage
                sessions={sessions}
                jobs={jobs}
                onAddSession={addSession}
                onDeleteSession={deleteSession}
                userId={user?.id || ""}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mock-interview"
          element={
            <ProtectedRoute
              hydrated={hydrated}
              user={user}
              logout={logout}
              resourceErrorMessage={resourceErrorMessage}
            >
              <MockInterviewPage
                sessions={sessions}
                attempts={attempts}
                onAddAttempt={addAttempt}
                userId={user?.id || ""}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/job-tracker"
          element={
            <ProtectedRoute
              hydrated={hydrated}
              user={user}
              logout={logout}
              resourceErrorMessage={resourceErrorMessage}
            >
              <JobTrackerPage
                jobs={jobs}
                sessions={sessions}
                onAddJob={addJob}
                onUpdateJob={updateJob}
                onDeleteJob={deleteJob}
                userId={user?.id || ""}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/progress"
          element={
            <ProtectedRoute
              hydrated={hydrated}
              user={user}
              logout={logout}
              resourceErrorMessage={resourceErrorMessage}
            >
              <ProgressPage mocks={attempts} sessions={sessions} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mentor-chat"
          element={
            <ProtectedRoute
              hydrated={hydrated}
              user={user}
              logout={logout}
              resourceErrorMessage={resourceErrorMessage}
            >
              <MentorChatPage user={user!} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/privacy-policy"
          element={
            <AppLayout onLogout={logout}>
              <Privacy />
            </AppLayout>
          }
        />
        <Route
          path="/terms"
          element={
            <AppLayout onLogout={logout}>
              <Terms />
            </AppLayout>
          }
        />
        <Route
          path="/contact"
          element={
            <AppLayout onLogout={logout}>
              <ContactPage />
            </AppLayout>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Toaster />
        <ErrorBoundary>
          <BrowserRouter>
            <CommandPalette />
            <AppRoutes />
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
