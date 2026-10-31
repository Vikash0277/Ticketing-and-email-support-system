import { Router } from "express";
import { getCategories } from "./category.controller.js";
import { listCategoriesSchema } from "./category.validation.js";

const router = Router();

function validateCategoryQuery(req, res, next) {
  const result = listCategoriesSchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid query parameters",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  req.validatedQuery = result.data;
  next();
}

router.get("/", validateCategoryQuery, getCategories);

export default router;