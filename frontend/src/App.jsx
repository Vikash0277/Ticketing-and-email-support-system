
import { Navigate, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";

import ForgotPassword from "./pages/auth/forgetPassword";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import ResetPassword from "./pages/auth/resetPassword";
import VerifyOtp from "./pages/auth/verifyOtp";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AgentDashboard from "./pages/agent/AgentDashboard";
import CustomerDashboard from "./pages/customer/CustomerDashboard";

import CustomerLayout from "./components/customer/CustomerLayout";
import MyTickets from "./pages/customer/MyTickets";
import CreateTicket from "./pages/customer/CreateTicket";
import TicketDetails from "./pages/customer/TicketDetails";
import CustomerProfile from "./pages/customer/CustomerProfile";

import ProtectedRoute from "./components/layout/ProtectedRoute";

const dashboardByRole = {
  customer: "/customer/dashboard",
  agent: "/agent/dashboard",
  admin: "/admin/dashboard",
};

function HomeRedirect() {
  const { user } = useSelector((state) => state.auth);

  return (
    <Navigate
      to={dashboardByRole[user?.role] || "/login"}
      replace
    />
  );
}

export default function App() {
  return (
    <Routes>
      {/* Default redirect */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/dashboard" element={<HomeRedirect />} />

      {/* Authentication pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Customer pages */}
      <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
        <Route path="/customer" element={<CustomerLayout />}>
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="tickets" element={<MyTickets />} />
          <Route path="tickets/new" element={<CreateTicket />} />
          <Route path="tickets/:ticketId" element={<TicketDetails />} />
          <Route path="profile" element={<CustomerProfile />} />
        </Route>
      </Route>

      {/* Agent dashboard */}
      <Route element={<ProtectedRoute allowedRoles={["agent"]} />}>
        <Route
          path="/agent/dashboard"
          element={<AgentDashboard />}
        />
      </Route>

      {/* Admin dashboard */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />
      </Route>

      {/* Unknown routes */}
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

