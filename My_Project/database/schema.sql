-- ====================================================================
-- RevPulse: Sales Operations Management System (SOMS) Database Schema
-- Target: MySQL 8.0+
-- Features: Strict foreign keys, optimized indexes, JSON explainability,
--           relational quota and commission tracking, ML log storage.
-- ====================================================================

CREATE DATABASE IF NOT EXISTS sales_ops_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE sales_ops_db;

-- 1. Territories Table
CREATE TABLE IF NOT EXISTS territories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    region ENUM('North America', 'EMEA', 'APAC', 'LATAM') NOT NULL,
    tier ENUM('Enterprise', 'Mid-Market', 'SMB') NOT NULL,
    min_company_size INT DEFAULT 1,
    max_company_size INT DEFAULT 1000000,
    target_industry VARCHAR(100) DEFAULT 'All',
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Users / Sales Representatives Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('sales_ops_admin', 'sales_manager', 'account_executive', 'sales_dev_rep', 'customer') NOT NULL DEFAULT 'account_executive',
    territory_id INT NULL,
    account_id INT NULL,
    phone VARCHAR(30),
    avatar_url VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_territory FOREIGN KEY (territory_id) REFERENCES territories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 3. Accounts (Company Customers / Prospects) Table
CREATE TABLE IF NOT EXISTS accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    industry VARCHAR(100) NOT NULL,
    employees INT DEFAULT 50,
    annual_revenue DECIMAL(15,2) DEFAULT 0.00,
    website VARCHAR(255),
    tier ENUM('Tier-1 Enterprise', 'Tier-2 Mid-Market', 'Tier-3 SMB') DEFAULT 'Tier-2 Mid-Market',
    assigned_rep_id INT NULL,
    territory_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_accounts_rep (assigned_rep_id),
    INDEX idx_accounts_tier (tier),
    CONSTRAINT fk_accounts_rep FOREIGN KEY (assigned_rep_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_accounts_territory FOREIGN KEY (territory_id) REFERENCES territories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4. Opportunity Stages (Pipeline Lifecycle)
CREATE TABLE IF NOT EXISTS opportunity_stages (
    id INT PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    stage_order INT NOT NULL UNIQUE,
    default_probability DECIMAL(5,2) NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    is_won BOOLEAN DEFAULT FALSE,
    target_max_days INT DEFAULT 14
) ENGINE=InnoDB;

-- 5. Leads Table (with embedded ML Scoring & Behavioral Signals)
CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    company VARCHAR(150) NOT NULL,
    title VARCHAR(120),
    industry VARCHAR(100) DEFAULT 'Technology',
    company_size INT DEFAULT 100,
    annual_revenue DECIMAL(15,2) DEFAULT 5000000.00,
    lead_source ENUM('Inbound Demo', 'Organic Search', 'Cold Outreach', 'Webinar', 'Partner Referral', 'Event') DEFAULT 'Inbound Demo',
    status ENUM('New', 'Contacted', 'Qualified', 'Unqualified', 'Converted') DEFAULT 'New',
    assigned_to INT NULL,
    territory_id INT NULL,
    website_visits INT DEFAULT 1,
    email_opens INT DEFAULT 0,
    content_downloads INT DEFAULT 0,
    decision_maker BOOLEAN DEFAULT FALSE,
    budget_confirmed BOOLEAN DEFAULT FALSE,
    urgency_level ENUM('Low', 'Medium', 'High', 'Immediate') DEFAULT 'Medium',
    ml_score INT DEFAULT 50,
    ml_grade ENUM('A', 'B', 'C', 'D') DEFAULT 'C',
    ml_factors JSON NULL,
    converted_deal_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_leads_status (status),
    INDEX idx_leads_score (ml_score),
    INDEX idx_leads_assigned (assigned_to),
    CONSTRAINT fk_leads_assigned FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_leads_territory FOREIGN KEY (territory_id) REFERENCES territories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 6. Opportunities / Deals Table (with ML Win Predictor & Risk Engine)
CREATE TABLE IF NOT EXISTS opportunities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    account_id INT NOT NULL,
    lead_id INT NULL,
    stage_id INT NOT NULL DEFAULT 1,
    amount DECIMAL(15,2) NOT NULL,
    expected_close_date DATE NOT NULL,
    assigned_rep_id INT NOT NULL,
    secondary_rep_id INT NULL,
    split_percentage DECIMAL(5,2) DEFAULT 100.00,
    forecast_category ENUM('Pipeline', 'Best Case', 'Commit', 'Closed', 'Omitted') DEFAULT 'Pipeline',
    discount_percent DECIMAL(5,2) DEFAULT 0.00,
    competitor VARCHAR(100) DEFAULT 'None',
    has_executive_sponsor BOOLEAN DEFAULT FALSE,
    has_security_approval BOOLEAN DEFAULT FALSE,
    days_in_current_stage INT DEFAULT 1,
    total_activities_count INT DEFAULT 0,
    ml_win_probability DECIMAL(5,2) DEFAULT 35.00,
    ml_risk_level ENUM('Low Risk', 'Moderate Risk', 'High Risk', 'Critical Risk') DEFAULT 'Moderate Risk',
    ml_insights JSON NULL,
    lost_reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_opp_stage (stage_id),
    INDEX idx_opp_rep (assigned_rep_id),
    INDEX idx_opp_close_date (expected_close_date),
    INDEX idx_opp_forecast (forecast_category),
    CONSTRAINT fk_opp_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_opp_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    CONSTRAINT fk_opp_stage FOREIGN KEY (stage_id) REFERENCES opportunity_stages(id),
    CONSTRAINT fk_opp_rep FOREIGN KEY (assigned_rep_id) REFERENCES users(id),
    CONSTRAINT fk_opp_sec_rep FOREIGN KEY (secondary_rep_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. Deal Stage Transition History (for Velocity & Bottleneck Analysis)
CREATE TABLE IF NOT EXISTS stage_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id INT NOT NULL,
    from_stage_id INT NULL,
    to_stage_id INT NOT NULL,
    changed_by_user_id INT NULL,
    duration_days INT DEFAULT 0,
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_history_opp (opportunity_id),
    CONSTRAINT fk_hist_opp FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
    CONSTRAINT fk_hist_from FOREIGN KEY (from_stage_id) REFERENCES opportunity_stages(id) ON DELETE SET NULL,
    CONSTRAINT fk_hist_to FOREIGN KEY (to_stage_id) REFERENCES opportunity_stages(id),
    CONSTRAINT fk_hist_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 8. Quotas Table (Performance Targets by Rep & Quarter)
CREATE TABLE IF NOT EXISTS quotas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rep_id INT NOT NULL,
    fiscal_year INT NOT NULL,
    fiscal_quarter VARCHAR(10) NOT NULL,
    target_amount DECIMAL(15,2) NOT NULL,
    attained_amount DECIMAL(15,2) DEFAULT 0.00,
    status ENUM('On Track', 'Behind', 'Exceeded') DEFAULT 'On Track',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_rep_quarter (rep_id, fiscal_year, fiscal_quarter),
    CONSTRAINT fk_quotas_rep FOREIGN KEY (rep_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Commissions Table (Automated Commission Engine with Tiered Accelerators)
CREATE TABLE IF NOT EXISTS commissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id INT NOT NULL,
    rep_id INT NOT NULL,
    deal_amount DECIMAL(15,2) NOT NULL,
    quota_attainment_pct_at_close DECIMAL(5,2) NOT NULL,
    base_rate_pct DECIMAL(5,2) NOT NULL DEFAULT 8.00,
    accelerator_multiplier DECIMAL(4,2) DEFAULT 1.00,
    effective_commission_pct DECIMAL(5,2) NOT NULL,
    total_payout DECIMAL(15,2) NOT NULL,
    payout_status ENUM('Pending Review', 'Approved', 'Paid') DEFAULT 'Pending Review',
    payment_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_comm_rep (rep_id),
    INDEX idx_comm_opp (opportunity_id),
    CONSTRAINT fk_comm_opp FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
    CONSTRAINT fk_comm_rep FOREIGN KEY (rep_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Activities Table (Engagement & Touchpoints Audit Trail)
CREATE TABLE IF NOT EXISTS activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('Call', 'Email', 'Demo', 'Meeting', 'Note', 'Proposal Sent', 'Contract Sent') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    lead_id INT NULL,
    opportunity_id INT NULL,
    rep_id INT NOT NULL,
    sentiment ENUM('Positive', 'Neutral', 'Negative') DEFAULT 'Neutral',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_act_lead (lead_id),
    INDEX idx_act_opp (opportunity_id),
    INDEX idx_act_rep (rep_id),
    CONSTRAINT fk_act_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    CONSTRAINT fk_act_opp FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
    CONSTRAINT fk_act_rep FOREIGN KEY (rep_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 11. ML Model Performance Logs (Model Versioning & Audit Trail)
CREATE TABLE IF NOT EXISTS ml_training_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_name VARCHAR(80) NOT NULL,
    version VARCHAR(20) NOT NULL,
    samples_count INT NOT NULL,
    accuracy DECIMAL(6,4) NOT NULL,
    precision_score DECIMAL(6,4) NOT NULL,
    recall_score DECIMAL(6,4) NOT NULL,
    f1_score DECIMAL(6,4) NOT NULL,
    auc_roc DECIMAL(6,4) NOT NULL,
    hyperparameters JSON NULL,
    trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
