import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { Toaster } from "./components/ui/sonner"
import { ErrorBoundary } from "./components/ErrorBoundary"
import Home from "./pages/Home"
import Login from "./pages/Login"
import Register from "./pages/Register"
import WorkflowList from "./pages/WorkflowList"
import Workflow from "./components/Workflow"
import AdminDashboard from "./pages/AdminDashboard"

// Protected Route Component - redirects to login if not authenticated
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Guest Route Component - redirects to workflows if already authenticated
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/workflows" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={
        <GuestRoute>
          <Login />
        </GuestRoute>
      } />
      <Route path="/register" element={
        <GuestRoute>
          <Register />
        </GuestRoute>
      } />
      <Route path="/workflows" element={
        <ProtectedRoute>
          <WorkflowList />
        </ProtectedRoute>
      } />
      <Route path="/workflow/new" element={
        <ProtectedRoute>
          <Workflow />
        </ProtectedRoute>
      } />
      <Route path="/workflow/:id" element={
        <ProtectedRoute>
          <Workflow />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
