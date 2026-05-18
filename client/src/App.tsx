import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./components/pages/AuthPage";
import DashboardPage from "./components/pages/DashboardPage";
import AgentListPage from "./components/pages/AgentListPage";
import WorkflowPage from "./components/pages/WorkflowPage";
import CompanyContextPage from "./components/pages/CompanyContextPage";
import PlansPage from "./components/pages/PlansPage";
import ContentIdeasPage from "./components/pages/ContentIdeasPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        
        {/* Protected Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected Agents Route */}
        <Route 
          path="/agents" 
          element={
            <ProtectedRoute>
              <AgentListPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected Workflows Route */}
        <Route 
          path="/workflows" 
          element={
            <ProtectedRoute>
              <WorkflowPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected Company Context Route */}
        <Route 
          path="/company-context" 
          element={
            <ProtectedRoute>
              <CompanyContextPage />
            </ProtectedRoute>
          } 
        />

        {/* Protected Plans Route */}
        <Route 
          path="/plans" 
          element={
            <ProtectedRoute>
              <PlansPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected Content Ideas Route */}
        <Route 
          path="/content-ideas" 
          element={
            <ProtectedRoute>
              <ContentIdeasPage />
            </ProtectedRoute>
          } 
        />

        {/* Redirect root to dashboard (which will redirect to auth if not logged in) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;