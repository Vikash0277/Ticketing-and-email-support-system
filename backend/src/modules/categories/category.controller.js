import * as categoryService from "./category.service.js";

export async function getCategories(req, res, next) {
  try {
    const result = await categoryService.listCategories(
      req.validatedQuery
    );

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: result.categories,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}