import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute({ allowedRoles }) {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const dashboardByRole = {
      customer: "/customer/dashboard",
      agent: "/agent/dashboard",
      admin: "/admin/dashboard",
    };

    return (
      <Navigate
        to={dashboardByRole[user.role] || "/login"}
        replace
      />
    );
  }

  return <Outlet />;
}