import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  assignTicket,
  closeTicket,
  createMessage,
  createTicket,
  getTicket,
  listActivities,
  listMessages,
  listTickets,
  reopenTicket,
  resolveTicket,
  simulateInboundEmail,
  updateTicket,
  updateTicketStatus,
} from "../../api/tickets";
import { getErrorMessage } from "../../api/client";

export const fetchTickets = createAsyncThunk(
  "tickets/fetchTickets",
  async (params = {}, { rejectWithValue }) => {
    try {
      return await listTickets(params);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to load tickets right now")
      );
    }
  }
);

export const fetchTicketById = createAsyncThunk(
  "tickets/fetchTicketById",
  async (ticketId, { rejectWithValue }) => {
    try {
      return await getTicket(ticketId);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to load ticket details")
      );
    }
  }
);

export const fetchTicketMessages = createAsyncThunk(
  "tickets/fetchTicketMessages",
  async ({ ticketId, params = {} }, { rejectWithValue }) => {
    try {
      return await listMessages(ticketId, params);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to load messages")
      );
    }
  }
);

export const fetchTicketActivities = createAsyncThunk(
  "tickets/fetchTicketActivities",
  async ({ ticketId, params = {} }, { rejectWithValue }) => {
    try {
      return await listActivities(ticketId, params);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to load activities")
      );
    }
  }
);

export const fetchTicketDetails = createAsyncThunk(
  "tickets/fetchTicketDetails",
  async ({ ticketId, silent = false }, { rejectWithValue }) => {
    try {
      const [ticketData, messagePage, activityPage] = await Promise.all([
        getTicket(ticketId),
        listMessages(ticketId, { limit: 100, sortOrder: "asc" }),
        listActivities(ticketId, { limit: 100, sortOrder: "asc" }),
      ]);

      return {
        ticket: ticketData,
        messages: messagePage.items || [],
        activities: activityPage.items || [],
        silent,
      };
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to load this ticket right now")
      );
    }
  }
);

export const createTicketThunk = createAsyncThunk(
  "tickets/createTicket",
  async (payload, { rejectWithValue }) => {
    try {
      return await createTicket(payload);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to create the ticket right now")
      );
    }
  }
);

export const updateTicketThunk = createAsyncThunk(
  "tickets/updateTicket",
  async ({ ticketId, payload }, { rejectWithValue }) => {
    try {
      return await updateTicket(ticketId, payload);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to update the ticket")
      );
    }
  }
);

export const updateTicketStatusThunk = createAsyncThunk(
  "tickets/updateTicketStatus",
  async ({ ticketId, status, payload = {}, actionType = "status" }, { rejectWithValue }) => {
    try {
      let updated;
      if (actionType === "resolve") {
        updated = await resolveTicket(ticketId, payload);
      } else if (actionType === "reopen") {
        updated = await reopenTicket(ticketId, payload);
      } else if (actionType === "close") {
        updated = await closeTicket(ticketId, payload);
      } else {
        updated = await updateTicketStatus(ticketId, { status, ...payload });
      }
      return updated;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to update ticket status")
      );
    }
  }
);

export const assignTicketThunk = createAsyncThunk(
  "tickets/assignTicket",
  async ({ ticketId, assignedTo }, { rejectWithValue }) => {
    try {
      return await assignTicket(ticketId, assignedTo);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to assign ticket")
      );
    }
  }
);

export const createMessageThunk = createAsyncThunk(
  "tickets/createMessage",
  async ({ ticketId, body, type, attachments = [] }, { rejectWithValue }) => {
    try {
      return await createMessage(ticketId, { body, type, attachments });
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to send the reply")
      );
    }
  }
);

export const simulateInboundEmailThunk = createAsyncThunk(
  "tickets/simulateInboundEmail",
  async (payload, { rejectWithValue }) => {
    try {
      return await simulateInboundEmail(payload);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to simulate the email")
      );
    }
  }
);

const initialState = {
  list: {
    items: [],
    pagination: null,
    isLoading: false,
    error: null,
  },
  currentTicket: {
    data: null,
    isLoading: false,
    error: null,
  },
  conversations: {
    messages: [],
    activities: [],
    isLoading: false,
    error: null,
    isSendingReply: false,
    isSimulatingEmail: false,
  },
  actionStatus: {
    busyKey: "",
    error: null,
    notice: null,
  },
};

const ticketsSlice = createSlice({
  name: "tickets",
  initialState,
  reducers: {
    clearCurrentTicket: (state) => {
      state.currentTicket.data = null;
      state.conversations.messages = [];
      state.conversations.activities = [];
      state.currentTicket.error = null;
      state.conversations.error = null;
      state.actionStatus.busyKey = "";
      state.actionStatus.error = null;
      state.actionStatus.notice = null;
    },
    setActionBusy: (state, action) => {
      state.actionStatus.busyKey = action.payload;
      state.actionStatus.error = null;
      state.actionStatus.notice = null;
    },
    clearActionStatus: (state) => {
      state.actionStatus.busyKey = "";
      state.actionStatus.error = null;
      state.actionStatus.notice = null;
    },
    setActionNotice: (state, action) => {
      state.actionStatus.notice = action.payload;
    },
    setActionError: (state, action) => {
      state.actionStatus.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchTickets
      .addCase(fetchTickets.pending, (state) => {
        state.list.isLoading = true;
        state.list.error = null;
      })
      .addCase(fetchTickets.fulfilled, (state, action) => {
        state.list.isLoading = false;
        state.list.items = action.payload.items || [];
        state.list.pagination = action.payload.pagination || null;
      })
      .addCase(fetchTickets.rejected, (state, action) => {
        state.list.isLoading = false;
        state.list.error = action.payload || "Failed to load tickets";
      })

      // fetchTicketById
      .addCase(fetchTicketById.pending, (state) => {
        state.currentTicket.isLoading = true;
        state.currentTicket.error = null;
      })
      .addCase(fetchTicketById.fulfilled, (state, action) => {
        state.currentTicket.isLoading = false;
        state.currentTicket.data = action.payload;
      })
      .addCase(fetchTicketById.rejected, (state, action) => {
        state.currentTicket.isLoading = false;
        state.currentTicket.error = action.payload || "Failed to load ticket";
      })

      // fetchTicketDetails (ticket + messages + activities in parallel)
      .addCase(fetchTicketDetails.pending, (state, action) => {
        if (!action.meta.arg?.silent) {
          state.currentTicket.isLoading = true;
          state.conversations.isLoading = true;
        }
        state.currentTicket.error = null;
        state.conversations.error = null;
      })
      .addCase(fetchTicketDetails.fulfilled, (state, action) => {
        state.currentTicket.isLoading = false;
        state.conversations.isLoading = false;
        state.currentTicket.data = action.payload.ticket;
        state.conversations.messages = action.payload.messages;
        state.conversations.activities = action.payload.activities;
      })
      .addCase(fetchTicketDetails.rejected, (state, action) => {
        state.currentTicket.isLoading = false;
        state.conversations.isLoading = false;
        state.currentTicket.error = action.payload || "Failed to load ticket details";
      })

      // fetchTicketActivities
      .addCase(fetchTicketActivities.fulfilled, (state, action) => {
        state.conversations.activities = action.payload.items || [];
      })

      // createTicketThunk
      .addCase(createTicketThunk.fulfilled, (state, action) => {
        const newTicket = action.payload;
        state.currentTicket.data = newTicket;
        // Keep list synchronized if tickets list is loaded
        if (state.list.items.length > 0) {
          state.list.items = [newTicket, ...state.list.items];
        }
      })

      // updateTicketThunk
      .addCase(updateTicketThunk.fulfilled, (state, action) => {
        const updated = action.payload;
        state.currentTicket.data = updated;
        state.list.items = state.list.items.map((t) =>
          t._id === updated._id ? { ...t, ...updated } : t
        );
      })

      // updateTicketStatusThunk
      .addCase(updateTicketStatusThunk.pending, (state) => {
        state.actionStatus.error = null;
      })
      .addCase(updateTicketStatusThunk.fulfilled, (state, action) => {
        const updated = action.payload;
        if (state.currentTicket.data && state.currentTicket.data._id === updated._id) {
          state.currentTicket.data = { ...state.currentTicket.data, ...updated };
        }
        state.list.items = state.list.items.map((t) =>
          t._id === updated._id ? { ...t, ...updated } : t
        );
      })
      .addCase(updateTicketStatusThunk.rejected, (state, action) => {
        state.actionStatus.error = action.payload || "Status update failed";
      })

      // assignTicketThunk
      .addCase(assignTicketThunk.pending, (state) => {
        state.actionStatus.error = null;
      })
      .addCase(assignTicketThunk.fulfilled, (state, action) => {
        const updated = action.payload;
        if (state.currentTicket.data && state.currentTicket.data._id === updated._id) {
          state.currentTicket.data = { ...state.currentTicket.data, ...updated };
        }
        state.list.items = state.list.items.map((t) =>
          t._id === updated._id ? { ...t, ...updated } : t
        );
      })
      .addCase(assignTicketThunk.rejected, (state, action) => {
        state.actionStatus.error = action.payload || "Assignment failed";
      })

      // createMessageThunk
      .addCase(createMessageThunk.pending, (state) => {
        state.conversations.isSendingReply = true;
        state.actionStatus.error = null;
      })
      .addCase(createMessageThunk.fulfilled, (state, action) => {
        state.conversations.isSendingReply = false;
        const newMsg = action.payload;
        state.conversations.messages = [...state.conversations.messages, newMsg];
        if (state.currentTicket.data) {
          state.currentTicket.data = {
            ...state.currentTicket.data,
            updatedAt: new Date().toISOString(),
          };
        }
      })
      .addCase(createMessageThunk.rejected, (state, action) => {
        state.conversations.isSendingReply = false;
        state.actionStatus.error = action.payload || "Failed to send message";
      })

      // simulateInboundEmailThunk
      .addCase(simulateInboundEmailThunk.pending, (state) => {
        state.conversations.isSimulatingEmail = true;
        state.actionStatus.error = null;
      })
      .addCase(simulateInboundEmailThunk.fulfilled, (state) => {
        state.conversations.isSimulatingEmail = false;
      })
      .addCase(simulateInboundEmailThunk.rejected, (state, action) => {
        state.conversations.isSimulatingEmail = false;
        state.actionStatus.error = action.payload || "Failed to simulate email";
      });
  },
});

export const {
  clearCurrentTicket,
  setActionBusy,
  clearActionStatus,
  setActionNotice,
  setActionError,
} = ticketsSlice.actions;

export default ticketsSlice.reducer;

