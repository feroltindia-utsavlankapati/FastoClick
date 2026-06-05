import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./components/pages/AuthPage";
import DashboardPage from "./components/pages/DashboardPage";
import AgentListPage from "./components/pages/AgentListPage";
import WorkflowPage from "./components/pages/WorkflowPage";
import CompanyContextPage from "./components/pages/CompanyContextPage";
import PlansPage from "./components/pages/PlansPage";
import ContentIdeasPage from "./components/pages/ContentIdeasPage";
import SocialHubPage from "./components/pages/SocialHubPage";
import ContentCalendarPage from "./components/pages/ContentCalendarPage";
import MediaLibraryPage from "./components/pages/MediaLibraryPage";
import SocialAnalyticsPage from "./components/pages/SocialAnalyticsPage";
import ProfilePage from "./components/pages/ProfilePage";
import EmailContactsPage from "./components/pages/EmailContactsPage";
import EmailTemplatesPage from "./components/pages/EmailTemplatesPage";
import EmailCampaignsPage from "./components/pages/EmailCampaignsPage";
import EmailAnalyticsPage from "./components/pages/EmailAnalyticsPage";
import EmailPlaceholdersPage from "./components/pages/EmailPlaceholdersPage";

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

        {/* Protected Social Hub Route */}
        <Route 
          path="/social" 
          element={
            <ProtectedRoute>
              <SocialHubPage />
            </ProtectedRoute>
          } 
        />

        {/* Protected Content Calendar Route */}
        <Route 
          path="/calendar" 
          element={
            <ProtectedRoute>
              <ContentCalendarPage />
            </ProtectedRoute>
          } 
        />

        {/* Protected Media Library Route */}
        <Route 
          path="/media-library" 
          element={
            <ProtectedRoute>
              <MediaLibraryPage />
            </ProtectedRoute>
          } 
        />

        {/* Protected Social Analytics Route */}
        <Route 
          path="/social-analytics" 
          element={
            <ProtectedRoute>
              <SocialAnalyticsPage />
            </ProtectedRoute>
          } 
        />

        {/* Protected Profile Route */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } 
        />

        {/* Protected Email Routes */}
        <Route 
          path="/email/contacts" 
          element={
            <ProtectedRoute>
              <EmailContactsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/email/templates" 
          element={
            <ProtectedRoute>
              <EmailTemplatesPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/email/campaigns" 
          element={
            <ProtectedRoute>
              <EmailCampaignsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/email/analytics" 
          element={
            <ProtectedRoute>
              <EmailAnalyticsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/email/placeholders" 
          element={
            <ProtectedRoute>
              <EmailPlaceholdersPage />
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