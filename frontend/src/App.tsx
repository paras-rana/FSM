import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./modules/auth/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { CostsPage } from "./pages/CostsPage";
import { LoginPage } from "./pages/LoginPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AttachmentsPage } from "./pages/AttachmentsPage";
import { PublicServiceRequestPage } from "./pages/PublicServiceRequestPage";
import { ServiceRequestsPage } from "./pages/ServiceRequestsPage";
import { ServiceRequestDetailPage } from "./pages/ServiceRequestDetailPage";
import { TimeSheetPage } from "./pages/TimeSheetPage";
import { WorkOrderDetailPage } from "./pages/WorkOrderDetailPage";
import { WorkOrdersPage } from "./pages/WorkOrdersPage";

export const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/public/service-request" element={<PublicServiceRequestPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/work-orders"
        element={
          <ProtectedRoute>
            <WorkOrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/work-orders/:id"
        element={
          <ProtectedRoute>
            <WorkOrderDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/service-requests"
        element={
          <ProtectedRoute>
            <ServiceRequestsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/service-requests/:id"
        element={
          <ProtectedRoute>
            <ServiceRequestDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timesheet"
        element={
          <ProtectedRoute>
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
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/costs"
        element={
          <ProtectedRoute>
            <CostsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attachments"
        element={
          <ProtectedRoute>
            <AttachmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
