function requireFields(body, fields) {
  const missing = fields.filter((field) => !String(body[field] || "").trim());
  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(", ")}`);
    error.status = 400;
    throw error;
  }
}

function validateEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error("Please provide a valid email address");
    error.status = 400;
    throw error;
  }
}

function validateStatus(status) {
  const allowed = ["Pending", "Confirmed", "Scheduled", "In Progress", "Completed", "Cancelled"];
  if (!allowed.includes(status)) {
    const error = new Error("Invalid status");
    error.status = 400;
    throw error;
  }
}

function validateMaintenanceStatus(status) {
  const allowed = ["Pending", "Assigned", "In Progress", "Completed"];
  if (!allowed.includes(status)) {
    const error = new Error("Invalid maintenance status");
    error.status = 400;
    throw error;
  }
}

module.exports = {
  requireFields,
  validateEmail,
  validateStatus,
  validateMaintenanceStatus,
};
