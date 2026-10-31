const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatRelative(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (abs < minute) return "just now";
  if (abs < hour) return formatter.format(Math.round(diff / minute), "minute");
  if (abs < day) return formatter.format(Math.round(diff / hour), "hour");
  if (abs < 30 * day) return formatter.format(Math.round(diff / day), "day");

  return formatDate(value);
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

export const STATUS_META = {
  open: {
    label: "Open",
    className: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  in_progress: {
    label: "In progress",
    className: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  resolved: {
    label: "Resolved",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  closed: {
    label: "Closed",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  },
  reopened: {
    label: "Reopened",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

export const PRIORITY_META = {
  low: {
    label: "Low",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  },
  medium: {
    label: "Medium",
    className: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  high: {
    label: "High",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  urgent: {
    label: "Urgent",
    className: "bg-red-50 text-red-700 ring-red-200",
  },
};

export function statusMeta(status) {
  return STATUS_META[status] ?? { label: status || "Unknown", className: "" };
}

export function priorityMeta(priority) {
  return (
    PRIORITY_META[priority] ?? {
      label: priority || "Unknown",
      className: "",
    }
  );
}

export function roleLabel(role) {
  return { customer: "Customer", agent: "Agent", admin: "Administrator" }[
    role
  ] ?? role;
}

export function actionLabel(action) {
  return (
    {
      created: "created the ticket",
      assigned: "assigned the ticket",
      reassigned: "reassigned the ticket",
      status_changed: "changed the status",
      priority_changed: "changed the priority",
      category_changed: "changed the category",
      replied: "replied",
      internal_note_added: "added an internal note",
      resolved: "resolved the ticket",
      closed: "closed the ticket",
      reopened: "reopened the ticket",
    }[action] ?? action
  );
}

export function truncate(text = "", length = 120) {
  if (text.length <= length) return text;
  return `${text.slice(0, length).trimEnd()}…`;
}
