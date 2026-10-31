import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Download,
  Inbox,
  Mail,
  MessageSquare,
  Paperclip,
  PlayCircle,
  RotateCcw,
  Send,
  ShieldAlert,
  Timer,
  UserRound,
  XCircle,
} from "lucide-react";

import {
  assignTicket,
  closeTicket,
  createMessage,
  getTicket,
  listActivities,
  listMessages,
  reopenTicket,
  resolveTicket,
  simulateInboundEmail,
  updateTicketStatus,
} from "../api/tickets";
import { listAgents } from "../api/resources";
import { downloadFile, getErrorMessage } from "../api/client";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  PageLoader,
  PriorityBadge,
  StatusBadge,
  cn,
  inputClass,
} from "../components/ui";
import {
  actionLabel,
  formatBytes,
  formatDateTime,
  formatRelative,
  roleLabel,
} from "../utils/format";

const STAFF_ROLES = ["agent", "admin"];

function activityValue(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") return value.replaceAll("_", " ");
  if (typeof value === "object") {
    return value.name || value.email || JSON.stringify(value);
  }
  return String(value);
}

function MessageCard({ message, onDownload }) {
  const isStaff = STAFF_ROLES.includes(message.senderRole);
  const isInternal = message.type === "internal";

  return (
    <article
      className={cn(
        "rounded-2xl border p-4",
        isInternal
          ? "border-amber-200 bg-amber-50/70"
          : isStaff
            ? "border-indigo-100 bg-indigo-50/40"
            : "border-slate-200 bg-white"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={message.senderName} size="sm" />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {message.senderName || message.senderEmail}
            </p>
            <p className="text-xs text-slate-500">
              {roleLabel(message.senderRole)} · {formatRelative(message.createdAt)}
              {message.source === "email" ? " · via email" : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isInternal ? (
            <Badge className="bg-amber-100 text-amber-800 ring-amber-200">
              Internal note
            </Badge>
          ) : null}
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
        {message.body}
      </p>

      {message.attachments?.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {message.attachments.map((attachment) => (
            <li key={attachment._id}>
              <button
                type="button"
                onClick={() => onDownload(attachment)}
                className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
              >
                <Paperclip size={13} />
                <span className="truncate">{attachment.filename}</span>
                <span className="text-slate-400">
                  {formatBytes(attachment.size)}
                </span>
                <Download size={13} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function Timeline({ activities }) {
  if (!activities.length) {
    return (
      <EmptyState
        icon={CircleDot}
        title="No activity yet"
        description="Actions on this ticket will be recorded here."
      />
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {activities.map((activity) => {
        const oldValue = activityValue(activity.oldValue);
        const newValue = activityValue(activity.newValue);

        return (
          <li key={activity._id} className="relative">
            <span className="absolute -left-[1.6rem] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-white bg-indigo-500 ring-1 ring-indigo-200" />
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-slate-900">
                {activity.actorId?.name || "System"}
              </span>{" "}
              {actionLabel(activity.action)}
              {oldValue && newValue && oldValue !== newValue ? (
                <>
                  {" "}
                  from <span className="font-medium">{oldValue}</span> to{" "}
                  <span className="font-medium">{newValue}</span>
                </>
              ) : null}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatDateTime(activity.createdAt)}
            </p>
            {activity.metadata?.note ? (
              <p className="mt-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                {activity.metadata.note}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export default function TicketDetailPage() {
  const { ticketId } = useParams();
  const user = useSelector((state) => state.auth.user);
  const role = user?.role ?? "customer";
  const isStaff = STAFF_ROLES.includes(role);

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activities, setActivities] = useState([]);
  const [agents, setAgents] = useState([]);
  const [tab, setTab] = useState("conversation");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  const [reply, setReply] = useState("");
  const [replyType, setReplyType] = useState("public");
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);

  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simulatorText, setSimulatorText] = useState("");
  const [simulating, setSimulating] = useState(false);

  const loadAll = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);

      try {
        const [ticketData, messagePage, activityPage] = await Promise.all([
          getTicket(ticketId),
          listMessages(ticketId, { limit: 100, sortOrder: "asc" }),
          listActivities(ticketId, { limit: 100, sortOrder: "asc" }),
        ]);

        setTicket(ticketData);
        setMessages(messagePage.items);
        setActivities(activityPage.items);
        setError("");
      } catch (requestError) {
        setError(
          getErrorMessage(requestError, "Unable to load this ticket right now")
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [ticketId]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => loadAll(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAll]);

  useEffect(() => {
    if (!isStaff) return;

    listAgents()
      .then(setAgents)
      .catch(() => {
        // Assignment dropdown is optional if the lookup fails.
      });
  }, [isStaff]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const runAction = async (key, action, successMessage) => {
    setBusy(key);
    setActionError("");
    setNotice("");

    try {
      await action();
      setNotice(successMessage);
      await loadAll({ silent: true });
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, "Action failed"));
    } finally {
      setBusy("");
    }
  };

  const handleDownload = async (attachment) => {
    try {
      await downloadFile(attachment.url, attachment.filename);
    } catch (downloadError) {
      setActionError(
        getErrorMessage(downloadError, "Unable to download this attachment")
      );
    }
  };

  const handleReply = async (event) => {
    event.preventDefault();

    if (!reply.trim()) return;

    setSending(true);
    setActionError("");

    try {
      await createMessage(ticketId, {
        body: reply.trim(),
        type: replyType,
        attachments: files,
      });

      setReply("");
      setReplyType("public");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice("Reply added");
      await loadAll({ silent: true });
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, "Unable to send the reply"));
    } finally {
      setSending(false);
    }
  };

  const handleSimulate = async (event) => {
    event.preventDefault();

    if (!simulatorText.trim()) return;

    setSimulating(true);
    setActionError("");

    try {
      await simulateInboundEmail({
        ticketId,
        from: ticket?.requesterEmail,
        text: simulatorText.trim(),
      });

      setSimulatorOpen(false);
      setSimulatorText("");
      setNotice("Simulated inbound email processed");
      await loadAll({ silent: true });
    } catch (requestError) {
      setActionError(
        getErrorMessage(requestError, "Unable to simulate the email")
      );
    } finally {
      setSimulating(false);
    }
  };

  const status = ticket?.status;
  const canReply = !(isStaff && ["resolved", "closed"].includes(status));

  const actions = useMemo(() => {
    if (!ticket) return [];

    const list = [];

    if (isStaff && ["open", "reopened"].includes(status)) {
      list.push({
        key: "in_progress",
        label: "Start progress",
        icon: PlayCircle,
        variant: "primary",
        run: () => updateTicketStatus(ticketId, { status: "in_progress" }),
      });
    }

    if (isStaff && ["open", "in_progress", "reopened"].includes(status)) {
      list.push({
        key: "pending",
        label: "Mark pending",
        icon: Timer,
        variant: "warning",
        run: () => updateTicketStatus(ticketId, { status: "pending" }),
      });
    }

    if (isStaff && !["resolved", "closed"].includes(status)) {
      list.push({
        key: "resolved",
        label: "Resolve",
        icon: CheckCircle2,
        variant: "success",
        run: () => resolveTicket(ticketId),
      });
    }

    if (isStaff && status !== "closed") {
      list.push({
        key: "closed",
        label: "Close",
        icon: XCircle,
        variant: "secondary",
        run: () => closeTicket(ticketId),
      });
    }

    if (["resolved", "closed"].includes(status)) {
      list.push({
        key: "reopened",
        label: "Reopen",
        icon: RotateCcw,
        variant: "danger",
        run: () => reopenTicket(ticketId),
      });
    }

    return list;
  }, [ticket, isStaff, status, ticketId]);

  if (loading) return <PageLoader label="Loading ticket…" />;

  if (error) {
    return (
      <div>
        <Link
          to={`/${role}/tickets`}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to tickets
        </Link>
        <Alert>{error}</Alert>
      </div>
    );
  }

  if (!ticket) return null;

  const requesterName =
    ticket.requesterId?.name || ticket.requesterName || "Customer";
  const requesterEmail =
    ticket.requesterId?.email || ticket.requesterEmail || "";

  return (
    <div>
      <Link
        to={`/${role}/tickets`}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        Back to tickets
      </Link>

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {ticket.ticketNumber}
            </span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            {ticket.isOverdue ? (
              <Badge className="bg-red-50 text-red-700 ring-red-200">
                Overdue
              </Badge>
            ) : null}
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {ticket.subject}
          </h1>

          <p className="mt-1.5 text-sm text-slate-500">
            Opened by {requesterName} · {formatDateTime(ticket.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.key}
              variant={action.variant}
              size="sm"
              loading={busy === action.key}
              disabled={Boolean(busy)}
              onClick={() =>
                runAction(
                  action.key,
                  action.run,
                  `Ticket marked ${action.label.toLowerCase()}`
                )
              }
            >
              <action.icon size={15} />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {actionError ? <Alert className="mb-4">{actionError}</Alert> : null}
      {notice ? (
        <Alert tone="success" className="mb-4">
          {notice}
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card className="overflow-hidden">
            <div className="flex items-center gap-1 border-b border-slate-100 px-3">
              <button
                type="button"
                onClick={() => setTab("conversation")}
                className={cn(
                  "inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition",
                  tab === "conversation"
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                <MessageSquare size={16} />
                Conversation ({messages.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("timeline")}
                className={cn(
                  "inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition",
                  tab === "timeline"
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                <CircleDot size={16} />
                Timeline ({activities.length})
              </button>
            </div>

            <div className="p-4 sm:p-5">
              {tab === "conversation" ? (
                messages.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="No messages yet"
                    description="Start the conversation below."
                  />
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <MessageCard
                        key={message._id}
                        message={message}
                        onDownload={handleDownload}
                      />
                    ))}
                  </div>
                )
              ) : (
                <Timeline activities={activities} />
              )}
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">
              Add a reply
            </h2>

            {canReply ? (
              <form onSubmit={handleReply} className="space-y-3">
                <textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  rows={5}
                  placeholder={
                    replyType === "internal"
                      ? "Write an internal note visible only to staff…"
                      : "Write a reply to the customer…"
                  }
                  className={`${inputClass} resize-y`}
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    {isStaff ? (
                      <select
                        value={replyType}
                        onChange={(event) => setReplyType(event.target.value)}
                        className={`${inputClass} w-auto`}
                        aria-label="Message visibility"
                      >
                        <option value="public">Public reply</option>
                        <option value="internal">Internal note</option>
                      </select>
                    ) : null}

                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900">
                      <Paperclip size={15} />
                      Attach files
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(event) =>
                          setFiles(
                            Array.from(event.target.files ?? []).slice(0, 5)
                          )
                        }
                        accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip"
                      />
                    </label>

                    {files.length ? (
                      <span className="text-xs text-slate-500">
                        {files.length} file{files.length === 1 ? "" : "s"} ready
                      </span>
                    ) : null}
                  </div>

                  <Button
                    type="submit"
                    loading={sending}
                    disabled={sending || !reply.trim()}
                  >
                    <Send size={16} />
                    Send
                  </Button>
                </div>
              </form>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This ticket is {status}. Reopen it before adding a staff reply.
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">
              Ticket details
            </h2>

            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Requester</dt>
                <dd className="text-right">
                  <p className="font-medium text-slate-800">{requesterName}</p>
                  <p className="text-xs text-slate-500">{requesterEmail}</p>
                </dd>
              </div>

              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Assignee</dt>
                <dd className="text-right font-medium text-slate-800">
                  {ticket.assignedTo?.name || "Unassigned"}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Category</dt>
                <dd className="text-right font-medium text-slate-800">
                  {ticket.categoryId?.name || "—"}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Priority</dt>
                <dd>
                  <PriorityBadge priority={ticket.priority} />
                </dd>
              </div>

              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-right text-slate-700">
                  {formatDateTime(ticket.createdAt)}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Last activity</dt>
                <dd className="text-right text-slate-700">
                  {formatRelative(ticket.lastMessageAt || ticket.updatedAt)}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-slate-500">
                  <CalendarClock size={14} />
                  Due
                </dt>
                <dd
                  className={cn(
                    "text-right",
                    ticket.isOverdue
                      ? "font-semibold text-red-600"
                      : "text-slate-700"
                  )}
                >
                  {formatDateTime(ticket.dueAt)}
                </dd>
              </div>

              {ticket.tags?.length ? (
                <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                  {ticket.tags.map((tag) => (
                    <Badge
                      key={tag}
                      className="bg-slate-100 text-slate-600 ring-slate-200"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </dl>
          </Card>

          {isStaff ? (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                Assignment
              </h2>

              <Field label="Assigned agent" htmlFor="assignee">
                <select
                  id="assignee"
                  value={ticket.assignedTo?._id || ""}
                  onChange={(event) =>
                    runAction(
                      "assign",
                      () => assignTicket(ticketId, event.target.value || null),
                      event.target.value
                        ? "Ticket assigned"
                        : "Ticket unassigned"
                    )
                  }
                  disabled={Boolean(busy)}
                  className={inputClass}
                >
                  <option value="">Unassigned</option>
                  {agents.map((agent) => (
                    <option key={agent._id} value={agent._id}>
                      {agent.name} ({roleLabel(agent.role)})
                    </option>
                  ))}
                </select>
              </Field>

              {busy === "assign" ? (
                <p className="mt-2 text-xs text-slate-500">Updating…</p>
              ) : null}
            </Card>
          ) : null}

          <Card className="p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <UserRound size={15} />
              Participants
            </h2>

            <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 p-3">
              <Avatar name={requesterName} src={ticket.requesterId?.avatarUrl} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {requesterName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  Requester · {requesterEmail}
                </p>
              </div>
            </div>

            {ticket.assignedTo ? (
              <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-slate-50 p-3">
                <Avatar
                  name={ticket.assignedTo.name}
                  src={ticket.assignedTo.avatarUrl}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {ticket.assignedTo.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {ticket.assignedTo.jobTitle || roleLabel("agent")} ·{" "}
                    {ticket.assignedTo.email}
                  </p>
                </div>
              </div>
            ) : null}
          </Card>

          {isStaff ? (
            <Card className="p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Mail size={15} />
                Email tools
              </h2>
              <p className="mb-3 text-xs text-slate-500">
                Outbound replies use the ticket reply address. You can inject a
                simulated customer email when the inbound domain is not
                configured.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setSimulatorOpen(true)}
              >
                <Mail size={15} />
                Simulate inbound reply
              </Button>
            </Card>
          ) : null}

          <Card className="p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldAlert size={15} />
              SLA
            </h2>
            <p className="text-xs text-slate-500">
              {ticket.isOverdue
                ? "This ticket has passed its response target."
                : ["resolved", "closed"].includes(ticket.status)
                  ? "This ticket is within its lifecycle."
                  : "This ticket is within its response target."}
            </p>
          </Card>
        </div>
      </div>

      <Modal
        open={simulatorOpen}
        title="Simulate inbound customer email"
        description="Creates an inbound email message on this ticket using the real threading processor."
        onClose={() => setSimulatorOpen(false)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setSimulatorOpen(false)}
              disabled={simulating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="simulate-email-form"
              loading={simulating}
              disabled={simulating || !simulatorText.trim()}
            >
              Process email
            </Button>
          </>
        }
      >
        <form id="simulate-email-form" onSubmit={handleSimulate}>
          <Field
            label="Email body"
            htmlFor="simulator-text"
            hint={`From: ${ticket.requesterEmail}`}
          >
            <textarea
              id="simulator-text"
              value={simulatorText}
              onChange={(event) => setSimulatorText(event.target.value)}
              rows={6}
              placeholder="Customer reply text…"
              className={`${inputClass} resize-y`}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
