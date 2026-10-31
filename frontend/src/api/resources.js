import client, { unwrap, unwrapPage } from "./client";

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
}

export async function getDashboardSummary() {
  const response = await client.get("/dashboard/summary");
  return unwrap(response);
}

export async function listCategories(params = {}) {
  const response = await client.get("/categories", {
    params: cleanParams(params),
  });
  return unwrapPage(response);
}

export async function createCategory(payload) {
  const response = await client.post("/categories", payload);
  return unwrap(response);
}

export async function updateCategory(categoryId, payload) {
  const response = await client.patch(`/categories/${categoryId}`, payload);
  return unwrap(response);
}

export async function deleteCategory(categoryId) {
  const response = await client.delete(`/categories/${categoryId}`);
  return unwrap(response);
}

export async function listUsers(params = {}) {
  const response = await client.get("/users", {
    params: cleanParams(params),
  });
  return unwrapPage(response);
}

export async function listAgents() {
  const response = await client.get("/users/agents");
  return unwrap(response);
}

export async function getUserStats() {
  const response = await client.get("/users/stats");
  return unwrap(response);
}

export async function createUser(payload) {
  const response = await client.post("/users", payload);
  return unwrap(response);
}

export async function updateUser(userId, payload) {
  const response = await client.patch(`/users/${userId}`, payload);
  return unwrap(response);
}

export async function updateUserStatus(userId, isActive) {
  const response = await client.patch(`/users/${userId}/status`, { isActive });
  return unwrap(response);
}

export async function updateUserRole(userId, role) {
  const response = await client.patch(`/users/${userId}/role`, { role });
  return unwrap(response);
}

export async function deleteUser(userId) {
  const response = await client.delete(`/users/${userId}`);
  return unwrap(response);
}

export async function listNotifications(params = {}) {
  const response = await client.get("/notifications", {
    params: cleanParams(params),
  });
  return unwrapPage(response);
}

export async function getUnreadCount() {
  const response = await client.get("/notifications/unread-count");
  return unwrap(response);
}

export async function markNotificationRead(notificationId) {
  const response = await client.post(`/notifications/${notificationId}/read`);
  return unwrap(response);
}

export async function markAllNotificationsRead() {
  const response = await client.post("/notifications/read-all");
  return unwrap(response);
}
