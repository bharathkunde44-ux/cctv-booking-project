const nodemailer = require("nodemailer");
const fs = require("fs/promises");

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, ""),
    },
  });
}

function formatDetails(details) {
  return Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

function formatHtml(details) {
  const rows = Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([key, value]) => `
        <tr>
          <td style="padding:10px 12px;border:1px solid #dbe3ea;font-weight:700;background:#f4f7fb">${key}</td>
          <td style="padding:10px 12px;border:1px solid #dbe3ea">${String(value)}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#172026">
      <h2 style="margin:0 0 16px;color:#0c43a2">THRINAINA Electronic Security System</h2>
      <table style="border-collapse:collapse;width:100%;max-width:720px">${rows}</table>
    </div>`;
}

async function sendOwnerEmail(subject, details, attachments = []) {
  const missing = ["OWNER_EMAIL"].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`Email skipped. Missing environment variables: ${missing.join(", ")}`);
    return;
  }

  if (process.env.RESEND_API_KEY) {
    await sendWithResend(subject, details, attachments);
    return;
  }

  const smtpMissing = ["GMAIL_USER", "GMAIL_APP_PASSWORD"].filter((key) => !process.env[key]);
  if (smtpMissing.length > 0) {
    console.warn(`Email skipped. Missing environment variables: ${smtpMissing.join(", ")}`);
    return;
  }

  const transporter = createTransporter();
  const text = formatDetails(details);

  const info = await transporter.sendMail({
    from: `"CCTV Service Website" <${process.env.GMAIL_USER}>`,
    to: process.env.OWNER_EMAIL,
    subject,
    replyTo: details.Email || process.env.GMAIL_USER,
    text,
    html: formatHtml(details),
    attachments,
  });

  console.log("Owner email sent", {
    to: process.env.OWNER_EMAIL,
    subject,
    messageId: info.messageId,
  });
}

async function sendCustomerEmail(to, subject, details) {
  if (!to) {
    return;
  }

  if (process.env.RESEND_API_KEY) {
    await sendCustomerEmailWithResend(to, subject, details);
    return;
  }

  const smtpMissing = ["GMAIL_USER", "GMAIL_APP_PASSWORD"].filter((key) => !process.env[key]);
  if (smtpMissing.length > 0) {
    console.warn(`Customer email skipped. Missing environment variables: ${smtpMissing.join(", ")}`);
    return;
  }

  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: `"CCTV Service Team" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text: formatDetails(details),
    html: formatHtml(details),
  });

  console.log("Customer email sent", { to, subject, messageId: info.messageId });
}

async function sendCustomerEmailWithResend(to, subject, details) {
  const from = process.env.EMAIL_FROM || "CCTV Service Website <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: formatDetails(details),
      html: formatHtml(details),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Resend customer email failed with status ${response.status}`);
  }

  console.log("Customer email sent", { provider: "resend", to, subject, messageId: data.id });
}

function sendCustomerEmailInBackground(to, subject, details) {
  sendCustomerEmail(to, subject, details).catch((error) => {
    console.error("Customer email failed:", error.message);
  });
}

async function formatResendAttachments(attachments) {
  return Promise.all(
    attachments.map(async (attachment) => ({
      filename: attachment.filename,
      content: await fs.readFile(attachment.path, "base64"),
    }))
  );
}

async function sendWithResend(subject, details, attachments = []) {
  const from = process.env.EMAIL_FROM || "CCTV Service Website <onboarding@resend.dev>";
  const text = formatDetails(details);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [process.env.OWNER_EMAIL],
      subject,
      reply_to: details.Email || undefined,
      text,
      html: formatHtml(details),
      attachments: await formatResendAttachments(attachments),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Resend email failed with status ${response.status}`);
  }

  console.log("Owner email sent", {
    provider: "resend",
    to: process.env.OWNER_EMAIL,
    subject,
    messageId: data.id,
  });
}

function sendOwnerEmailInBackground(subject, details, attachments = []) {
  sendOwnerEmail(subject, details, attachments).catch((error) => {
    console.error("Owner email failed:", error.message);
  });
}

module.exports = {
  sendOwnerEmail,
  sendOwnerEmailInBackground,
  sendCustomerEmail,
  sendCustomerEmailInBackground,
};
