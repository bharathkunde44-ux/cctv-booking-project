USE cctv_booking;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS email VARCHAR(160) NOT NULL AFTER phone,
  ADD COLUMN IF NOT EXISTS service_address TEXT NOT NULL AFTER email,
  ADD COLUMN IF NOT EXISTS service_type ENUM('New CCTV Installation', 'Repair', 'Maintenance', 'Camera Upgrade') NOT NULL DEFAULT 'New CCTV Installation' AFTER service_address,
  ADD COLUMN IF NOT EXISTS preferred_date DATE NULL AFTER cameras,
  ADD COLUMN IF NOT EXISTS preferred_time TIME NULL AFTER preferred_date,
  ADD COLUMN IF NOT EXISTS message TEXT NULL AFTER preferred_time,
  ADD COLUMN IF NOT EXISTS status ENUM('Pending', 'Confirmed', 'Scheduled', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending' AFTER message,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER status,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

ALTER TABLE bookings
  MODIFY status ENUM('Pending', 'Confirmed', 'Scheduled', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending';

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS priority ENUM('Low', 'Medium', 'High', 'Urgent') NOT NULL DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS status ENUM('Pending', 'Assigned', 'In Progress', 'Completed') NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

UPDATE maintenance_requests SET status = 'Assigned' WHERE status = 'Confirmed';
UPDATE maintenance_requests SET status = 'Completed' WHERE status = 'Cancelled';

ALTER TABLE maintenance_requests
  MODIFY status ENUM('Pending', 'Assigned', 'In Progress', 'Completed') NOT NULL DEFAULT 'Pending';

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Owner', 'Staff') NOT NULL DEFAULT 'Owner',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_login_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  ip_address VARCHAR(80),
  user_agent TEXT,
  logged_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_login_history_admin (admin_id),
  CONSTRAINT fk_admin_login_history_user FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_notifications (
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
);
