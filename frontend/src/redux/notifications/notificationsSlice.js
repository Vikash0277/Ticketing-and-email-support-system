import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/resources";
import { getErrorMessage } from "../../api/client";

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async (params = {}, { rejectWithValue }) => {
    try {
      return await listNotifications(params);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to load notifications")
      );
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  "notifications/fetchUnreadCount",
  async (_, { rejectWithValue }) => {
    try {
      const result = await getUnreadCount();
      return result?.unreadCount ?? 0;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to load unread count")
      );
    }
  }
);

export const markNotificationReadThunk = createAsyncThunk(
  "notifications/markRead",
  async (notificationId, { rejectWithValue }) => {
    try {
      await markNotificationRead(notificationId);
      return notificationId;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to mark notification as read")
      );
    }
  }
);

export const markAllNotificationsReadThunk = createAsyncThunk(
  "notifications/markAllRead",
  async (_, { rejectWithValue }) => {
    try {
      await markAllNotificationsRead();
      return true;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to mark all notifications as read")
      );
    }
  }
);

const initialState = {
  items: [],
  pagination: null,
  unreadCount: 0,
  isLoading: false,
  error: null,
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setUnreadCountManual: (state, action) => {
      state.unreadCount = action.payload;
    },
    clearNotificationsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchNotifications
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items || [];
        state.pagination = action.payload.pagination || null;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to load notifications";
      })

      // fetchUnreadCount
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })

      // markNotificationReadThunk
      .addCase(markNotificationReadThunk.fulfilled, (state, action) => {
        const id = action.payload;
        state.items = state.items.map((n) =>
          n._id === id ? { ...n, isRead: true } : n
        );
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      })

      // markAllNotificationsReadThunk
      .addCase(markAllNotificationsReadThunk.fulfilled, (state) => {
        state.items = state.items.map((n) => ({ ...n, isRead: true }));
        state.unreadCount = 0;
      });
  },
});

export const { setUnreadCountManual, clearNotificationsError } =
  notificationsSlice.actions;
export default notificationsSlice.reducer;

