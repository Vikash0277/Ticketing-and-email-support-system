import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "../../api/resources";
import { getErrorMessage } from "../../api/client";

export const fetchCategories = createAsyncThunk(
  "categories/fetchCategories",
  async (params = {}, { rejectWithValue }) => {
    try {
      return await listCategories(params);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to load categories")
      );
    }
  }
);

export const fetchCategoryOptions = createAsyncThunk(
  "categories/fetchCategoryOptions",
  async (force = false, { getState, rejectWithValue }) => {
    const existing = getState().categories.options;
    if (!force && existing && existing.length > 0) {
      return existing;
    }
    try {
      const result = await listCategories({ limit: 100 });
      return result.items || [];
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to load category options")
      );
    }
  }
);

export const createCategoryThunk = createAsyncThunk(
  "categories/createCategory",
  async (payload, { rejectWithValue }) => {
    try {
      return await createCategory(payload);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to create category")
      );
    }
  }
);

export const updateCategoryThunk = createAsyncThunk(
  "categories/updateCategory",
  async ({ categoryId, payload }, { rejectWithValue }) => {
    try {
      return await updateCategory(categoryId, payload);
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to update category")
      );
    }
  }
);

export const deleteCategoryThunk = createAsyncThunk(
  "categories/deleteCategory",
  async (categoryId, { rejectWithValue }) => {
    try {
      await deleteCategory(categoryId);
      return categoryId;
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Unable to delete category")
      );
    }
  }
);

const initialState = {
  items: [],
  pagination: null,
  options: [],
  isLoading: false,
  isOptionsLoading: false,
  isSaving: false,
  error: null,
  optionsError: null,
};

const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    clearCategoryError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchCategories
      .addCase(fetchCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items || [];
        state.pagination = action.payload.pagination || null;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to load categories";
      })

      // fetchCategoryOptions
      .addCase(fetchCategoryOptions.pending, (state) => {
        state.isOptionsLoading = true;
        state.optionsError = null;
      })
      .addCase(fetchCategoryOptions.fulfilled, (state, action) => {
        state.isOptionsLoading = false;
        state.options = action.payload;
      })
      .addCase(fetchCategoryOptions.rejected, (state, action) => {
        state.isOptionsLoading = false;
        state.optionsError = action.payload || "Failed to load category options";
      })

      // createCategoryThunk
      .addCase(createCategoryThunk.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(createCategoryThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        const newCat = action.payload;
        state.items = [newCat, ...state.items];
        state.options = [newCat, ...state.options];
      })
      .addCase(createCategoryThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload || "Failed to create category";
      })

      // updateCategoryThunk
      .addCase(updateCategoryThunk.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateCategoryThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        const updated = action.payload;
        state.items = state.items.map((item) =>
          item._id === updated._id ? updated : item
        );
        state.options = state.options.map((item) =>
          item._id === updated._id ? updated : item
        );
      })
      .addCase(updateCategoryThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload || "Failed to update category";
      })

      // deleteCategoryThunk
      .addCase(deleteCategoryThunk.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(deleteCategoryThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        const id = action.payload;
        state.items = state.items.filter((item) => item._id !== id);
        state.options = state.options.filter((item) => item._id !== id);
      })
      .addCase(deleteCategoryThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload || "Failed to delete category";
      });
  },
});

export const { clearCategoryError } = categoriesSlice.actions;
export default categoriesSlice.reducer;

