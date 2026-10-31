import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";

import DashboardPage from "./pages/DashboardPage";
import TicketListPage from "./pages/TicketListPage";
import TicketCreatePage from "./pages/TicketCreatePage";
import TicketDetailPage from "./pages/TicketDetailPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import UserManagementPage from "./pages/UserManagementPage";
import CategoryManagementPage from "./pages/CategoryManagementPage";

import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import ForgotPassword from "./pages/auth/forgetPassword";
import ResetPassword from "./pages/auth/resetPassword";
import VerifyOtp from "./pages/auth/verifyOtp";

import { clearAuth, setSession } from "./redux/auth/authSlice";

const dashboardByRole = {
  customer: "/customer/dashboard",
  agent: "/agent/dashboard",
  admin: "/admin/dashboard",
};

function RoleRedirect() {
  const user = useSelector((state) => state.auth.user);
  const location = useLocation();

  if (!user?.role) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location, message: location.state?.message }}
      />
    );
  }

  return <Navigate to={dashboardByRole[user.role] || "/login"} replace />;
}

function CustomerRoutes() {
  return (
    <Route path="/customer" element={<AppLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="tickets" element={<TicketListPage />} />
      <Route path="tickets/new" element={<TicketCreatePage />} />
      <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="profile" element={<ProfilePage />} />
    </Route>
  );
}

function AgentRoutes() {
  return (
    <Route path="/agent" element={<AppLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="tickets" element={<TicketListPage />} />
      <Route path="tickets/new" element={<TicketCreatePage />} />
      <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="profile" element={<ProfilePage />} />
    </Route>
  );
}

function AdminRoutes() {
  return (
    <Route path="/admin" element={<AppLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="tickets" element={<TicketListPage />} />
      <Route path="tickets/new" element={<TicketCreatePage />} />
      <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
      <Route path="users" element={<UserManagementPage />} />
      <Route path="categories" element={<CategoryManagementPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="profile" element={<ProfilePage />} />
    </Route>
  );
}

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const handleRefreshed = (event) => {
      if (event.detail) dispatch(setSession(event.detail));
    };

    const handleExpired = () => dispatch(clearAuth());

    window.addEventListener("auth:refreshed", handleRefreshed);
    window.addEventListener("auth:expired", handleExpired);

    return () => {
      window.removeEventListener("auth:refreshed", handleRefreshed);
      window.removeEventListener("auth:expired", handleExpired);
    };
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/dashboard" element={<RoleRedirect />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
        {CustomerRoutes()}
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["agent"]} />}>
        {AgentRoutes()}
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        {AdminRoutes()}
      </Route>

      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  );
}
