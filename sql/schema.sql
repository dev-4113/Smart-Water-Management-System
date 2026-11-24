CREATE DATABASE IF NOT EXISTS smart_water_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_water_db;
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(25) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role)
);
CREATE TABLE IF NOT EXISTS complaints (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  category VARCHAR(60) NOT NULL,
  location VARCHAR(160) NOT NULL,
  subject VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('Submitted', 'In Progress', 'Resolved') NOT NULL DEFAULT 'Submitted',
  admin_note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_complaints_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Replace this placeholder with a strong password before running.
CREATE USER IF NOT EXISTS 'swms_app' @'localhost' IDENTIFIED BY 'CHANGE_THIS_DATABASE_PASSWORD';
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON smart_water_db.* TO 'swms_app' @'localhost';
FLUSH PRIVILEGES;
-- Never store admin passwords as plain text. After npm install, run npm run create-admin.