const bcrypt = require("bcryptjs");
require("dotenv").config();
const { pool } = require("../src/config/db");

async function seedAdmin() {
  try {
    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "password123";

    // Hash the password
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    console.log("Seeding admin user...");
    console.log(`Username: ${adminUsername}`);
    console.log(`Email: ${adminEmail}`);

    // Try to insert, if duplicate then update
    try {
      const [result] = await pool.execute(
        `INSERT INTO admin_users (username, name, email, password_hash, role)
         VALUES (?, ?, ?, ?, 'Owner')`,
        [adminUsername, adminUsername, adminEmail, passwordHash]
      );
      console.log("✓ Admin user created successfully");
      console.log(`ID: ${result.insertId}`);
    } catch (error) {
      // If user exists, update the password
      if (error.code === "ER_DUP_ENTRY") {
        await pool.execute(
          `UPDATE admin_users SET password_hash = ? WHERE username = ? OR email = ?`,
          [passwordHash, adminUsername, adminEmail]
        );
        console.log("✓ Admin user password updated successfully");
      } else {
        throw error;
      }
    }

    // Verify the user exists
    const [rows] = await pool.execute(
      "SELECT id, username, email FROM admin_users WHERE username = ? OR email = ? LIMIT 1",
      [adminUsername, adminEmail]
    );

    if (rows[0]) {
      console.log("\n✓ Admin user verified:");
      console.log(`  ID: ${rows[0].id}`);
      console.log(`  Username: ${rows[0].username}`);
      console.log(`  Email: ${rows[0].email}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("✗ Error seeding admin user:", error.message);
    process.exit(1);
  }
}

seedAdmin();
