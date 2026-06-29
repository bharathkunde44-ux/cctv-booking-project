require("dotenv").config();

const mysql = require("mysql2/promise");

const database = process.env.DB_NAME || "cctv_booking";
const useSsl = process.env.DB_SSL === "true";
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";

const tables = {
  bookings: [
    ["full_name", "VARCHAR(120) NOT NULL"],
    ["phone", "VARCHAR(30) NOT NULL"],
    ["email", "VARCHAR(160) NOT NULL DEFAULT ''"],
    ["service_address", "TEXT NULL"],
    [
      "service_type",
      "ENUM('New CCTV Installation', 'Repair', 'Maintenance', 'Camera Upgrade') NOT NULL DEFAULT 'New CCTV Installation'",
    ],
    ["cameras", "INT NOT NULL DEFAULT 1"],
    ["preferred_date", "DATE NULL"],
    ["preferred_time", "TIME NULL"],
    ["message", "TEXT NULL"],
    ["status", "ENUM('Pending', 'Confirmed', 'Scheduled', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending'"],
    ["created_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["updated_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
  ],
  maintenance_requests: [
    ["name", "VARCHAR(120) NOT NULL"],
    ["phone", "VARCHAR(30) NOT NULL"],
    ["email", "VARCHAR(160) NOT NULL"],
    ["issue_description", "TEXT NOT NULL"],
    ["issue_image", "VARCHAR(255) NULL"],
    ["preferred_visit_date", "DATE NOT NULL"],
    ["message", "TEXT NULL"],
    ["priority", "ENUM('Low', 'Medium', 'High', 'Urgent') NOT NULL DEFAULT 'Medium'"],
    ["status", "ENUM('Pending', 'Assigned', 'In Progress', 'Completed') NOT NULL DEFAULT 'Pending'"],
    ["created_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["updated_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
  ],
  contacts: [
    ["name", "VARCHAR(120) NOT NULL"],
    ["phone", "VARCHAR(30) NOT NULL"],
    ["email", "VARCHAR(160) NOT NULL"],
    ["service_type", "VARCHAR(80) NULL"],
    ["location", "TEXT NULL"],
    ["message", "TEXT NOT NULL"],
    ["created_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"],
  ],
};

async function tableExists(connection, tableName) {
  const [rows] = await connection.execute(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
    [database, tableName]
  );
  return rows.length > 0;
}

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [database, tableName, columnName]
  );
  return rows.length > 0;
}

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    ssl: useSsl ? { rejectUnauthorized } : undefined,
    multipleStatements: true,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  await connection.query(`USE \`${database}\``);

  for (const [tableName, columns] of Object.entries(tables)) {
    if (!(await tableExists(connection, tableName))) {
      const columnSql = columns.map(([name, definition]) => `\`${name}\` ${definition}`).join(", ");
      await connection.query(`CREATE TABLE \`${tableName}\` (id INT AUTO_INCREMENT PRIMARY KEY, ${columnSql})`);
      console.log(`Created table: ${tableName}`);
      continue;
    }

    for (const [columnName, definition] of columns) {
      if (!(await columnExists(connection, tableName, columnName))) {
        await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
        console.log(`Added ${tableName}.${columnName}`);
      }
    }
  }

  if (!(await tableExists(connection, "admin_users"))) {
    await connection.query(`
      CREATE TABLE admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(160) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('Owner', 'Staff') NOT NULL DEFAULT 'Owner',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("Created table: admin_users");
  } else {
    if (!(await columnExists(connection, "admin_users", "username"))) {
      await connection.query("ALTER TABLE admin_users ADD COLUMN username VARCHAR(100) NULL AFTER id");
      await connection.query("UPDATE admin_users SET username = COALESCE(NULLIF(name, ''), email)");
      await connection.query("ALTER TABLE admin_users MODIFY username VARCHAR(100) NOT NULL");
      await connection.query("ALTER TABLE admin_users ADD UNIQUE INDEX idx_admin_users_username (username)");
      console.log("Added admin_users.username");
    }
  }

  await connection.query(
    "ALTER TABLE bookings MODIFY status ENUM('Pending', 'Confirmed', 'Scheduled', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending'"
  );
  await connection.query("UPDATE maintenance_requests SET status = 'Assigned' WHERE status = 'Confirmed'");
  await connection.query("UPDATE maintenance_requests SET status = 'Completed' WHERE status = 'Cancelled'");
  await connection.query(
    "ALTER TABLE maintenance_requests MODIFY status ENUM('Pending', 'Assigned', 'In Progress', 'Completed') NOT NULL DEFAULT 'Pending'"
  );

  if (!(await tableExists(connection, "admin_login_history"))) {
    await connection.query(`
      CREATE TABLE admin_login_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        ip_address VARCHAR(80),
        user_agent TEXT,
        logged_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_login_history_admin (admin_id),
        CONSTRAINT fk_admin_login_history_user FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
      )
    `);
    console.log("Created table: admin_login_history");
  }

  if (!(await tableExists(connection, "admin_notifications"))) {
    await connection.query(`
      CREATE TABLE admin_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('booking', 'service', 'status', 'system') NOT NULL DEFAULT 'system',
        title VARCHAR(160) NOT NULL,
        message TEXT NOT NULL,
        entity_type VARCHAR(40),
        entity_id INT,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_notifications_read (is_read),
        INDEX idx_admin_notifications_created (created_at)
      )
    `);
    console.log("Created table: admin_notifications");
  }

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminUsername && adminEmail && adminPassword) {
    const bcrypt = require("bcryptjs");
    const [existing] = await connection.execute("SELECT id FROM admin_users WHERE username = ? OR email = ? LIMIT 1", [
      adminUsername,
      adminEmail,
    ]);
    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await connection.execute(
        "INSERT INTO admin_users (username, name, email, password_hash) VALUES (?, ?, ?, ?)",
        [adminUsername, adminUsername, adminEmail, passwordHash]
      );
      console.log("Created initial admin user from environment variables.");
    }
  }

  await connection.end();
  console.log("Database migration complete.");
}

migrate().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
