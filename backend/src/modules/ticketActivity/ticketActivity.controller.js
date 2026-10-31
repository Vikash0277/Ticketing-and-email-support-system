import * as ticketActivityService from "./ticketActivity.service.js";

import {
  ticketActivityParamsSchema,
  activityIdParamsSchema,
  listTicketActivitiesSchema,
} from "./ticketActivity.validation.js";

export async function listTicketActivities(req, res, next) {
  try {
    const { ticketId } = ticketActivityParamsSchema.parse(req.params);
    const query = listTicketActivitiesSchema.parse(req.query);

    const result = await ticketActivityService.listTicketActivities(
      ticketId,
      query,
      req.user
    );

    return res.status(200).json({
      success: true,
      data: result.activities,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTicketActivity(req, res, next) {
  try {
    const { ticketId, activityId } =
      activityIdParamsSchema.parse(req.params);

    const activity = await ticketActivityService.getTicketActivity(
      ticketId,
      activityId,
      req.user
    );

    return res.status(200).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    next(error);
  }
}