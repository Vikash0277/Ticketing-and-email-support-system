import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Inbox,
  PlusCircle,
  Search,
  SlidersHorizontal,
  Ticket as TicketIcon,
} from "lucide-react";

import { fetchTickets } from "../redux/tickets/ticketsSlice";
import { fetchCategoryOptions } from "../redux/categories/categoriesSlice";
import { fetchAgents, fetchRequesters } from "../redux/users/usersSlice";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  PriorityBadge,
  SkeletonRows,
  StatusBadge,
  cn,
  inputClass,
} from "../components/ui";
import { formatRelative } from "../utils/format";

const STATUS_OPTIONS = [
  ["", "All statuses"],
  ["open", "Open"],
  ["in_progress", "In progress"],
  ["pending", "Pending"],
  ["resolved", "Resolved"],
  ["closed", "Closed"],
  ["reopened", "Reopened"],
];

const PRIORITY_OPTIONS = [
  ["", "All priorities"],
  ["urgent", "Urgent"],
  ["high", "High"],
  ["medium", "Medium"],
  ["low", "Low"],
];

const SORT_OPTIONS = [
  ["updated", "Recently updated"],
  ["newest", "Newest first"],
  ["oldest", "Oldest first"],
  ["priority", "Priority"],
];

const STAFF_VIEWS = [
  ["all", "All"],
  ["mine", "Assigned to me"],
  ["unassigned", "Unassigned"],
  ["overdue", "Overdue"],
];

export default function TicketListPage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const role = user?.role ?? "customer";
  const isStaff = role === "agent" || role === "admin";

  const { items: tickets, pagination, isLoading: loading, error } = useSelector(
    (state) => state.tickets.list
  );
  const categories = useSelector((state) => state.categories.options);
  const agents = useSelector((state) => state.users.agents);
  const requesters = useSelector((state) => state.users.requesters);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") ?? ""
  );

  const view = searchParams.get("view") ?? "all";
  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const assignedTo = searchParams.get("assignedTo") ?? "";
  const requesterId = searchParams.get("requesterId") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "updated";
  const page = Number(searchParams.get("page") ?? 1);
  const searchQuery = searchParams.toString();

  const updateParams = (changes) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);

        for (const [key, value] of Object.entries(changes)) {
          if (value === "" || value === null || value === undefined) {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
        }

        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    dispatch(fetchCategoryOptions());
  }, [dispatch]);

  useEffect(() => {
    if (isStaff) {
      dispatch(fetchAgents());
    }
  }, [dispatch, isStaff]);

  useEffect(() => {
    if (role === "admin") {
      dispatch(fetchRequesters());
    }
  }, [dispatch, role]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput !== (searchParams.get("search") ?? "")) {
        updateParams({ search: searchInput, page: "" });
      }
    }, 400);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    dispatch(
      fetchTickets({
        view: isStaff ? view : "all",
        status,
        priority,
        categoryId,
        assignedTo,
        requesterId,
        dateFrom,
        dateTo,
        sortBy,
        page,
        limit: 15,
        search: searchParams.get("search") ?? "",
      })
    );
  }, [dispatch, searchQuery, isStaff, view, status, priority, categoryId, assignedTo, requesterId, dateFrom, dateTo, sortBy, page, searchParams]);

  const activeFilters = useMemo(
    () =>
      [status, priority, categoryId, assignedTo, requesterId, dateFrom, dateTo]
        .filter(Boolean).length,
    [status, priority, categoryId, assignedTo, requesterId, dateFrom, dateTo]
  );

  const newTicketPath = `/${role}/tickets/new`;

  return (
    <div>
      <PageHeader
        title={isStaff ? "Ticket queue" : "My tickets"}
        description={
          isStaff
            ? "Search, filter and work through every customer request."
            : "Every support request you have raised, in one place."
        }
        actions={
          <Link to={newTicketPath}>
            <Button>
              <PlusCircle size={16} />
              New ticket
            </Button>
          </Link>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3">
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
                placeholder="Search by subject, number or requester email…"
                className={`${inputClass} pl-10`}
                aria-label="Search tickets"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto lg:grid-cols-4">
              <select
                value={status}
                onChange={(event) =>
                  updateParams({ status: event.target.value, page: "" })
                }
                className={inputClass}
                aria-label="Filter by status"
              >
                {STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={priority}
                onChange={(event) =>
                  updateParams({ priority: event.target.value, page: "" })
                }
                className={inputClass}
                aria-label="Filter by priority"
              >
                {PRIORITY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={categoryId}
                onChange={(event) =>
                  updateParams({ categoryId: event.target.value, page: "" })
                }
                className={inputClass}
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(event) =>
                  updateParams({ sortBy: event.target.value, page: "" })
                }
                className={inputClass}
                aria-label="Sort tickets"
              >
                {SORT_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isStaff ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <select
                value={assignedTo}
                onChange={(event) =>
                  updateParams({ assignedTo: event.target.value, page: "" })
                }
                className={inputClass}
                aria-label="Filter by assigned agent"
              >
                <option value="">All agents</option>
                {agents.map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {agent.name}
                    {agent.role === "admin" ? " (Admin)" : ""}
                  </option>
                ))}
              </select>

              {role === "admin" ? (
                <select
                  value={requesterId}
                  onChange={(event) =>
                    updateParams({ requesterId: event.target.value, page: "" })
                  }
                  className={inputClass}
                  aria-label="Filter by requester"
                >
                  <option value="">All requesters</option>
                  {requesters.map((requester) => (
                    <option key={requester._id} value={requester._id}>
                      {requester.name} · {requester.email}
                    </option>
                  ))}
                </select>
              ) : null}

              <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-2">
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) =>
                    updateParams({ dateFrom: event.target.value, page: "" })
                  }
                  className={inputClass}
                  aria-label="Created from date"
                  title="Created from"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) =>
                    updateParams({ dateTo: event.target.value, page: "" })
                  }
                  className={inputClass}
                  aria-label="Created until date"
                  title="Created until"
                />
              </div>
            </div>
          ) : null}

          {isStaff ? (
            <div className="flex flex-wrap items-center gap-2">
              {STAFF_VIEWS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateParams({ view: value, page: "" })}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    view === value
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {label}
                </button>
              ))}

              {activeFilters > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    updateParams({
                      status: "",
                      priority: "",
                      categoryId: "",
                      assignedTo: "",
                      requesterId: "",
                      dateFrom: "",
                      dateTo: "",
                      page: "",
                    })
                  }
                  className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  <SlidersHorizontal size={14} />
                  Clear filters ({activeFilters})
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>

      {error ? <Alert className="mb-4">{error}</Alert> : null}

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonRows rows={6} />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No tickets found"
            description={
              activeFilters || searchInput
                ? "Try adjusting your search or filters."
                : isStaff
                  ? "The queue is clear. Nice work!"
                  : "You have not created any tickets yet."
            }
            action={
              <Link to={newTicketPath}>
                <Button size="sm">
                  <PlusCircle size={16} />
                  Create a ticket
                </Button>
              </Link>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Ticket</th>
                    {isStaff ? (
                      <th className="px-4 py-3 font-semibold">Requester</th>
                    ) : null}
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Priority</th>
                    {isStaff ? (
                      <th className="px-4 py-3 font-semibold">Assignee</th>
                    ) : null}
                    <th className="px-4 py-3 font-semibold">Updated</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket._id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="max-w-xs px-4 py-3.5">
                        <Link
                          to={`/${role}/tickets/${ticket._id}`}
                          className="block"
                        >
                          <p className="truncate font-semibold text-slate-900 hover:text-indigo-700">
                            {ticket.subject}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {ticket.ticketNumber}
                            {ticket.categoryId?.name
                              ? ` · ${ticket.categoryId.name}`
                              : ""}
                          </p>
                        </Link>
                      </td>

                      {isStaff ? (
                        <td className="px-4 py-3.5">
                          <p className="text-sm text-slate-700">
                            {ticket.requesterName ||
                              ticket.requesterId?.name ||
                              "—"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {ticket.requesterEmail}
                          </p>
                        </td>
                      ) : null}

                      <td className="px-4 py-3.5">
                        <StatusBadge status={ticket.status} />
                        {ticket.isOverdue ? (
                          <p className="mt-1 text-[11px] font-semibold text-red-600">
                            Overdue
                          </p>
                        ) : null}
                      </td>

                      <td className="px-4 py-3.5">
                        <PriorityBadge priority={ticket.priority} />
                      </td>

                      {isStaff ? (
                        <td className="px-4 py-3.5 text-sm text-slate-700">
                          {ticket.assignedTo?.name || (
                            <span className="text-slate-400">Unassigned</span>
                          )}
                        </td>
                      ) : null}

                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">
                        {formatRelative(ticket.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {tickets.map((ticket) => (
                <li key={ticket._id}>
                  <Link
                    to={`/${role}/tickets/${ticket._id}`}
                    className="block px-4 py-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {ticket.subject}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {ticket.ticketNumber} · {formatRelative(ticket.updatedAt)}
                        </p>
                      </div>
                      <TicketIcon size={18} className="shrink-0 text-slate-300" />
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                      {isStaff ? (
                        <span className="text-xs text-slate-500">
                          {ticket.assignedTo?.name || "Unassigned"}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <Pagination
              pagination={pagination}
              onPageChange={(nextPage) => updateParams({ page: nextPage })}
            />
          </>
        )}
      </Card>
    </div>
  );
}
