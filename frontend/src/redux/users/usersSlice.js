import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  createUser,
  getUserStats,
  listAgents,
  listUsers,
  updateUser,
  updateUserStatus,
} from "../../api/resources";
import { getErrorMessage } from "../../api/client";

export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async (params = {}, { rejectWithValue }) => {
    try {
      return await listUsers(params);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to load users")
      );
    }
  }
);

export const fetchUserStats = createAsyncThunk(
  "users/fetchUserStats",
  async (_, { rejectWithValue }) => {
    try {
      return await getUserStats();
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to load user statistics")
      );
    }
  }
);

export const fetchAgents = createAsyncThunk(
  "users/fetchAgents",
  async (force = false, { getState, rejectWithValue }) => {
    const existing = getState().users.agents;
    if (!force && existing && existing.length > 0) {
      return existing;
    }
    try {
      const result = await listAgents();
      return Array.isArray(result) ? result : result?.items ?? [];
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to load agents")
      );
    }
  }
);

export const fetchRequesters = createAsyncThunk(
  "users/fetchRequesters",
  async (force = false, { getState, rejectWithValue }) => {
    const existing = getState().users.requesters;
    if (!force && existing && existing.length > 0) {
      return existing;
    }
    try {
      const result = await listUsers({ role: "customer", limit: 100 });
      return result.items || [];
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to load customer requesters")
      );
    }
  }
);

export const createUserThunk = createAsyncThunk(
  "users/createUser",
  async (payload, { rejectWithValue }) => {
    try {
      return await createUser(payload);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to create user")
      );
    }
  }
);

export const updateUserThunk = createAsyncThunk(
  "users/updateUser",
  async ({ userId, payload }, { rejectWithValue }) => {
    try {
      return await updateUser(userId, payload);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to update user")
      );
    }
  }
);

export const updateUserStatusThunk = createAsyncThunk(
  "users/updateUserStatus",
  async ({ userId, isActive }, { rejectWithValue }) => {
    try {
      return await updateUserStatus(userId, isActive);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to update user status")
      );
    }
  }
);

const initialState = {
  items: [],
  pagination: null,
  stats: null,
  agents: [],
  requesters: [],
  isLoading: false,
  isStatsLoading: false,
  isAgentsLoading: false,
  isRequestersLoading: false,
  isSaving: false,
  error: null,
};

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearUserError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchUsers
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items || [];
        state.pagination = action.payload.pagination || null;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to load users";
      })

      // fetchUserStats
      .addCase(fetchUserStats.pending, (state) => {
        state.isStatsLoading = true;
      })
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        state.isStatsLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchUserStats.rejected, (state) => {
        state.isStatsLoading = false;
      })

      // fetchAgents
      .addCase(fetchAgents.pending, (state) => {
        state.isAgentsLoading = true;
      })
      .addCase(fetchAgents.fulfilled, (state, action) => {
        state.isAgentsLoading = false;
        state.agents = action.payload;
      })
      .addCase(fetchAgents.rejected, (state) => {
        state.isAgentsLoading = false;
      })

      // fetchRequesters
      .addCase(fetchRequesters.pending, (state) => {
        state.isRequestersLoading = true;
      })
      .addCase(fetchRequesters.fulfilled, (state, action) => {
        state.isRequestersLoading = false;
        state.requesters = action.payload;
      })
      .addCase(fetchRequesters.rejected, (state) => {
        state.isRequestersLoading = false;
      })

      // createUserThunk
      .addCase(createUserThunk.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(createUserThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        const newUser = action.payload;
        state.items = [newUser, ...state.items];
        if (newUser.role === "agent") {
          state.agents = [newUser, ...state.agents];
        } else if (newUser.role === "customer") {
          state.requesters = [newUser, ...state.requesters];
        }
      })
      .addCase(createUserThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload || "Failed to create user";
      })

      // updateUserThunk
      .addCase(updateUserThunk.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateUserThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        const updated = action.payload;
        state.items = state.items.map((u) =>
          u._id === updated._id ? updated : u
        );
        state.agents = state.agents.map((u) =>
          u._id === updated._id ? updated : u
        );
        state.requesters = state.requesters.map((u) =>
          u._id === updated._id ? updated : u
        );
      })
      .addCase(updateUserThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload || "Failed to update user";
      })

      // updateUserStatusThunk
      .addCase(updateUserStatusThunk.fulfilled, (state, action) => {
        const updated = action.payload;
        state.items = state.items.map((u) =>
          u._id === updated._id ? updated : u
        );
        state.agents = state.agents.map((u) =>
          u._id === updated._id ? updated : u
        );
      });
  },
});

export const { clearUserError } = usersSlice.actions;
export default usersSlice.reducer;

