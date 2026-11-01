import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  KeyRound,
  LogOut,
  Monitor,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  changePassword,
  listSessions,
  logoutAll,
  revokeSession,
} from "../api/auth";
import { getErrorMessage } from "../api/client";
import {
  clearAuth,
  fetchCurrentUser,
  updateProfile,
} from "../redux/auth/authSlice";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  PageHeader,
  PageLoader,
  inputClass,
} from "../components/ui";
import { formatDateTime, roleLabel } from "../utils/format";

function SessionRow({ session, onRevoke, revoking }) {
  return (
    <li className="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <Monitor size={17} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-800">
            {session.deviceName || "Browser session"}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {session.ipAddress || "Unknown IP"} · last used{" "}
            {formatDateTime(session.lastUsedAt)}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            {session.userAgent || "Unknown device"}
          </p>
        </div>
      </div>

      <Button
        size="sm"
        variant="secondary"
        className="shrink-0 self-start sm:self-auto"
        loading={revoking}
        onClick={() => onRevoke(session.id)}
      >
        Revoke
      </Button>
    </li>
  );
}

export default function ProfilePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth.user);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    jobTitle: "",
    avatarUrl: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [revokingId, setRevokingId] = useState("");
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [notice, setNotice] = useState("");

  const loadSessions = useCallback(async () => {
    try {
      const result = await listSessions();
      setSessions(Array.isArray(result) ? result : []);
    } catch {
      // Sessions are optional if the endpoint is unavailable.
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [userResult] = await Promise.all([
          dispatch(fetchCurrentUser()).unwrap(),
          loadSessions(),
        ]);

        if (!active) return;

        setForm({
          name: userResult.name ?? "",
          phone: userResult.phone ?? "",
          jobTitle: userResult.jobTitle ?? "",
          avatarUrl: userResult.avatarUrl ?? "",
        });
      } catch (requestError) {
        if (active) {
          setError(
            typeof requestError === "string"
              ? requestError
              : getErrorMessage(requestError, "Unable to load your profile")
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [dispatch, loadSessions]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError("");
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setError("");
    setNotice("");

    try {
      await dispatch(
        updateProfile({
          name: form.name.trim(),
          phone: form.phone.trim(),
          jobTitle: form.jobTitle.trim(),
          avatarUrl: form.avatarUrl.trim(),
        })
      ).unwrap();

      setNotice("Profile updated");
    } catch (requestError) {
      setError(
        typeof requestError === "string"
          ? requestError
          : getErrorMessage(requestError, "Unable to update your profile")
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((previous) => ({ ...previous, [name]: value }));
    setPasswordError("");
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");

    if (passwordForm.password.length < 8) {
      setPasswordError("The new password must be at least 8 characters.");
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }

    setSavingPassword(true);

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        password: passwordForm.password,
      });

      dispatch(clearAuth());
      navigate("/login", {
        replace: true,
        state: {
          message:
            "Password changed successfully. Sign in again with your new password.",
        },
      });
    } catch (requestError) {
      setPasswordError(
        getErrorMessage(requestError, "Unable to change your password")
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRevoke = async (sessionId) => {
    setRevokingId(sessionId);
    setError("");

    try {
      await revokeSession(sessionId);
      await loadSessions();
      setNotice("Session revoked");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to revoke this session"));
    } finally {
      setRevokingId("");
    }
  };

  const handleLogoutAll = async () => {
    setSigningOutAll(true);
    setError("");

    try {
      await logoutAll();
    } catch {
      // Clear the local session even if the API call fails.
    } finally {
      dispatch(clearAuth());
      navigate("/login", {
        replace: true,
        state: { message: "Signed out from all devices." },
      });
    }
  };

  if (loading) return <PageLoader message="Loading your profile…" />;

  const user = currentUser ?? {};

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Manage your account details, password and active sessions."
      />

      {notice ? (
        <Alert tone="success" className="mb-4">
          {notice}
        </Alert>
      ) : null}
      {error ? <Alert className="mb-4">{error}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-4">
              <Avatar name={user.name} src={user.avatarUrl} size="lg" />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-slate-900">
                  {user.name || "Account"}
                </h2>
                <p className="truncate text-sm text-slate-500">{user.email}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200">
                    {roleLabel(user.role)}
                  </Badge>
                  {user.isEmailVerified ? (
                    <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">
                      <CheckCircle2 size={12} className="mr-1" />
                      Email verified
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" htmlFor="name">
                  <input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleProfileChange}
                    className={inputClass}
                    autoComplete="name"
                  />
                </Field>

                <Field label="Job title" htmlFor="jobTitle">
                  <input
                    id="jobTitle"
                    name="jobTitle"
                    value={form.jobTitle}
                    onChange={handleProfileChange}
                    className={inputClass}
                    placeholder="e.g. Support agent"
                  />
                </Field>

                <Field
                  label="Phone number"
                  htmlFor="phone"
                  hint="Optional. Use international format, e.g. +919876543210."
                >
                  <input
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleProfileChange}
                    className={inputClass}
                    autoComplete="tel"
                  />
                </Field>

                <Field label="Avatar URL" htmlFor="avatarUrl">
                  <input
                    id="avatarUrl"
                    name="avatarUrl"
                    value={form.avatarUrl}
                    onChange={handleProfileChange}
                    className={inputClass}
                    placeholder="https://…"
                  />
                </Field>
              </div>

              <div className="flex justify-end">
                <Button type="submit" loading={savingProfile}>
                  <Save size={16} />
                  Save changes
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound size={18} className="text-indigo-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Change password
              </h2>
            </div>

            <p className="mb-4 text-sm text-slate-500">
              Changing your password signs you out of every device.
            </p>

            {passwordError ? (
              <Alert className="mb-4">{passwordError}</Alert>
            ) : null}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Field label="Current password" htmlFor="currentPassword">
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  className={inputClass}
                  autoComplete="current-password"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="New password" htmlFor="newPassword">
                  <input
                    id="newPassword"
                    name="password"
                    type="password"
                    value={passwordForm.password}
                    onChange={handlePasswordChange}
                    className={inputClass}
                    autoComplete="new-password"
                  />
                </Field>

                <Field label="Confirm new password" htmlFor="confirmPassword">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className={inputClass}
                    autoComplete="new-password"
                  />
                </Field>
              </div>

              <div className="flex justify-end">
                <Button type="submit" loading={savingPassword}>
                  <ShieldCheck size={16} />
                  Update password
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
              <UserRound size={17} />
              Account
            </h2>

            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Role</dt>
                <dd className="font-medium text-slate-800">
                  {roleLabel(user.role)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Status</dt>
                <dd className="font-medium text-slate-800">
                  {user.isActive === false ? "Inactive" : "Active"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Email</dt>
                <dd className="truncate font-medium text-slate-800">
                  {user.email}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Joined</dt>
                <dd className="font-medium text-slate-800">
                  {formatDateTime(user.createdAt)}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <div className="mb-1 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Monitor size={17} />
                Active sessions
              </h2>
              <Badge className="bg-slate-100 text-slate-600 ring-slate-200">
                {sessions.length}
              </Badge>
            </div>

            {sessions.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">
                No other active sessions.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    onRevoke={handleRevoke}
                    revoking={revokingId === session.id}
                  />
                ))}
              </ul>
            )}

            <Button
              variant="danger"
              className="mt-4 w-full"
              loading={signingOutAll}
              onClick={handleLogoutAll}
            >
              <LogOut size={16} />
              Sign out everywhere
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
