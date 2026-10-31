import env from "../../config/env.js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

export function ticketUrl(ticket) {
  return `${env.FRONTEND_URL}/tickets/${ticket._id}`;
}

export function emailLayout({ title, content, ticket }) {
  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
        <div style="max-width:600px;margin:24px auto;background:#fff;padding:28px;border-radius:12px">
          <h2 style="margin:0 0 16px">${escapeHtml(title)}</h2>
          ${content}
          ${
            ticket
              ? `<p style="margin:24px 0">
                   <a href="${escapeHtml(ticketUrl(ticket))}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">View ticket online</a>
                 </p>`
              : ""
          }
          <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="font-size:12px;color:#64748b">
            Reply directly to this email to continue your ticket conversation.
          </p>
        </div>
      </body>
    </html>
  `;
}

export function ticketCreatedTemplate(ticket) {
  return {
    subject: `[${ticket.ticketNumber}] We received your support request`,
    html: emailLayout({
      title: "Your ticket has been created",
      ticket,
      content: `
        <p>Thank you for contacting support. Our team will get back to you shortly.</p>
        <p><strong>Ticket:</strong> ${escapeHtml(ticket.ticketNumber)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</p>
        <p><strong>Priority:</strong> ${escapeHtml(ticket.priority)}</p>
        <p>Reply to this email to add a message to your ticket.</p>
      `,
    }),
    text: `Your ticket ${ticket.ticketNumber} has been created.\nSubject: ${ticket.subject}\nPriority: ${ticket.priority}\nView: ${ticketUrl(ticket)}\n\nReply to this email to continue the conversation.`,
  };
}

export function assignmentTemplate(ticket, agentName, reassigned = false) {
  return {
    subject: `[${ticket.ticketNumber}] ${
      reassigned ? "Ticket reassigned" : "New ticket assigned"
    }`,
    html: emailLayout({
      title: reassigned ? "Ticket reassigned" : "New ticket assigned",
      ticket,
      content: `
        <p>Hello ${escapeHtml(agentName || "Agent")},</p>
        <p>A ticket has been ${reassigned ? "reassigned" : "assigned"} to you.</p>
        <p><strong>Ticket:</strong> ${escapeHtml(ticket.ticketNumber)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</p>
        <p><strong>Priority:</strong> ${escapeHtml(ticket.priority)}</p>
        <p><strong>Status:</strong> ${escapeHtml(ticket.status)}</p>
      `,
    }),
    text: `Ticket ${ticket.ticketNumber} (${ticket.subject}) has been ${
      reassigned ? "reassigned" : "assigned"
    } to you.\nView: ${ticketUrl(ticket)}`,
  };
}

export function statusTemplate(ticket, status) {
  return {
    subject: `[${ticket.ticketNumber}] Status changed to ${status}`,
    html: emailLayout({
      title: "Ticket status updated",
      ticket,
      content: `
        <p>Your support ticket status has changed.</p>
        <p><strong>Ticket:</strong> ${escapeHtml(ticket.ticketNumber)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</p>
        <p><strong>Status:</strong> ${escapeHtml(status)}</p>
      `,
    }),
    text: `Ticket ${ticket.ticketNumber} (${ticket.subject}) status changed to ${status}.\nView: ${ticketUrl(ticket)}`,
  };
}

export function replyTemplate(ticket, message) {
  return {
    subject: `[${ticket.ticketNumber}] Re: ${ticket.subject}`,
    html: emailLayout({
      title: "New reply from support",
      ticket,
      content: `
        <p><strong>Ticket:</strong> ${escapeHtml(ticket.ticketNumber)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</p>
        <div style="white-space:pre-wrap;background:#f8fafc;padding:16px;border-radius:8px">${escapeHtml(message)}</div>
      `,
    }),
    text: `Ticket: ${ticket.ticketNumber}\nSubject: ${ticket.subject}\n\n${message}\n\nView: ${ticketUrl(ticket)}`,
  };
}

export function customerMessageTemplate(ticket, message) {
  return {
    subject: `[${ticket.ticketNumber}] New customer reply`,
    html: emailLayout({
      title: "New customer reply",
      ticket,
      content: `
        <p><strong>Ticket:</strong> ${escapeHtml(ticket.ticketNumber)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</p>
        <div style="white-space:pre-wrap;background:#f8fafc;padding:16px;border-radius:8px">${escapeHtml(message)}</div>
      `,
    }),
    text: `New customer reply on ${ticket.ticketNumber} (${ticket.subject}):\n\n${message}\n\nView: ${ticketUrl(ticket)}`,
  };
}
