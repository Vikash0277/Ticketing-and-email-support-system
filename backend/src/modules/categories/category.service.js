import mongoose from "mongoose";

import ApiError from "../../utils/ApiError.js";
import { buildPagination } from "../../utils/pagination.js";
import { escapeRegex } from "../../utils/sanitize.js";
import Category from "./category.model.js";
import Ticket from "../tickets/ticket.model.js";

function isStaff(user) {
  return ["agent", "admin"].includes(user?.role);
}

export async function listCategories(query, user) {
  const { search, page, limit, includeInactive } = query;

  const filter = {};

  if (!(includeInactive && isStaff(user))) {
    filter.isActive = true;
  }

  if (search) {
    filter.name = { $regex: escapeRegex(search), $options: "i" };
  }

  const skip = (page - 1) * limit;

  const [categories, total] = await Promise.all([
    Category.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Category.countDocuments(filter),
  ]);

  return {
    categories,
    pagination: buildPagination(page, limit, total),
  };
}

export async function getCategory(categoryId) {
  if (!mongoose.isValidObjectId(categoryId)) {
    throw ApiError.badRequest("Invalid category ID");
  }

  const category = await Category.findById(categoryId);

  if (!category) throw ApiError.notFound("Category not found");

  return category;
}

export async function createCategory(data, user) {
  const existing = await Category.findOne({
    name: { $regex: `^${escapeRegex(data.name)}$`, $options: "i" },
  });

  if (existing) {
    if (existing.isActive) {
      throw ApiError.conflict("A category with this name already exists");
    }

    existing.isActive = true;
    existing.description = data.description ?? existing.description;
    await existing.save();

    return existing;
  }

  return Category.create({
    name: data.name,
    description: data.description ?? "",
    createdBy: user?._id ?? user?.id ?? null,
  });
}

export async function updateCategory(categoryId, data) {
  const category = await getCategory(categoryId);

  if (data.name !== undefined) {
    const duplicate = await Category.findOne({
      _id: { $ne: category._id },
      name: { $regex: `^${escapeRegex(data.name)}$`, $options: "i" },
    });

    if (duplicate) {
      throw ApiError.conflict("A category with this name already exists");
    }

    category.name = data.name;
  }

  if (data.description !== undefined) {
    category.description = data.description;
  }

  if (data.isActive !== undefined) {
    category.isActive = data.isActive;
  }

  await category.save();

  return category;
}

export async function deleteCategory(categoryId) {
  const category = await getCategory(categoryId);

  const activeTickets = await Ticket.countDocuments({
    categoryId: category._id,
    status: { $nin: ["resolved", "closed"] },
  });

  if (activeTickets > 0) {
    throw ApiError.conflict(
      "This category is used by open tickets. Resolve them or deactivate the category instead."
    );
  }

  category.isActive = false;
  await category.save();

  return category;
}

export default {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
