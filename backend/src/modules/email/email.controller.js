import * as emailService from "./email.service.js";

export async function inboundEmail(req, res, next) {
  try {
    // Map the provider's actual payload to this normalized format
    // in a provider-specific adapter before calling the service.
    const result = await emailService.processInboundEmail(req.body);

    return res.status(200).json({
      success: true,
      message: result.ignored
        ? "Inbound email ignored"
        : result.duplicate
          ? "Duplicate email event acknowledged"
          : "Inbound email processed",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function outboundEmail(req, res, next) {
  try {
    const result = await emailService.sendOutboundEmail({
      ...req.validatedBody,
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
      data: {
        eventId: result.event._id,
        messageId: result.message._id,
        status: result.event.status,
      },
    });
  } catch (error) {
    next(error);
  }
}