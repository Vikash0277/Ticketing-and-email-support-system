import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Inbox,
  PlusCircle,
  Ticket as TicketIcon,
  Users,
} from "lucide-react";

import { fetchDashboardSummary } from "../redux/dashboard/dashboardSlice";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageLoader,
  PriorityBadge,
  StatCard,
  StatusBadge,
} from "../components/ui";
import { formatRelative } from "../utils/format";

function TrendChart({ trends = [] }) {
  const max = Math.max(...trends.map((point) => point.created), 1);

  return (
    <div>
      <div className="flex h-40 items-end gap-1.5">
        {trends.map((point) => {
          const height = Math.max((point.created / max) * 100, 3);

          return (
            <div
              key={point.date}
              className="group relative flex flex-1 flex-col items-center justify-end"
              title={`${point.date}: ${point.created} created, ${point.resolved} resolved`}
            >
              <div
                className="w-full rounded-t-md bg-indigo-500/80 transition group-hover:bg-indigo-600"
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>{trends[0]?.date?.slice(5) ?? ""}</span>
        <span>Created tickets · last 14 days</span>
        <span>{trends[trends.length - 1]?.date?.slice(5) ?? ""}</span>
      </div>
    </div>
  );
}

function RecentTickets({ tickets = [], role }) {
  if (!tickets.length) {
    return (
      <EmptyState
        icon={Inbox}
        title="No tickets yet"
        description={
          role === "customer"
            ? "Create your first support ticket and our team will help you out."
            : "New customer requests will appear here."
        }
        action={
          <Link to={`/${role}/tickets/new`}>
            <Button size="sm">
              <PlusCircle size={16} />
              New ticket
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {tickets.map((ticket) => (
        <li key={ticket._id}>
          <Link
            to={`/${role}/tickets/${ticket._id}`}
            className="flex flex-col gap-2 px-4 py-3.5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {ticket.subject}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {ticket.ticketNumber} · updated {formatRelative(ticket.updatedAt)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
              <ArrowUpRight size={15} className="text-slate-400" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const STATUS_BREAKDOWN = [
  { key: "open", label: "Open" },
  { key: "pending", label: "Pending" },
  { key: "inProgress", label: "In progress" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
  { key: "reopened", label: "Reopened" },
];

function StatusBreakdown({ summary = {}, role = "customer" }) {
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Tickets by status
          </h2>
          <p className="text-xs text-slate-500">
            Where every ticket currently sits in the lifecycle
          </p>
        </div>
        <Link
          to={`/${role}/tickets`}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          View all
        </Link>
      </div>

      <dl className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        {STATUS_BREAKDOWN.map((item) => (
          <div key={item.key} className="px-4 py-4">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {item.label}
            </dt>
            <dd className="mt-1 text-2xl font-bold text-slate-900">
              {summary[item.key] ?? 0}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const role = user?.role ?? "customer";
  const { data, isLoading: loading, error } = useSelector(
    (state) => state.dashboard
  );

  useEffect(() => {
    dispatch(fetchDashboardSummary());
  }, [dispatch]);

  const cards = useMemo(() => {
    const summary = data?.summary ?? {};

    if (role === "customer") {
      return [
        {
          label: "Total tickets",
          value: summary.total,
          icon: TicketIcon,
          tone: "indigo",
        },
        {
          label: "Active",
          value:
            (summary.open ?? 0) +
            (summary.inProgress ?? 0) +
            (summary.pending ?? 0) +
            (summary.reopened ?? 0),
          icon: Clock3,
          tone: "amber",
        },
        {
          label: "Resolved",
          value: summary.resolved,
          icon: CheckCircle2,
          tone: "emerald",
        },
        {
          label: "Closed",
          value: summary.closed,
          icon: Inbox,
          tone: "slate",
        },
      ];
    }

    const staffCards = [
      {
        label: "Total tickets",
        value: summary.total,
        icon: TicketIcon,
        tone: "indigo",
      },
      {
        label: "Unassigned",
        value: summary.unassigned,
        icon: Inbox,
        tone: "sky",
      },
      {
        label: "Assigned to me",
        value: summary.assignedToMe,
        icon: Users,
        tone: "amber",
      },
      {
        label: "Overdue",
        value: summary.overdue,
        icon: AlertTriangle,
        tone: "red",
      },
    ];

    if (role === "admin" && data?.users) {
      staffCards.push({
        label: "Customers",
        value: data.users.customer ?? 0,
        icon: Users,
        tone: "slate",
      });
      staffCards.push({
        label: "Agents",
        value: data.users.agent ?? 0,
        icon: Users,
        tone: "indigo",
      });
    }

    return staffCards;
  }, [data, role]);

  if (loading && !data) return <PageLoader message="Loading your dashboard…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          role === "customer"
            ? `Welcome back${user?.name ? `, ${user.name}` : ""}`
            : "Operational overview"
        }
        description={
          role === "customer"
            ? "Track the status of your requests and get help from our support team."
            : "Real-time visibility into the queue, assignments, and SLAs."
        }
        action={
          <Link to={`/${role}/tickets/new`}>
            <Button>
              <PlusCircle size={17} />
              New ticket
            </Button>
          </Link>
        }
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </div>

      <StatusBreakdown summary={data?.summary} role={role} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Recent tickets
              </h2>
              <p className="text-xs text-slate-500">
                The latest support requests in your workspace
              </p>
            </div>
            <Link
              to={`/${role}/tickets`}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View all
            </Link>
          </div>
          <RecentTickets tickets={data?.recentTickets ?? []} role={role} />
        </Card>

        <div className="space-y-6">
          {role === "customer" ? (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Need a hand?
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Describe the issue and our support team will get back to you by
                email and inside this portal.
              </p>
              <Link to={`/${role}/tickets/new`} className="mt-4 block">
                <Button className="w-full">
                  <PlusCircle size={16} />
                  Create a ticket
                </Button>
              </Link>
            </Card>
          ) : (
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">
                Ticket trend
              </h2>
              <TrendChart trends={data?.trends ?? []} />
            </Card>
          )}

          {role !== "customer" && data?.agentWorkload?.length ? (
            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3.5">
                <h2 className="text-sm font-semibold text-slate-900">
                  Agent workload
                </h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {data.agentWorkload.map((agent) => (
                  <li
                    key={agent.agentId}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {agent.name}
                      </p>
                      <p className="text-xs text-slate-500">{agent.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {agent.open}
                      </p>
                      <p className="text-[11px] text-slate-500">open</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
