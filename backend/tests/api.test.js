import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { extractReplyToken } from "../src/modules/email/email-token.js";

let app;

const PASSWORD = "Password123!";
const tokens = {};
let categoryId;
let ticketId;
let attachmentPath;

async function login(email, password = PASSWORD) {
  const response = await request(app)
    .post("/api/v1/auth/login-password")
    .send({ email, password });

  expect(response.status).toBe(200);
  expect(response.body.data.accessToken).toBeTruthy();

  return response.body.data;
}

function authed(method, path, token) {
  return request(app)[method](path).set(
    "Authorization",
    `Bearer ${token}`
  );
}

beforeAll(async () => {
  ({ default: app } = await import("../src/app.js"));

  tokens.admin = await login("admin@bitmax.test");
  tokens.agent = await login("agent@bitmax.test");
  tokens.customer = await login("customer@bitmax.test");
});

describe("Health", () => {
  it("reports liveness", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("reports readiness when MongoDB is connected", async () => {
    const response = await request(app).get("/api/v1/health/ready");

    expect(response.status).toBe(200);
  });

  it("exposes the unversioned /api alias", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
  });
});

describe("Authentication", () => {
  it("rejects a wrong password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login-password")
      .send({ email: "customer@bitmax.test", password: "WrongPassword1!" });

    expect(response.status).toBe(401);
  });

  it("returns the current profile", async () => {
    const response = await authed("get", "/api/v1/auth/me", tokens.customer.accessToken);

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe("customer@bitmax.test");
  });

  it("updates the current profile", async () => {
    const response = await authed("patch", "/api/v1/auth/me", tokens.customer.accessToken)
      .send({ jobTitle: "QA Engineer" });

    expect(response.status).toBe(200);
    expect(response.body.data.jobTitle).toBe("QA Engineer");
  });

  it("validates profile updates", async () => {
    const response = await authed("patch", "/api/v1/auth/me", tokens.customer.accessToken)
      .send({ avatarUrl: "not-a-url" });

    expect(response.status).toBe(400);
  });

  it("rotates refresh tokens and rejects reuse", async () => {
    const session = await login("customer@bitmax.test");

    const refreshed = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: session.refreshToken });

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTruthy();
    expect(refreshed.body.data.refreshToken).not.toBe(session.refreshToken);

    const reused = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: session.refreshToken });

    expect(reused.status).toBe(401);
  });

  it("revokes a refresh token on logout", async () => {
    const session = await login("agent@bitmax.test");

    const logout = await request(app)
      .post("/api/v1/auth/logout")
      .send({ refreshToken: session.refreshToken });

    expect(logout.status).toBe(200);

    const refreshed = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: session.refreshToken });

    expect(refreshed.status).toBe(401);
  });

  it("rejects an invalid login OTP", async () => {
    const response = await request(app)
      .post("/api/v1/auth/verify-login-otp")
      .send({ email: "customer@bitmax.test", otp: "000000" });

    expect(response.status).toBe(400);
  });

  it("requires authentication for protected routes", async () => {
    const response = await request(app).get("/api/v1/tickets");

    expect(response.status).toBe(401);
  });
});

describe("Categories", () => {
  it("lets a customer list active categories", async () => {
    const response = await authed("get", "/api/v1/categories", tokens.customer.accessToken);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(3);

    categoryId = response.body.data[0]._id;
  });

  it("blocks customers from creating categories", async () => {
    const response = await authed("post", "/api/v1/categories", tokens.customer.accessToken)
      .send({ name: "Customer category" });

    expect(response.status).toBe(403);
  });

  it("supports the admin category lifecycle", async () => {
    const created = await authed("post", "/api/v1/categories", tokens.admin.accessToken)
      .send({ name: "Temporary category", description: "Created by tests" });

    expect(created.status).toBe(201);
    const id = created.body.data._id;

    const updated = await authed("patch", `/api/v1/categories/${id}`, tokens.admin.accessToken)
      .send({ description: "Updated by tests", isActive: false });

    expect(updated.status).toBe(200);
    expect(updated.body.data.isActive).toBe(false);

    const removed = await authed("delete", `/api/v1/categories/${id}`, tokens.admin.accessToken);
    expect(removed.status).toBe(200);
  });
});

describe("User administration", () => {
  const email = "managed.user@bitmax.test";
  let userId;

  it("lets an admin create a user", async () => {
    const response = await authed("post", "/api/v1/users", tokens.admin.accessToken).send({
      name: "Managed User",
      email,
      password: PASSWORD,
      role: "customer",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.email).toBe(email);

    userId = response.body.data._id;
  });

  it("rejects duplicate emails", async () => {
    const response = await authed("post", "/api/v1/users", tokens.admin.accessToken).send({
      name: "Managed User",
      email,
      password: PASSWORD,
    });

    expect(response.status).toBe(409);
  });

  it("searches users", async () => {
    const response = await authed(
      "get",
      `/api/v1/users?search=${encodeURIComponent("managed.user")}`,
      tokens.admin.accessToken
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it("blocks agents from creating users", async () => {
    const response = await authed("post", "/api/v1/users", tokens.agent.accessToken).send({
      name: "Nope",
      email: "nope@bitmax.test",
      password: PASSWORD,
    });

    expect(response.status).toBe(403);
  });

  it("updates a role and status", async () => {
    const role = await authed("patch", `/api/v1/users/${userId}/role`, tokens.admin.accessToken)
      .send({ role: "agent" });

    expect(role.status).toBe(200);
    expect(role.body.data.role).toBe("agent");

    const status = await authed("patch", `/api/v1/users/${userId}/status`, tokens.admin.accessToken)
      .send({ isActive: false });

    expect(status.status).toBe(200);
    expect(status.body.data.isActive).toBe(false);
  });

  it("returns admin user statistics", async () => {
    const response = await authed("get", "/api/v1/users/stats", tokens.admin.accessToken);

    expect(response.status).toBe(200);
    expect(response.body.data.total).toBeGreaterThanOrEqual(3);
  });
});

describe("Ticket lifecycle", () => {
  it("creates a ticket with a sequential number", async () => {
    const response = await authed("post", "/api/v1/tickets", tokens.customer.accessToken).send({
      subject: "Cannot sign in",
      description: "I receive an error after entering my password.",
      categoryId,
      priority: "high",
      tags: ["login"],
    });

    expect(response.status).toBe(201);
    expect(response.body.data.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);

    ticketId = response.body.data._id;
  });

  it("filters the ticket list", async () => {
    const response = await authed(
      "get",
      "/api/v1/tickets?search=Cannot%20sign%20in&status=open&priority=high",
      tokens.customer.accessToken
    );

    expect(response.status).toBe(200);
    expect(response.body.data.some((ticket) => ticket._id === ticketId)).toBe(true);
  });

  it("blocks another customer from reading the ticket", async () => {
    const other = await authed("post", "/api/v1/users", tokens.admin.accessToken).send({
      name: "Other Customer",
      email: "other.customer@bitmax.test",
      password: PASSWORD,
      role: "customer",
    });

    expect(other.status).toBe(201);

    const otherSession = await login("other.customer@bitmax.test");
    const response = await authed("get", `/api/v1/tickets/${ticketId}`, otherSession.accessToken);

    expect(response.status).toBe(403);
  });

  it("assigns the ticket to an agent", async () => {
    const response = await authed(
      "patch",
      `/api/v1/tickets/${ticketId}/assign`,
      tokens.agent.accessToken
    ).send({ assignedTo: tokens.agent.user.id });

    expect(response.status).toBe(200);
    expect(response.body.data.assignedTo).toBeTruthy();
  });

  it("adds a public agent reply", async () => {
    const response = await authed(
      "post",
      `/api/v1/tickets/${ticketId}/messages`,
      tokens.agent.accessToken
    ).send({ body: "We are investigating this now.", type: "public" });

    expect(response.status).toBe(201);
  });

  it("hides internal notes from customers", async () => {
    const note = await authed(
      "post",
      `/api/v1/tickets/${ticketId}/messages`,
      tokens.agent.accessToken
    ).send({ body: "Internal: check the auth logs.", type: "internal" });

    expect(note.status).toBe(201);

    const messages = await authed(
      "get",
      `/api/v1/tickets/${ticketId}/messages`,
      tokens.customer.accessToken
    );

    expect(messages.status).toBe(200);
    expect(messages.body.data.some((message) => message.type === "internal")).toBe(false);
  });

  it("blocks customers from changing priority", async () => {
    const response = await authed("patch", `/api/v1/tickets/${ticketId}`, tokens.customer.accessToken)
      .send({ priority: "urgent" });

    expect(response.status).toBe(403);
  });

  it("lets an agent change priority", async () => {
    const response = await authed("patch", `/api/v1/tickets/${ticketId}`, tokens.agent.accessToken)
      .send({ priority: "urgent" });

    expect(response.status).toBe(200);
    expect(response.body.data.priority).toBe("urgent");
  });

  it("runs resolve, close and reopen", async () => {
    const resolved = await authed(
      "post",
      `/api/v1/tickets/${ticketId}/resolve`,
      tokens.agent.accessToken
    ).send({ note: "Password reset completed." });

    expect(resolved.status).toBe(200);
    expect(resolved.body.data.status).toBe("resolved");

    const closed = await authed(
      "post",
      `/api/v1/tickets/${ticketId}/close`,
      tokens.agent.accessToken
    ).send({ note: "Closing after confirmation." });

    expect(closed.status).toBe(200);
    expect(closed.body.data.status).toBe("closed");

    const reopened = await authed(
      "post",
      `/api/v1/tickets/${ticketId}/reopen`,
      tokens.customer.accessToken
    ).send({ note: "The issue returned." });

    expect(reopened.status).toBe(200);
    expect(reopened.body.data.status).toBe("reopened");
  });

  it("lets a customer close their own ticket", async () => {
    const response = await authed(
      "post",
      `/api/v1/tickets/${ticketId}/close`,
      tokens.customer.accessToken
    ).send({ note: "Closing because the issue is resolved." });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("closed");
  });

  it("blocks customers from resolving tickets", async () => {
    const response = await authed(
      "post",
      `/api/v1/tickets/${ticketId}/resolve`,
      tokens.customer.accessToken
    ).send({});

    expect(response.status).toBe(403);
  });

  it("records the activity timeline", async () => {
    const response = await authed(
      "get",
      `/api/v1/tickets/${ticketId}/activities`,
      tokens.customer.accessToken
    );

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(6);
  });

  it("returns ticket statistics", async () => {
    const response = await authed("get", "/api/v1/tickets/stats", tokens.agent.accessToken);

    expect(response.status).toBe(200);
    expect(response.body.data).toBeTypeOf("object");
  });

  it("rejects invalid ticket ids", async () => {
    const response = await authed("get", "/api/v1/tickets/not-an-id", tokens.agent.accessToken);

    expect(response.status).toBe(400);
  });
});

describe("Attachments", () => {
  it("creates a ticket with an attachment", async () => {
    const response = await authed("post", "/api/v1/tickets", tokens.customer.accessToken)
      .field("subject", "Attachment test")
      .field("description", "A ticket with a text attachment.")
      .field("categoryId", categoryId)
      .field("priority", "medium")
      .attach("attachments", Buffer.from("attachment body"), {
        filename: "note.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(201);

    const messages = await authed(
      "get",
      `/api/v1/tickets/${response.body.data._id}/messages`,
      tokens.customer.accessToken
    );

    const attachment = messages.body.data[0].attachments[0];
    expect(attachment.url).toMatch(/\/attachments\/local\//);

    attachmentPath = attachment.url;
  });

  it("downloads the attachment with authentication", async () => {
    const response = await authed("get", attachmentPath, tokens.customer.accessToken);

    expect(response.status).toBe(200);
    expect(response.text).toContain("attachment body");
  });

  it("requires authentication to download attachments", async () => {
    const response = await request(app).get(attachmentPath);

    expect(response.status).toBe(401);
  });
});

describe("Notifications", () => {
  it("lists notifications for the customer", async () => {
    const response = await authed("get", "/api/v1/notifications", tokens.customer.accessToken);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("returns the unread count and marks everything read", async () => {
    const before = await authed(
      "get",
      "/api/v1/notifications/unread-count",
      tokens.customer.accessToken
    );

    expect(before.status).toBe(200);
    expect(before.body.data.unreadCount).toBeGreaterThanOrEqual(0);

    const markAll = await authed(
      "post",
      "/api/v1/notifications/read-all",
      tokens.customer.accessToken
    );

    expect(markAll.status).toBe(200);

    const after = await authed(
      "get",
      "/api/v1/notifications/unread-count",
      tokens.customer.accessToken
    );

    expect(after.body.data.unreadCount).toBe(0);
  });
});

describe("Dashboard", () => {
  it("scopes the customer dashboard", async () => {
    const response = await authed("get", "/api/v1/dashboard/summary", tokens.customer.accessToken);

    expect(response.status).toBe(200);
    expect(response.body.data.summary.total).toBeGreaterThanOrEqual(1);
  });

  it("includes user totals for admins", async () => {
    const response = await authed("get", "/api/v1/dashboard/summary", tokens.admin.accessToken);

    expect(response.status).toBe(200);
    expect(response.body.data.users.totalUsers).toBeGreaterThanOrEqual(3);
  });
});

describe("Email threading", () => {
  it("extracts reply tokens from provider-compatible addresses", () => {
    const token = "a".repeat(64);

    expect(extractReplyToken([`reply-${token}@viegoxo.resend.app`])).toBe(token);
    expect(extractReplyToken([`reply+${token}@viegoxo.resend.app`])).toBe(token);
  });

  it("processes a simulated inbound reply", async () => {
    const response = await authed(
      "post",
      "/api/v1/email/inbound/simulate",
      tokens.agent.accessToken
    ).send({
      ticketId,
      from: "customer@bitmax.test",
      subject: "Re: Cannot sign in",
      text: "The problem is back after the reset.",
      messageId: "<test-inbound@bitmax.test>",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.processed).toBe(true);
  });

  it("records email events", async () => {
    const response = await authed(
      "get",
      `/api/v1/email/events?ticketId=${ticketId}`,
      tokens.admin.accessToken
    );

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("blocks customers from the email simulator", async () => {
    const response = await authed(
      "post",
      "/api/v1/email/inbound/simulate",
      tokens.customer.accessToken
    ).send({ ticketId, text: "Nope" });

    expect(response.status).toBe(403);
  });
});

describe("Errors", () => {
  it("returns 404 for unknown routes", async () => {
    const response = await request(app).get("/api/v1/does-not-exist");

    expect(response.status).toBe(404);
  });

  it("returns validation details for bad payloads", async () => {
    const response = await authed("post", "/api/v1/tickets", tokens.customer.accessToken).send({
      subject: "x",
    });

    expect(response.status).toBe(400);
    expect(Array.isArray(response.body.errors)).toBe(true);
  });
});
