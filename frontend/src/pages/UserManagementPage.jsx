import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  CheckCircle2,
  Pencil,
  PlusCircle,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  XCircle,
} from "lucide-react";

import {
  createUserThunk,
  fetchUsers,
  fetchUserStats,
  updateUserStatusThunk,
  updateUserThunk,
} from "../redux/users/usersSlice";
import { getErrorMessage, getFieldErrors } from "../api/client";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Pagination,
  SkeletonRows,
  StatCard,
  cn,
  inputClass,
} from "../components/ui";
import { formatDate, roleLabel } from "../utils/format";

const ROLE_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "agent", label: "Agent" },
  { value: "admin", label: "Administrator" },
];

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  phone: "",
  jobTitle: "",
  role: "customer",
};

function RoleBadge({ role }) {
  const tones = {
    admin: "bg-violet-50 text-violet-700 ring-violet-200",
    agent: "bg-sky-50 text-sky-700 ring-sky-200",
    customer: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  return <Badge className={tones[role] ?? tones.customer}>{roleLabel(role)}</Badge>;
}

export default function UserManagementPage() {
  const dispatch = useDispatch();
  const {
    items: users,
    pagination,
    stats,
    isLoading: loading,
    error: reduxError,
  } = useSelector((state) => state.users);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState({ open: false, mode: "create", user: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadStats = useCallback(() => {
    return dispatch(fetchUserStats());
  }, [dispatch]);

  const loadUsers = useCallback(() => {
    return dispatch(
      fetchUsers({
        page,
        limit: 15,
        search,
        role,
        isActive: status,
      })
    );
  }, [dispatch, page, search, role, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setError("");
      loadUsers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadStats();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadStats]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError("");
    setModal({ open: true, mode: "create", user: null });
  };

  const openEdit = (user) => {
    setForm({
      name: user.name ?? "",
      email: user.email ?? "",
      password: "",
      phone: user.phone ?? "",
      jobTitle: user.jobTitle ?? "",
      role: user.role ?? "customer",
    });
    setFieldErrors({});
    setFormError("");
    setModal({ open: true, mode: "edit", user });
  };

  const closeModal = () => {
    if (saving) return;
    setModal({ open: false, mode: "create", user: null });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setFieldErrors((previous) => ({ ...previous, [name]: "" }));
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setFieldErrors({});

    try {
      if (modal.mode === "create") {
        await dispatch(
          createUserThunk({
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            phone: form.phone.trim(),
            jobTitle: form.jobTitle.trim(),
            role: form.role,
          })
        ).unwrap();
        setNotice("User created");
      } else {
        await dispatch(
          updateUserThunk({
            userId: modal.user._id,
            payload: {
              name: form.name.trim(),
              email: form.email.trim().toLowerCase(),
              phone: form.phone.trim(),
              jobTitle: form.jobTitle.trim(),
              role: form.role,
            },
          })
        ).unwrap();
        setNotice("User updated");
      }

      setModal({ open: false, mode: "create", user: null });
      loadUsers();
      loadStats();
    } catch (requestError) {
      setFieldErrors(getFieldErrors(requestError));
      setFormError(
        typeof requestError === "string"
          ? requestError
          : getErrorMessage(requestError, "Unable to save this user")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user) => {
    setBusyId(user._id);
    setError("");

    try {
      await dispatch(
        updateUserStatusThunk({
          userId: user._id,
          isActive: !user.isActive,
        })
      ).unwrap();
      setNotice(user.isActive ? "User deactivated" : "User activated");
      loadUsers();
      loadStats();
    } catch (requestError) {
      setError(
        typeof requestError === "string"
          ? requestError
          : getErrorMessage(requestError, "Unable to update the user status")
      );
    } finally {
      setBusyId("");
    }
  };

  const statCards = useMemo(
    () => [
      {
        label: "Total users",
        value: stats?.total,
        icon: Users,
        tone: "indigo",
      },
      {
        label: "Active",
        value: stats?.active,
        icon: UserCheck,
        tone: "emerald",
      },
      {
        label: "Agents",
        value: stats?.agents,
        icon: ShieldCheck,
        tone: "sky",
      },
      {
        label: "Customers",
        value: stats?.customers,
        icon: Users,
        tone: "amber",
      },
    ],
    [stats]
  );

  const activeFilters = [role, status].filter(Boolean).length;
  const displayError = error || reduxError;

  return (
    <div>
      <PageHeader
        title="User management"
        description="Create accounts, assign roles and control access."
        actions={
          <Button onClick={openCreate}>
            <PlusCircle size={16} />
            New user
          </Button>
        }
      />

      {notice ? (
        <Alert tone="success" className="mb-4">
          {notice}
        </Alert>
      ) : null}
      {displayError ? <Alert className="mb-4">{displayError}</Alert> : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name or email…"
              className={`${inputClass} pl-10`}
              aria-label="Search users"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto">
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setPage(1);
              }}
              className={inputClass}
              aria-label="Filter by role"
            >
              <option value="">All roles</option>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className={inputClass}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            {activeFilters > 0 ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setRole("");
                  setStatus("");
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonRows rows={6} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description="Try a different search or filter."
            action={
              <Button size="sm" onClick={openCreate}>
                <PlusCircle size={16} />
                Create a user
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Joined</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr
                      key={user._id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={user.name}
                            src={user.avatarUrl}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {user.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {user.email}
                            </p>
                            {user.jobTitle ? (
                              <p className="truncate text-[11px] text-slate-400">
                                {user.jobTitle}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <RoleBadge role={user.role} />
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-semibold",
                            user.isActive ? "text-emerald-600" : "text-slate-400"
                          )}
                        >
                          {user.isActive ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <XCircle size={14} />
                          )}
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                        {!user.isEmailVerified ? (
                          <p className="mt-0.5 text-[11px] text-amber-600">
                            Email unverified
                          </p>
                        ) : null}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">
                        {formatDate(user.createdAt)}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(user)}
                          >
                            <Pencil size={14} />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            loading={busyId === user._id}
                            disabled={Boolean(busyId)}
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.isActive ? (
                              <>
                                <UserX size={14} />
                                Disable
                              </>
                            ) : (
                              <>
                                <UserCheck size={14} />
                                Enable
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              pagination={pagination}
              onPageChange={(nextPage) => setPage(nextPage)}
            />
          </>
        )}
      </Card>

      <Modal
        open={modal.open}
        title={modal.mode === "create" ? "Create a user" : "Edit user"}
        description={
          modal.mode === "create"
            ? "Admin-created accounts can sign in immediately."
            : "Update account details or change the role."
        }
        onClose={closeModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="user-form"
              loading={saving}
              disabled={saving}
            >
              {modal.mode === "create" ? "Create user" : "Save changes"}
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
          {formError ? <Alert>{formError}</Alert> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="user-name" error={fieldErrors.name}>
              <input
                id="user-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                className={inputClass}
                autoComplete="off"
              />
            </Field>

            <Field
              label="Email address"
              htmlFor="user-email"
              error={fieldErrors.email}
            >
              <input
                id="user-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className={inputClass}
                autoComplete="off"
              />
            </Field>

            {modal.mode === "create" ? (
              <Field
                label="Temporary password"
                htmlFor="user-password"
                error={fieldErrors.password}
                hint="At least 8 characters."
              >
                <input
                  id="user-password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  className={inputClass}
                  autoComplete="new-password"
                />
              </Field>
            ) : null}

            <Field
              label="Phone number"
              htmlFor="user-phone"
              error={fieldErrors.phone}
              hint="Optional, international format."
            >
              <input
                id="user-phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className={inputClass}
                autoComplete="off"
              />
            </Field>

            <Field
              label="Job title"
              htmlFor="user-jobTitle"
              error={fieldErrors.jobTitle}
            >
              <input
                id="user-jobTitle"
                name="jobTitle"
                value={form.jobTitle}
                onChange={handleChange}
                className={inputClass}
                autoComplete="off"
              />
            </Field>

            <Field label="Role" htmlFor="user-role" error={fieldErrors.role}>
              <select
                id="user-role"
                name="role"
                value={form.role}
                onChange={handleChange}
                className={inputClass}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
