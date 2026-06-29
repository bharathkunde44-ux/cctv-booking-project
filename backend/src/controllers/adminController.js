const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const { sendCustomerEmailInBackground, sendOwnerEmail } = require("../config/mailer");
const { validateEmail, validateStatus, validateMaintenanceStatus } = require("../utils/validators");

const bookingStatuses = ["Pending", "Confirmed", "Scheduled", "In Progress", "Completed", "Cancelled"];
const serviceStatuses = ["Pending", "Assigned", "In Progress", "Completed"];
const priorities = ["Low", "Medium", "High", "Urgent"];

function jwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    const error = new Error("Admin JWT secret is not configured");
    error.status = 500;
    throw error;
  }
  return secret;
}

function publicAdmin(row) {
  return {
    id: row.id,
    username: row.username || row.name,
    name: row.name || row.username,
    email: row.email,
    role: row.role || "Owner",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function pageOptions(query) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

function sortDirection(value) {
  return String(value || "newest").toLowerCase() === "oldest" ? "ASC" : "DESC";
}

function appendSearch(parts, values, search, fields) {
  if (!search) return;
  parts.push(`(${fields.map((field) => `${field} LIKE ?`).join(" OR ")})`);
  fields.forEach(() => values.push(`%${search}%`));
}

function whereSql(parts) {
  return parts.length ? `WHERE ${parts.join(" AND ")}` : "";
}

async function insertNotification(type, title, message, entityType = null, entityId = null) {
  await pool.execute(
    "INSERT INTO admin_notifications (type, title, message, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)",
    [type, title, message, entityType, entityId]
  ).catch((error) => console.warn("Notification skipped:", error.message));
}

async function login(req, res, next) {
  try {
    const { username, email, password } = req.body;
    if ((!username && !email) || !password) {
      return res.status(400).json({ message: "Username or email and password are required" });
    }

    const identifier = username || email;
    const [rows] = await pool.execute(
      "SELECT * FROM admin_users WHERE username = ? OR email = ? LIMIT 1",
      [identifier, identifier]
    );

    const admin = rows[0];
    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const profile = publicAdmin(admin);
    const token = jwt.sign({ id: admin.id, email: admin.email, username: profile.username }, jwtSecret(), {
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    });

    await pool.execute(
      "INSERT INTO admin_login_history (admin_id, ip_address, user_agent) VALUES (?, ?, ?)",
      [admin.id, req.ip, req.headers["user-agent"] || null]
    ).catch((error) => console.warn("Login history skipped:", error.message));

    res.json({ token, admin: profile });
  } catch (error) {
    next(error);
  }
}

function logout(req, res) {
  res.json({ message: "Logged out successfully" });
}

async function getProfile(req, res, next) {
  try {
    const [rows] = await pool.execute("SELECT * FROM admin_users WHERE id = ? LIMIT 1", [req.admin.id]);
    if (!rows[0]) return res.status(404).json({ message: "Admin profile not found" });

    const [history] = await pool.execute(
      "SELECT id, ip_address, user_agent, logged_in_at FROM admin_login_history WHERE admin_id = ? ORDER BY logged_in_at DESC LIMIT 20",
      [req.admin.id]
    );

    res.json({ admin: publicAdmin(rows[0]), loginHistory: history });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { username, email } = req.body;
    if (!username || !email) return res.status(400).json({ message: "Username and email are required" });
    validateEmail(email);

    await pool.execute("UPDATE admin_users SET username = ?, name = ?, email = ? WHERE id = ?", [
      username,
      username,
      email,
      req.admin.id,
    ]);
    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "Current password and a new password of at least 8 characters are required" });
    }

    const [rows] = await pool.execute("SELECT password_hash FROM admin_users WHERE id = ? LIMIT 1", [req.admin.id]);
    if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.execute("UPDATE admin_users SET password_hash = ? WHERE id = ?", [hash, req.admin.id]);
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
}

async function getDashboard(req, res, next) {
  try {
    const [[bookingTotals]] = await pool.execute(`
      SELECT
        COUNT(*) total,
        SUM(status = 'Pending') pending,
        SUM(status = 'Confirmed') confirmed,
        SUM(status = 'Completed') completed
      FROM bookings
    `);
    const [[serviceTotals]] = await pool.execute(`
      SELECT
        COUNT(*) total,
        SUM(status = 'Pending') pending,
        SUM(status = 'Completed') completed
      FROM maintenance_requests
    `);
    const [[customerTotals]] = await pool.execute(
      "SELECT COUNT(*) total FROM (SELECT email FROM bookings UNION SELECT email FROM maintenance_requests UNION SELECT email FROM contacts) customers"
    );
    const [recentBookings] = await pool.execute("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 5");
    const [recentServices] = await pool.execute("SELECT * FROM maintenance_requests ORDER BY created_at DESC LIMIT 5");
    const [timeline] = await pool.execute(`
      SELECT type, title, message, created_at FROM admin_notifications
      ORDER BY created_at DESC LIMIT 10
    `);
    const [monthlyTrends] = await pool.execute(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') month, COUNT(*) bookings
      FROM bookings
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC LIMIT 12
    `);

    res.json({
      stats: {
        totalBookings: Number(bookingTotals.total || 0),
        pendingBookings: Number(bookingTotals.pending || 0),
        confirmedBookings: Number(bookingTotals.confirmed || 0),
        completedBookings: Number(bookingTotals.completed || 0),
        totalServiceRequests: Number(serviceTotals.total || 0),
        pendingServiceRequests: Number(serviceTotals.pending || 0),
        completedServiceRequests: Number(serviceTotals.completed || 0),
        totalCustomers: Number(customerTotals.total || 0),
      },
      recentBookings,
      recentServices,
      timeline,
      monthlyTrends: monthlyTrends.reverse(),
    });
  } catch (error) {
    next(error);
  }
}

async function listBookings(req, res, next) {
  try {
    const { page, limit, offset } = pageOptions(req.query);
    const parts = [];
    const values = [];
    appendSearch(parts, values, req.query.search, ["full_name", "phone", "email", "service_type", "service_address"]);
    if (req.query.status) {
      parts.push("status = ?");
      values.push(req.query.status);
    }
    if (req.query.date) {
      parts.push("DATE(preferred_date) = ?");
      values.push(req.query.date);
    }
    const where = whereSql(parts);
    const [[count]] = await pool.execute(`SELECT COUNT(*) total FROM bookings ${where}`, values);
    const [rows] = await pool.execute(
      `SELECT * FROM bookings ${where} ORDER BY created_at ${sortDirection(req.query.sort)} LIMIT ${limit} OFFSET ${offset}`,
      values
    );
    res.json({ data: rows, meta: { page, limit, total: Number(count.total || 0), totalPages: Math.ceil((count.total || 0) / limit) } });
  } catch (error) {
    next(error);
  }
}

async function getBooking(req, res, next) {
  try {
    const [rows] = await pool.execute("SELECT * FROM bookings WHERE id = ? LIMIT 1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: "Booking not found" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function updateBooking(req, res, next) {
  try {
    const allowed = ["full_name", "phone", "email", "service_address", "service_type", "cameras", "preferred_date", "preferred_time", "message", "status"];
    const updates = allowed.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field));
    if (req.body.status) validateStatus(req.body.status);
    if (!updates.length) return res.status(400).json({ message: "No booking fields supplied" });

    const [beforeRows] = await pool.execute("SELECT * FROM bookings WHERE id = ? LIMIT 1", [req.params.id]);
    if (!beforeRows[0]) return res.status(404).json({ message: "Booking not found" });

    // Format date fields properly for database storage
    const updateValues = updates.map((field) => {
      let value = req.body[field];
      // Convert ISO datetime to date-only format (YYYY-MM-DD) for preferred_date
      if (field === "preferred_date" && value) {
        value = new Date(value).toISOString().split("T")[0];
      }
      return value;
    });

    await pool.execute(
      `UPDATE bookings SET ${updates.map((field) => `${field} = ?`).join(", ")} WHERE id = ?`,
      [...updateValues, req.params.id]
    );

    if (req.body.status && req.body.status !== beforeRows[0].status) {
      await insertNotification("status", "Booking status updated", `${beforeRows[0].full_name}'s booking is now ${req.body.status}`, "booking", req.params.id);
      sendCustomerEmailInBackground(beforeRows[0].email, "Your CCTV booking status was updated", {
        "Booking ID": req.params.id,
        Status: req.body.status,
        "Service type": beforeRows[0].service_type,
        "Preferred date": beforeRows[0].preferred_date,
      });
    }

    res.json({ message: "Booking updated successfully" });
  } catch (error) {
    next(error);
  }
}

async function deleteBooking(req, res, next) {
  try {
    await pool.execute("DELETE FROM bookings WHERE id = ?", [req.params.id]);
    res.json({ message: "Booking deleted" });
  } catch (error) {
    next(error);
  }
}

async function listServices(req, res, next) {
  try {
    const { page, limit, offset } = pageOptions(req.query);
    const parts = [];
    const values = [];
    appendSearch(parts, values, req.query.search, ["name", "phone", "email", "issue_description"]);
    if (req.query.status) {
      parts.push("status = ?");
      values.push(req.query.status);
    }
    if (req.query.priority) {
      parts.push("priority = ?");
      values.push(req.query.priority);
    }
    const where = whereSql(parts);
    const [[count]] = await pool.execute(`SELECT COUNT(*) total FROM maintenance_requests ${where}`, values);
    const [rows] = await pool.execute(
      `SELECT * FROM maintenance_requests ${where} ORDER BY created_at ${sortDirection(req.query.sort)} LIMIT ${limit} OFFSET ${offset}`,
      values
    );
    res.json({ data: rows, meta: { page, limit, total: Number(count.total || 0), totalPages: Math.ceil((count.total || 0) / limit) } });
  } catch (error) {
    next(error);
  }
}

async function getService(req, res, next) {
  try {
    const [rows] = await pool.execute("SELECT * FROM maintenance_requests WHERE id = ? LIMIT 1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: "Service request not found" });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}

async function updateService(req, res, next) {
  try {
    const allowed = ["name", "phone", "email", "issue_description", "preferred_visit_date", "message", "status", "priority"];
    const updates = allowed.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field));
    if (req.body.status) validateMaintenanceStatus(req.body.status);
    if (req.body.priority && !priorities.includes(req.body.priority)) return res.status(400).json({ message: "Invalid priority" });
    if (!updates.length) return res.status(400).json({ message: "No service fields supplied" });

    const [beforeRows] = await pool.execute("SELECT * FROM maintenance_requests WHERE id = ? LIMIT 1", [req.params.id]);
    if (!beforeRows[0]) return res.status(404).json({ message: "Service request not found" });

    // Format date fields properly for database storage
    const updateValues = updates.map((field) => {
      let value = req.body[field];
      // Convert ISO datetime to date-only format (YYYY-MM-DD) for preferred_visit_date
      if (field === "preferred_visit_date" && value) {
        value = new Date(value).toISOString().split("T")[0];
      }
      return value;
    });

    await pool.execute(
      `UPDATE maintenance_requests SET ${updates.map((field) => `${field} = ?`).join(", ")} WHERE id = ?`,
      [...updateValues, req.params.id]
    );

    if (req.body.status && req.body.status !== beforeRows[0].status) {
      await insertNotification("status", "Service status updated", `${beforeRows[0].name}'s service request is now ${req.body.status}`, "service", req.params.id);
      sendCustomerEmailInBackground(beforeRows[0].email, "Your CCTV service request status was updated", {
        "Request ID": req.params.id,
        Status: req.body.status,
        "Preferred visit date": beforeRows[0].preferred_visit_date,
      });
    }

    res.json({ message: "Service request updated successfully" });
  } catch (error) {
    next(error);
  }
}

async function deleteService(req, res, next) {
  try {
    await pool.execute("DELETE FROM maintenance_requests WHERE id = ?", [req.params.id]);
    res.json({ message: "Service request deleted" });
  } catch (error) {
    next(error);
  }
}

async function listCustomers(req, res, next) {
  try {
    const { page, limit, offset } = pageOptions(req.query);
    const search = req.query.search ? `%${req.query.search}%` : null;
    const where = search ? "WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? OR address LIKE ?" : "";
    const values = search ? [search, search, search, search] : [];
    const base = `
      SELECT
        COALESCE(NULLIF(MAX(name), ''), email) name,
        MAX(phone) phone,
        email,
        MAX(address) address,
        SUM(source = 'booking') total_bookings,
        MAX(activity_at) last_activity
      FROM (
        SELECT full_name name, phone, email, service_address address, created_at activity_at, 'booking' source FROM bookings
        UNION ALL
        SELECT name, phone, email, NULL address, created_at activity_at, 'service' source FROM maintenance_requests
        UNION ALL
        SELECT name, phone, email, location address, created_at activity_at, 'contact' source FROM contacts
      ) customer_events
      GROUP BY email
    `;
    const [[count]] = await pool.execute(`SELECT COUNT(*) total FROM (${base}) customers ${where}`, values);
    const [rows] = await pool.execute(
      `SELECT * FROM (${base}) customers ${where} ORDER BY last_activity DESC LIMIT ${limit} OFFSET ${offset}`,
      values
    );
    res.json({ data: rows, meta: { page, limit, total: Number(count.total || 0), totalPages: Math.ceil((count.total || 0) / limit) } });
  } catch (error) {
    next(error);
  }
}

async function getCustomer(req, res, next) {
  try {
    const email = decodeURIComponent(req.params.id);
    const [bookings] = await pool.execute("SELECT * FROM bookings WHERE email = ? ORDER BY created_at DESC", [email]);
    const [services] = await pool.execute("SELECT * FROM maintenance_requests WHERE email = ? ORDER BY created_at DESC", [email]);
    const [contacts] = await pool.execute("SELECT * FROM contacts WHERE email = ? ORDER BY created_at DESC", [email]);
    if (!bookings.length && !services.length && !contacts.length) return res.status(404).json({ message: "Customer not found" });
    res.json({ email, profile: bookings[0] || services[0] || contacts[0], bookings, services, contacts });
  } catch (error) {
    next(error);
  }
}

async function getNotifications(req, res, next) {
  try {
    const [rows] = await pool.execute("SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 100");
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

async function updateNotification(req, res, next) {
  try {
    await pool.execute("UPDATE admin_notifications SET is_read = ? WHERE id = ?", [Boolean(req.body.is_read), req.params.id]);
    res.json({ message: "Notification updated" });
  } catch (error) {
    next(error);
  }
}

async function getReports(req, res, next) {
  try {
    const [monthlyBookings] = await pool.execute(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') label, COUNT(*) value
      FROM bookings GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY label
    `);
    const [serviceRequests] = await pool.execute(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') label, COUNT(*) value
      FROM maintenance_requests GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY label
    `);
    const [bookingStatus] = await pool.execute("SELECT status label, COUNT(*) value FROM bookings GROUP BY status");
    const [customerGrowth] = await pool.execute(`
      SELECT DATE_FORMAT(first_activity, '%Y-%m') label, COUNT(*) value
      FROM (
        SELECT email, MIN(created_at) first_activity FROM (
          SELECT email, created_at FROM bookings
          UNION ALL SELECT email, created_at FROM maintenance_requests
          UNION ALL SELECT email, created_at FROM contacts
        ) events GROUP BY email
      ) customers GROUP BY DATE_FORMAT(first_activity, '%Y-%m') ORDER BY label
    `);

    res.json({ monthlyBookings, serviceRequests, bookingStatus, customerGrowth });
  } catch (error) {
    next(error);
  }
}

async function testOwnerEmail(req, res, next) {
  try {
    await sendOwnerEmail("CCTV Website Email Test", {
      Source: "Admin email test",
      Status: "Render can send owner emails",
      Time: new Date().toISOString(),
    });
    res.json({ message: "Test email sent successfully." });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  bookingStatuses,
  serviceStatuses,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  getDashboard,
  listBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  listServices,
  getService,
  updateService,
  deleteService,
  listCustomers,
  getCustomer,
  getNotifications,
  updateNotification,
  getReports,
  testOwnerEmail,
};
