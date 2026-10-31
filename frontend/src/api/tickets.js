import client, { unwrap, unwrapPage } from "./client";

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
}

export async function listTickets(params = {}) {
  const response = await client.get("/tickets", {
    params: cleanParams(params),
  });
  return unwrapPage(response);
}

export async function getTicketStats() {
  const response = await client.get("/tickets/stats");
  return unwrap(response);
}

export async function getTicket(ticketId) {
  const response = await client.get(`/tickets/${ticketId}`);
  return unwrap(response);
}

export async function createTicket({ attachments = [], ...payload }) {
  const hasFiles = attachments.length > 0;

  if (!hasFiles) {
    const response = await client.post("/tickets", payload);
    return unwrap(response);
  }

  const formData = new FormData();
  formData.append("subject", payload.subject);
  formData.append("description", payload.description);
  formData.append("categoryId", payload.categoryId);
  formData.append("priority", payload.priority ?? "medium");
  formData.append("tags", JSON.stringify(payload.tags ?? []));

  for (const file of attachments) {
    formData.append("attachments", file);
  }

  const response = await client.post("/tickets", formData);
  return unwrap(response);
}

export async function updateTicket(ticketId, payload) {
  const response = await client.patch(`/tickets/${ticketId}`, payload);
  return unwrap(response);
}

export async function updateTicketStatus(ticketId, payload) {
  const response = await client.patch(`/tickets/${ticketId}/status`, payload);
  return unwrap(response);
}

export async function resolveTicket(ticketId, payload = {}) {
  const response = await client.post(`/tickets/${ticketId}/resolve`, payload);
  return unwrap(response);
}

export async function reopenTicket(ticketId, payload = {}) {
  const response = await client.post(`/tickets/${ticketId}/reopen`, payload);
  return unwrap(response);
}

export async function closeTicket(ticketId, payload = {}) {
  const response = await client.post(`/tickets/${ticketId}/close`, payload);
  return unwrap(response);
}

export async function assignTicket(ticketId, assignedTo) {
  const response = await client.patch(`/tickets/${ticketId}/assign`, {
    assignedTo,
  });
  return unwrap(response);
}

export async function listMessages(ticketId, params = {}) {
  const response = await client.get(`/tickets/${ticketId}/messages`, {
    params: cleanParams(params),
  });
  return unwrapPage(response);
}

export async function createMessage(ticketId, { body, type, attachments = [] }) {
  const hasFiles = attachments.length > 0;

  if (!hasFiles) {
    const response = await client.post(`/tickets/${ticketId}/messages`, {
      body,
      type,
    });
    return unwrap(response);
  }

  const formData = new FormData();
  formData.append("body", body);
  formData.append("type", type ?? "public");

  for (const file of attachments) {
    formData.append("attachments", file);
  }

  const response = await client.post(
    `/tickets/${ticketId}/messages`,
    formData
  );
  return unwrap(response);
}

export async function listActivities(ticketId, params = {}) {
  const response = await client.get(`/tickets/${ticketId}/activities`, {
    params: cleanParams(params),
  });
  return unwrapPage(response);
}

export async function simulateInboundEmail(payload) {
  const response = await client.post("/email/inbound/simulate", payload);
  return unwrap(response);
}
