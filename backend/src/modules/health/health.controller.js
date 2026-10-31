import {
  getLiveness,
  getReadiness,
} from "./health.service.js";

export function liveness(req, res) {
  return res.status(200).json({
    success: true,
    data: getLiveness(),
  });
}

export function readiness(req, res) {
  const health = getReadiness();

  return res.status(
    health.status === "ok" ? 200 : 503
  ).json({
    success: health.status === "ok",
    data: health,
  });
}