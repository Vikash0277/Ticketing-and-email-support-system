import asyncHandler from "../../utils/asyncHandler.js";
import { sendSuccess } from "../../utils/response.js";
import * as dashboardService from "./dashboard.service.js";

export const getSummary = asyncHandler(async (req, res) => {
  const summary = await dashboardService.getDashboardSummary(req.user);

  return sendSuccess(
    res,
    200,
    "Dashboard summary fetched successfully",
    summary
  );
});
