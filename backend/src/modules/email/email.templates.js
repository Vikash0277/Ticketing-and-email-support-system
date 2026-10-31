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

export function emailLayout({ title, content }) {
  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f4f5f7;font-family:Arial,sans-serif;color:#222">
        <div style="max-width:600px;margin:24px auto;background:#fff;padding:24px;border-radius:8px">
          <h2>${escapeHtml(title)}</h2>
          ${content}
          <hr style="border:0;border-top:1px solid #eee;margin:24px 0">
          <p style="font-size:12px;color:#777">
            Please reply directly to this email to continue your ticket conversation.
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
      content: `
        <p>Thank you for contacting support.</p>
        <p><strong>Ticket:</strong> ${escapeHtml(ticket.ticketNumber)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</p>
        <p>Reply to this email to add a message to your ticket.</p>
      `,
    }),
    text: `Your ticket ${ticket.ticketNumber} has been created.\nSubject: ${ticket.subject}\nReply to this email to continue the conversation.`,
  };
}

export function assignmentTemplate(ticket, agentName, reassigned = false) {
  return {
    subject: `[${ticket.ticketNumber}] ${reassigned ? "Ticket reassigned" : "New ticket assigned"}`,
    html: emailLayout({
      title: reassigned ? "Ticket reassigned" : "New ticket assigned",
      content: `
        <p>Hello ${escapeHtml(agentName || "Agent")},</p>
        <p>A ticket has been ${reassigned ? "reassigned" : "assigned"} to you.</p>
        <p><strong>Ticket:</strong> ${escapeHtml(ticket.ticketNumber)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</p>
      `,
    }),
    text: `Ticket ${ticket.ticketNumber} (${ticket.subject}) has been ${reassigned ? "reassigned" : "assigned"} to you.`,
  };
}

export function statusTemplate(ticket, status) {
  return {
    subject: `[${ticket.ticketNumber}] Status changed to ${status}`,
    html: emailLayout({
      title: "Ticket status updated",
      content: `
        <p>Your support ticket status has changed.</p>
        <p><strong>Ticket:</strong> ${escapeHtml(ticket.ticketNumber)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</p>
        <p><strong>Status:</strong> ${escapeHtml(status)}</p>
      `,
    }),
    text: `Ticket ${ticket.ticketNumber} (${ticket.subject}) status changed to ${status}.`,
  };
}

export function replyTemplate(ticket, message) {
  return {
    subject: `[${ticket.ticketNumber}] Re: ${ticket.subject}`,
    html: emailLayout({
      title: "New reply from support",
      content: `
        <p><strong>Ticket:</strong> ${escapeHtml(ticket.ticketNumber)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(ticket.subject)}</p>
        <div style="white-space:pre-wrap">${escapeHtml(message)}</div>
      `,
    }),
    text: `Ticket: ${ticket.ticketNumber}\nSubject: ${ticket.subject}\n\n${message}`,
  };
}