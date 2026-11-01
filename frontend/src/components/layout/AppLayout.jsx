import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Bell,
  Headset,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  ShieldCheck,
  Tags,
  Ticket,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { clearAuth } from "../../redux/auth/authSlice";
import { logout as logoutRequest } from "../../api/auth";
import { fetchUnreadCount } from "../../redux/notifications/notificationsSlice";
import { roleLabel } from "../../utils/format";
import { Avatar, cn } from "../ui";

const NAVIGATION = {
  customer: [
    { label: "Dashboard", to: "/customer/dashboard", icon: LayoutDashboard, end: true },
    { label: "My Tickets", to: "/customer/tickets", icon: Ticket, end: true },
    { label: "New Ticket", to: "/customer/tickets/new", icon: PlusCircle },
    { label: "Notifications", to: "/customer/notifications", icon: Bell },
    { label: "Profile", to: "/customer/profile", icon: UserRound },
  ],
  agent: [
    { label: "Dashboard", to: "/agent/dashboard", icon: LayoutDashboard, end: true },
    { label: "Ticket Queue", to: "/agent/tickets", icon: Ticket, end: true },
    { label: "New Ticket", to: "/agent/tickets/new", icon: PlusCircle },
    { label: "Notifications", to: "/agent/notifications", icon: Bell },
    { label: "Profile", to: "/agent/profile", icon: UserRound },
  ],
  admin: [
    { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard, end: true },
    { label: "All Tickets", to: "/admin/tickets", icon: Ticket, end: true },
    { label: "Users", to: "/admin/users", icon: Users },
    { label: "Categories", to: "/admin/categories", icon: Tags },
    { label: "Notifications", to: "/admin/notifications", icon: Bell },
    { label: "Profile", to: "/admin/profile", icon: UserRound },
  ],
};

const PORTAL_LABEL = {
  customer: "Customer Portal",
  agent: "Agent Workspace",
  admin: "Admin Console",
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const refreshToken = useSelector((state) => state.auth.refreshToken);
  const unread = useSelector((state) => state.notifications.unreadCount);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const role = user?.role ?? "customer";
  const navigation = NAVIGATION[role] ?? NAVIGATION.customer;
  const notificationsPath = `/${role}/notifications`;

  useEffect(() => {
    dispatch(fetchUnreadCount());
    const timer = window.setInterval(() => {
      dispatch(fetchUnreadCount());
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, [dispatch, user?.id]);

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      if (refreshToken) await logoutRequest(refreshToken);
    } catch {
      // Even if the API call fails, clear the local session.
    } finally {
      dispatch(clearAuth());
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Headset size={23} />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">
                BitMax
              </p>
              <p className="text-xs text-slate-500">{PORTAL_LABEL[role]}</p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pt-7">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map(({ label, to, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )
                }
              >
                <Icon size={19} />
                {label}
                {label === "Notifications" && unread > 0 ? (
                  <span className="ml-auto rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto border-t border-slate-100 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <Avatar name={user?.name} src={user?.avatarUrl} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {user?.name || "Account"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {roleLabel(user?.role)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          >
            <LogOut size={18} />
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={21} />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {PORTAL_LABEL[role]}
              </p>
              <p className="hidden text-xs text-slate-500 sm:block">
                {role === "customer"
                  ? "Track and manage your support requests"
                  : "Resolve customer issues and keep the queue moving"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {role === "admin" ? (
              <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 sm:inline-flex">
                <ShieldCheck size={14} />
                Admin
              </span>
            ) : null}

            <button
              type="button"
              aria-label="Notifications"
              onClick={() => navigate(notificationsPath)}
              className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50"
            >
              <Bell size={19} />
              {unread > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : null}
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 sm:p-7 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
