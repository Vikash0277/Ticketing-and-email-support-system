import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
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

import { getDashboardSummary } from "../api/resources";
import { getErrorMessage } from "../api/client";
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

export default function DashboardPage() {
  const user = useSelector((state) => state.auth.user);
  const role = user?.role ?? "customer";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await getDashboardSummary();
        if (active) setData(result);
      } catch (requestError) {
        if (active) {
          setError(
            getErrorMessage(requestError, "Unable to load your dashboard")
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
  }, []);

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
        tone: "rose",
      },
    ];

    if (role === "admin") {
      staffCards.push({
        label: "Registered users",
        value: data?.users?.totalUsers,
        icon: Users,
        tone: "emerald",
        hint: `${data?.users?.totalAgents ?? 0} agents · ${
          data?.users?.totalCustomers ?? 0
        } customers`,
      });
    }

    return staffCards;
  }, [role, data]);

  if (loading) return <PageLoader label="Loading dashboard…" />;

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <Alert>{error}</Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] || "there"}`}
        description={
          role === "customer"
            ? "A quick overview of your support requests."
            : "Here is what is happening across the support queue."
        }
        actions={
          <>
            <Link to={`/${role}/tickets/new`}>
              <Button>
                <PlusCircle size={16} />
                New ticket
              </Button>
            </Link>
            <Link to={`/${role}/tickets`}>
              <Button variant="secondary">View tickets</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Recent tickets
              </h2>
              <p className="text-xs text-slate-500">
                The latest activity in your workspace
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
