import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Bell,
  BellOff,
  CheckCheck,
  Inbox,
  MailOpen,
} from "lucide-react";

import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsReadThunk,
  markNotificationReadThunk,
} from "../redux/notifications/notificationsSlice";
import { getErrorMessage } from "../api/client";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  SkeletonRows,
  cn,
} from "../components/ui";
import { formatRelative } from "../utils/format";

const TYPE_LABEL = {
  ticket_created: "New ticket",
  ticket_assigned: "Assignment",
  ticket_reply: "Reply",
  ticket_status_changed: "Status change",
  ticket_reopened: "Reopened",
  sla_warning: "SLA warning",
};

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const role = user?.role ?? "customer";

  const {
    items: notifications,
    pagination,
    unreadCount,
    isLoading: loading,
    error: reduxError,
  } = useSelector((state) => state.notifications);

  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(() => {
    dispatch(
      fetchNotifications({
        page,
        limit: 20,
        unreadOnly: unreadOnly ? "true" : "",
      })
    );
    dispatch(fetchUnreadCount());
  }, [dispatch, page, unreadOnly]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setError("");
      load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handleRead = async (notification) => {
    if (notification.isRead) return;

    setBusyId(notification._id);

    try {
      await dispatch(markNotificationReadThunk(notification._id)).unwrap();
    } catch (requestError) {
      setError(
        typeof requestError === "string"
          ? requestError
          : getErrorMessage(requestError, "Unable to update this notification")
      );
    } finally {
      setBusyId("");
    }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    setError("");

    try {
      await dispatch(markAllNotificationsReadThunk()).unwrap();
    } catch (requestError) {
      setError(
        typeof requestError === "string"
          ? requestError
          : getErrorMessage(requestError, "Unable to mark all as read")
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const displayError = error || reduxError;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Notifications"
        description="Updates about your tickets, replies and assignments."
        actions={
          <>
            <Button
              variant={unreadOnly ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                setUnreadOnly((value) => !value);
                setPage(1);
              }}
            >
              {unreadOnly ? <Bell size={15} /> : <BellOff size={15} />}
              {unreadOnly ? "Unread only" : "All notifications"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              loading={markingAll}
              disabled={markingAll || unreadCount === 0}
              onClick={handleMarkAll}
            >
              <CheckCheck size={15} />
              Mark all read
            </Button>
          </>
        }
      >
        {unreadCount > 0 ? (
          <Badge className="mt-2 bg-indigo-50 text-indigo-700 ring-indigo-200">
            {unreadCount} unread
          </Badge>
        ) : null}
      </PageHeader>

      {displayError ? <Alert className="mb-4">{displayError}</Alert> : null}

      <Card className="overflow-hidden">
        {loading && notifications.length === 0 ? (
          <SkeletonRows rows={6} />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={unreadOnly ? "No unread notifications" : "You are all caught up"}
            description={
              unreadOnly
                ? "Everything has been read. Switch back to see your history."
                : "Ticket updates and replies will appear here."
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {notifications.map((notification) => {
                const content = (
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        notification.isRead
                          ? "bg-slate-100 text-slate-400"
                          : "bg-indigo-50 text-indigo-600"
                      )}
                    >
                      {notification.isRead ? (
                        <MailOpen size={18} />
                      ) : (
                        <Bell size={18} />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={cn(
                            "text-sm",
                            notification.isRead
                              ? "font-medium text-slate-700"
                              : "font-semibold text-slate-900"
                          )}
                        >
                          {notification.title}
                        </p>
                        <Badge className="bg-slate-100 text-slate-600 ring-slate-200">
                          {TYPE_LABEL[notification.type] ?? notification.type}
                        </Badge>
                        {!notification.isRead ? (
                          <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        ) : null}
                      </div>

                      <p className="mt-1 text-sm text-slate-600">
                        {notification.message}
                      </p>

                      <p className="mt-1.5 text-xs text-slate-400">
                        {formatRelative(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                );

                return (
                  <li key={notification._id}>
                    <div className="flex items-start gap-3 px-4 py-4 transition hover:bg-slate-50/70">
                      {notification.ticketId ? (
                        <Link
                          to={`/${role}/tickets/${notification.ticketId}`}
                          onClick={() => handleRead(notification)}
                          className="min-w-0 flex-1"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="min-w-0 flex-1">{content}</div>
                      )}

                      {!notification.isRead ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={busyId === notification._id}
                          onClick={() => handleRead(notification)}
                        >
                          Mark read
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>

            <Pagination
              pagination={pagination}
              onPageChange={(nextPage) => setPage(nextPage)}
            />
          </>
        )}
      </Card>
    </div>
  );
}
