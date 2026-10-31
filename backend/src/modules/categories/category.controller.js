import asyncHandler from "../../utils/asyncHandler.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import * as categoryService from "./category.service.js";

export const getCategories = asyncHandler(async (req, res) => {
  const result = await categoryService.listCategories(
    req.validatedQuery,
    req.user
  );

  return sendPaginated(
    res,
    "Categories fetched successfully",
    result.categories,
    result.pagination
  );
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategory(req.validatedParams.id);

  return sendSuccess(res, 200, "Category fetched successfully", category);
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(
    req.validatedBody,
    req.user
  );

  return sendSuccess(res, 201, "Category created successfully", category);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(
    req.validatedParams.id,
    req.validatedBody
  );

  return sendSuccess(res, 200, "Category updated successfully", category);
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.deleteCategory(req.validatedParams.id);

  return sendSuccess(res, 200, "Category deactivated successfully", category);
});
