const path = require("path");
const { pool } = require("../config/db");
const { sendOwnerEmailInBackground } = require("../config/mailer");
const { requireFields, validateEmail } = require("../utils/validators");

async function createMaintenanceRequest(req, res, next) {
  try {
    requireFields(req.body, ["name", "phone", "email", "issueDescription", "preferredVisitDate"]);
    validateEmail(req.body.email);

    const { name, phone, email, issueDescription, preferredVisitDate, message } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    // Format date fields properly - convert ISO datetime to date-only format (YYYY-MM-DD)
    const formattedPreferredVisitDate = preferredVisitDate ? new Date(preferredVisitDate).toISOString().split("T")[0] : preferredVisitDate;

    const [result] = await pool.execute(
      `INSERT INTO maintenance_requests
        (name, phone, email, issue_description, issue_image, preferred_visit_date, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, email, issueDescription, imagePath, formattedPreferredVisitDate, message || null]
    );

    await pool.execute(
      "INSERT INTO admin_notifications (type, title, message, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)",
      ["service", "New service request", `${name} reported a maintenance issue`, "service", result.insertId]
    ).catch((error) => console.warn("Service notification skipped:", error.message));

    const attachments = req.file
      ? [
          {
            filename: req.file.originalname,
            path: path.resolve(req.file.path),
          },
        ]
      : [];

    sendOwnerEmailInBackground(
      "New CCTV Maintenance Request",
      {
        "Request ID": result.insertId,
        "Customer name": name,
        Phone: phone,
        Email: email,
        "Issue description": issueDescription,
        "Preferred visit date": preferredVisitDate,
        "Image uploaded": imagePath || "No image",
        Message: message || "No message",
      },
      attachments
    );

    res.status(201).json({
      message: "Maintenance request submitted successfully.",
      requestId: result.insertId,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createMaintenanceRequest,
};
