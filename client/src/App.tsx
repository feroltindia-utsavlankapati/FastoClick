import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./components/pages/AuthPage";
import ProjectSelectionPage from "./components/pages/ProjectSelectionPage";
import DashboardPage from "./components/pages/DashboardPage";
import AgentListPage from "./components/pages/AgentListPage";
import CompanyContextPage from "./components/pages/CompanyContextPage";
import PlansPage from "./components/pages/PlansPage";
import ContentIdeasPage from "./components/pages/ContentIdeasPage";
import SocialHubPage from "./components/pages/SocialHubPage";
import TrendsHubPage from "./components/pages/TrendsHubPage";
import ContentCalendarPage from "./components/pages/ContentCalendarPage";
import MediaLibraryPage from "./components/pages/MediaLibraryPage";
import SocialAnalyticsPage from "./components/pages/SocialAnalyticsPage";
import ProfilePage from "./components/pages/ProfilePage";
import EmailContactsPage from "./components/pages/EmailContactsPage";
import EmailTemplatesPage from "./components/pages/EmailTemplatesPage";
import EmailCampaignsPage from "./components/pages/EmailCampaignsPage";
import EmailAnalyticsPage from "./components/pages/EmailAnalyticsPage";
import EmailPlaceholdersPage from "./components/pages/EmailPlaceholdersPage";
import Layout from "./components/UI/Layout";
import { ToastProvider } from "./components/UI/ToastProvider";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/projects" element={<ProjectSelectionPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/agents" element={<AgentListPage />} />
            <Route path="/company-context" element={<CompanyContextPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/content-ideas" element={<ContentIdeasPage />} />
            <Route path="/social" element={<SocialHubPage />} />
            <Route path="/social/trends" element={<TrendsHubPage />} />
            <Route path="/calendar" element={<ContentCalendarPage />} />
            <Route path="/media-library" element={<MediaLibraryPage />} />
            <Route path="/social-analytics" element={<SocialAnalyticsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            
            {/* Email Routes */}
            <Route path="/email/contacts" element={<EmailContactsPage />} />
            <Route path="/email/templates" element={<EmailTemplatesPage />} />
            <Route path="/email/campaigns" element={<EmailCampaignsPage />} />
            <Route path="/email/analytics" element={<EmailAnalyticsPage />} />
            <Route path="/email/placeholders" element={<EmailPlaceholdersPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;