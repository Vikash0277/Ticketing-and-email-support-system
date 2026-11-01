import "dotenv/config";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import dbConnection from "../database/mongoDB.js";
import User from "../modules/user/user.model.js";
import Category from "../modules/categories/category.model.js";
import Ticket from "../modules/tickets/ticket.model.js";
import TicketMessage from "../modules/ticketMessage/ticketMessage.model.js";
import TicketActivity from "../modules/ticketActivity/ticketActivity.model.js";
import Session from "../modules/session/session.model.js";
import Notification from "../modules/notification/notification.model.js";
import EmailEvent from "../modules/email/emailEvent.model.js";
import Counter from "../modules/tickets/counter.model.js";

const PASSWORD = "Password123!";
const RESET = process.argv.includes("--reset");

const ACCOUNTS = [
  {
    name: "Aarav Admin",
    email: "admin@bitmax.test",
    role: "admin",
    jobTitle: "Support Manager",
  },
  {
    name: "Nisha Agent",
    email: "agent@bitmax.test",
    role: "agent",
    jobTitle: "Support Engineer",
  },
  {
    name: "Rohan Customer",
    email: "customer@bitmax.test",
    role: "customer",
    jobTitle: null,
  },
];

const CATEGORIES = [
  { name: "Billing", description: "Invoices, payments and refunds" },
  { name: "Technical", description: "Bugs, outages and product errors" },
  { name: "Account", description: "Login, profile and security issues" },
  { name: "Feature Request", description: "Ideas and product improvements" },
  { name: "General", description: "Anything else" },
];

async function resetDatabase() {
  await Promise.all([
    Ticket.deleteMany({}),
    TicketMessage.deleteMany({}),
    TicketActivity.deleteMany({}),
    Session.deleteMany({}),
    Notification.deleteMany({}),
    EmailEvent.deleteMany({}),
    Counter.deleteMany({}),
    Category.deleteMany({}),
    User.deleteMany({}),
  ]);
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const users = {};

  for (const account of ACCOUNTS) {
    const user = await User.findOneAndUpdate(
      { email: account.email },
      {
        $set: {
          name: account.name,
          email: account.email,
          role: account.role,
          jobTitle: account.jobTitle,
          passwordHash,
          isEmailVerified: true,
          isActive: true,
          failedLoginAttempts: 0,
        },
        $unset: { lockedUntil: "" },
      },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );

    users[account.role] = user;
  }

  return users;
}

async function seedCategories(admin) {
  const categories = {};

  for (const category of CATEGORIES) {
    const doc = await Category.findOneAndUpdate(
      { name: category.name },
      {
        $set: {
          name: category.name,
          description: category.description,
          isActive: true,
          createdBy: admin._id,
        },
      },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );

    categories[category.name] = doc;
  }

  return categories;
}

async function seedTickets({ customer, agent, admin, categories }) {
  const existing = await Ticket.countDocuments({ requesterId: customer._id });

  if (existing > 0) {
    return { created: 0, skipped: true };
  }

  const now = Date.now();
  const samples = [
    {
      subject: "Invoice charged twice for October",
      description:
        "My card was charged twice for the October subscription. Please refund the duplicate payment.",
      category: "Billing",
      priority: "high",
      status: "open",
      assignedTo: null,
      tags: ["billing", "refund"],
    },
    {
      subject: "Cannot upload a profile picture",
      description:
        "Every time I upload a PNG the page reloads and the image is not saved. I have tried Chrome and Firefox.",
      category: "Technical",
      priority: "medium",
      status: "in_progress",
      assignedTo: agent._id,
      tags: ["upload", "profile"],
    },
    {
      subject: "Enable dark mode in the dashboard",
      description:
        "It would be great to have a dark theme. My eyes hurt during night shifts.",
      category: "Feature Request",
      priority: "low",
      status: "resolved",
      assignedTo: admin._id,
      tags: ["ui", "dark-mode"],
      resolvedAt: new Date(now - 24 * 60 * 60 * 1000),
    },
  ];

  for (const sample of samples) {
    const ticket = await Ticket.create({
      subject: sample.subject,
      description: sample.description,
      categoryId: categories[sample.category]._id,
      priority: sample.priority,
      status: sample.status,
      tags: sample.tags,
      requesterId: customer._id,
      requesterName: customer.name,
      requesterEmail: customer.email,
      assignedTo: sample.assignedTo,
      assignedAt: sample.assignedTo ? new Date(now - 12 * 60 * 60 * 1000) : null,
      resolvedAt: sample.resolvedAt ?? null,
      lastMessageAt: new Date(now - 6 * 60 * 60 * 1000),
      lastReplyBy: "customer",
    });

    await TicketMessage.create({
      ticketId: ticket._id,
      senderId: customer._id,
      senderName: customer.name,
      senderEmail: customer.email,
      senderRole: "customer",
      type: "public",
      body: sample.description,
      source: "web",
    });

    await TicketActivity.create({
      ticketId: ticket._id,
      actorId: customer._id,
      action: "created",
      newValue: {
        status: "open",
        priority: sample.priority,
        categoryId: ticket.categoryId,
      },
    });

    if (sample.assignedTo) {
      await TicketActivity.create({
        ticketId: ticket._id,
        actorId: admin._id,
        action: "assigned",
        oldValue: null,
        newValue: String(sample.assignedTo),
      });
    }

    if (sample.status === "resolved") {
      await TicketActivity.create({
        ticketId: ticket._id,
        actorId: admin._id,
        action: "resolved",
        oldValue: "open",
        newValue: "resolved",
      });
    }
  }

  return { created: samples.length, skipped: false };
}

async function main() {
  await dbConnection();

  if (RESET) {
    console.log("Resetting database collections...");
    await resetDatabase();
  }

  const users = await seedUsers();
  const categories = await seedCategories(users.admin);
  const tickets = await seedTickets({
    customer: users.customer,
    agent: users.agent,
    admin: users.admin,
    categories,
  });

  console.log("\nSeed complete.\n");
  console.log("Accounts (password: %s)", PASSWORD);
  console.table(
    ACCOUNTS.map((account) => ({
      role: account.role,
      email: account.email,
      password: PASSWORD,
    }))
  );
  console.log(
    "Categories: %d | Sample tickets created: %d%s",
    Object.keys(categories).length,
    tickets.created,
    tickets.skipped ? " (existing tickets kept)" : ""
  );

  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
