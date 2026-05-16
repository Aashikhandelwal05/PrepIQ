import { Suspense, lazy, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";

const NotFound = lazy(() => import("./pages/NotFound"));
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

class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
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
              {this.state.error?.message ||
                "An unexpected error occurred."}
            </p>

            <button
              onClick={() => {
                this.setState({
                  hasError: false,
                  error: null,
                });

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
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  return (
    <AppLayout
      onLogout={() => {
        localStorage.clear();
        window.location.href = "/";
      }}
    >
      {children}
    </AppLayout>
  );
}

function AppRoutes() {
  const mockUser = {
    id: "local-dev-user",
    name: "Khushi",
    email: "khushi@example.com",
  };

  const storedProfile = localStorage.getItem("careerProfile");

  const profile = storedProfile
    ? JSON.parse(storedProfile)
    : null;

  const saveProfile = async (newProfile: any) => {
    localStorage.setItem(
      "careerProfile",
      JSON.stringify(newProfile)
    );

    return newProfile;
  };

  const sessions: any[] = [];
  const attempts: any[] = [];
  const jobs: any[] = [];

  const addSession = async () => {};
  const addAttempt = async () => {};
  const addJob = async () => {};
  const updateJob = async () => {};

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        <Route
          path="/login"
          element={<Navigate to="/dashboard" replace />}
        />

        <Route
          path="/signup"
          element={<Navigate to="/dashboard" replace />}
        />

        <Route
          path="/onboarding"
          element={
            <OnboardingPage
              user={mockUser}
              profile={profile}
              onSave={saveProfile}
            />
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage
                user={mockUser}
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
            <ProtectedRoute>
              <CareerDNAPage
                user={mockUser}
                profile={profile}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/interview-prep"
          element={
            <ProtectedRoute>
              <InterviewPrepPage
                sessions={sessions}
                onAddSession={addSession}
                userId={mockUser.id}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mock-interview"
          element={
            <ProtectedRoute>
              <MockInterviewPage
                sessions={sessions}
                attempts={attempts}
                onAddAttempt={addAttempt}
                userId={mockUser.id}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/job-tracker"
          element={
            <ProtectedRoute>
              <JobTrackerPage
                jobs={jobs}
                sessions={sessions}
                onAddJob={addJob}
                onUpdateJob={updateJob}
                userId={mockUser.id}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/progress"
          element={
            <ProtectedRoute>
              <ProgressPage
                mocks={attempts}
                sessions={sessions}
              />
            </ProtectedRoute>
          }
        />

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