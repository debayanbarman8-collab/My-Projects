-- ====================================================================
-- RevPulse Enterprise Production Migration: 002_enterprise_prod.sql
-- Adds: Immutable System Audit Logs & Deal Velocity Notifications
-- ====================================================================

USE sales_ops_db;

-- 1. Immutable Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    user_email VARCHAR(150),
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

-- 2. System Notifications Table (Deal Velocity SLAs & System Alerts)
CREATE TABLE IF NOT EXISTS system_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('INFO', 'WARNING', 'CRITICAL', 'SUCCESS') DEFAULT 'INFO',
    entity_type VARCHAR(50) NULL,
    entity_id INT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_read (is_read),
    INDEX idx_notif_created (created_at)
) ENGINE=InnoDB;
