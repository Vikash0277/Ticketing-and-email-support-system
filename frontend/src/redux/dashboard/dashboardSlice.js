import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getDashboardSummary } from "../../api/resources";
import { getErrorMessage } from "../../api/client";

export const fetchDashboardSummary = createAsyncThunk(
  "dashboard/fetchSummary",
  async (_, { rejectWithValue }) => {
    try {
      return await getDashboardSummary();
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to load dashboard summary")
      );
    }
  }
);

const initialState = {
  data: null,
  isLoading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    invalidateDashboard: (state) => {
      // Invalidate if needed so next load fetches fresh data
      state.data = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardSummary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboardSummary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.data = action.payload;
      })
      .addCase(fetchDashboardSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to load dashboard data";
      });
  },
});

export const { invalidateDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;

