import * as dashboardService from "./dashboard.service.js";

export async function getSummary(req, res, next) {
  try {
    const summary = await dashboardService.getDashboardSummary(
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Dashboard summary fetched successfully",
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}