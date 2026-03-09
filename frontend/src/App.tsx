import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./modules/auth/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { LoginPage } from "./pages/LoginPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AttachmentsPage } from "./pages/AttachmentsPage";
import { PublicServiceRequestPage } from "./pages/PublicServiceRequestPage";
import { ServiceRequestsPage } from "./pages/ServiceRequestsPage";
import { ServiceRequestDetailPage } from "./pages/ServiceRequestDetailPage";
import { TimeSheetPage } from "./pages/TimeSheetPage";
import { WorkOrderDetailPage } from "./pages/WorkOrderDetailPage";
import { WorkOrdersPage } from "./pages/WorkOrdersPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ThemeTemplatesPage } from "./pages/ThemeTemplatesPage";
import { FacilitiesPage } from "./pages/FacilitiesPage";

export const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/public/service-request" element={<PublicServiceRequestPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredPage="dashboard">
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/work-orders"
        element={
          <ProtectedRoute requiredPage="work-orders">
            <WorkOrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/work-orders/:id"
        element={
          <ProtectedRoute requiredPage="work-orders">
            <WorkOrderDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/service-requests"
        element={
          <ProtectedRoute requiredPage="service-requests">
            <ServiceRequestsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/service-requests/:id"
        element={
          <ProtectedRoute requiredPage="service-requests">
            <ServiceRequestDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timesheet"
        element={
          <ProtectedRoute requiredPage="timesheet">
            <TimeSheetPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/labor-timesheets"
        element={<Navigate to="/timesheet" replace />}
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute requiredPage="notifications">
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/costs"
        element={<Navigate to="/work-orders" replace />}
      />
      <Route
        path="/attachments"
        element={
          <ProtectedRoute requiredPage="attachments">
            <AttachmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute requiredPage="reports">
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/theme-templates"
        element={
          <ProtectedRoute requiredPage="theme-templates">
            <ThemeTemplatesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/facilities"
        element={
          <ProtectedRoute requiredPage="facilities">
            <FacilitiesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requiredPage="admin-users">
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
