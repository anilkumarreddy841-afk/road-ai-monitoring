-- Smart Road Infrastructure Management System
-- PostgreSQL database schema
-- Run with: psql -U <user> -d <database> -f database_schema.sql

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    firebase_uid VARCHAR UNIQUE,
    hashed_password VARCHAR NOT NULL,
    full_name VARCHAR,
    role VARCHAR DEFAULT 'citizen',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    road_id VARCHAR,
    title VARCHAR,
    description TEXT,
    road_name VARCHAR,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    city VARCHAR,
    district VARCHAR,
    state VARCHAR,
    pincode VARCHAR,
    weather VARCHAR,
    weather_conditions VARCHAR,
    device_info JSONB,
    vehicle_speed DOUBLE PRECISION,
    direction VARCHAR,
    reported_at TIMESTAMP,
    report_source VARCHAR,
    analysis_source VARCHAR,
    satellite_verified BOOLEAN DEFAULT FALSE,
    damage_type VARCHAR,
    severity VARCHAR,
    status VARCHAR DEFAULT 'reported',
    repair_priority VARCHAR,
    damage_count INTEGER,
    pothole_count INTEGER,
    average_pothole_size DOUBLE PRECISION,
    crack_length DOUBLE PRECISION,
    damage_area DOUBLE PRECISION,
    damage_length DOUBLE PRECISION,
    damage_width DOUBLE PRECISION,
    damage_depth DOUBLE PRECISION,
    damage_percentage DOUBLE PRECISION,
    road_health_index DOUBLE PRECISION,
    predicted_failure_risk DOUBLE PRECISION,
    repair_difficulty VARCHAR,
    estimated_repair_cost DOUBLE PRECISION,
    estimated_duration VARCHAR,
    expected_completion_date TIMESTAMP,
    assigned_engineer VARCHAR,
    assigned_contractor VARCHAR,
    contractor_assignment VARCHAR,
    engineer_verified BOOLEAN DEFAULT FALSE,
    budget_utilization DOUBLE PRECISION,
    material_estimates JSONB,
    cost_breakdown JSONB,
    audit_log JSONB,
    files JSONB DEFAULT '[]'::jsonb,
    predictions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Contractor Response & Accepted Due Date System fields
    workflow_status VARCHAR DEFAULT 'reported' NOT NULL,
    accepted_deadline TIMESTAMP,
    notification_sent_at TIMESTAMP,
    contractor_response_deadline TIMESTAMP
);

CREATE TABLE IF NOT EXISTS road_projects (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR NOT NULL UNIQUE,
    road_name VARCHAR NOT NULL,
    contractor_name VARCHAR NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    completion_date TIMESTAMP NOT NULL,
    maintenance_end_date TIMESTAMP NOT NULL,
    baseline_damage_percentage DOUBLE PRECISION DEFAULT 0,
    baseline_condition VARCHAR DEFAULT 'Healthy',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS road_inspections (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR NOT NULL,
    captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    video_filename VARCHAR,
    evidence_images JSONB DEFAULT '[]'::jsonb,
    detections JSONB DEFAULT '{}'::jsonb,
    damage_percentage DOUBLE PRECISION DEFAULT 0,
    severity VARCHAR DEFAULT 'Healthy',
    condition_change DOUBLE PRECISION DEFAULT 0,
    status VARCHAR DEFAULT 'Monitoring',
    requires_human_verification BOOLEAN DEFAULT FALSE,
    alert_reason VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contractor Response & Accepted Due Date System tables

CREATE TABLE IF NOT EXISTS contractor_responses (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL,
    contractor_name VARCHAR NOT NULL,
    expected_completion_date TIMESTAMP NOT NULL,
    repair_plan TEXT NOT NULL,
    reason_for_delay TEXT,
    estimated_work_duration VARCHAR,
    response_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR DEFAULT 'pending' NOT NULL
);

CREATE TABLE IF NOT EXISTS authority_reviews (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL,
    contractor_response_id INTEGER NOT NULL,
    authority_user_id INTEGER NOT NULL,
    decision VARCHAR NOT NULL,
    accepted_deadline TIMESTAMP,
    notes TEXT,
    review_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS completion_evidence (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL,
    contractor_response_id INTEGER,
    photos JSONB DEFAULT '[]'::jsonb,
    video_filename VARCHAR,
    completion_report TEXT,
    upload_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ai_analysis_status VARCHAR DEFAULT 'pending' NOT NULL,
    ai_analysis_result JSONB,
    official_verification_status VARCHAR DEFAULT 'pending' NOT NULL,
    official_verification_notes TEXT,
    official_verifier_id INTEGER,
    official_verification_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evidence_videos (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL,
    video_filename VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'generating' NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    privacy_applied BOOLEAN DEFAULT FALSE NOT NULL,
    moderator_approved BOOLEAN DEFAULT FALSE NOT NULL,
    moderator_approved_at TIMESTAMP,
    moderator_notes TEXT,
    moderator_id INTEGER
);

CREATE TABLE IF NOT EXISTS social_media_posts (
    id SERIAL PRIMARY KEY,
    evidence_video_id INTEGER NOT NULL,
    report_id INTEGER NOT NULL,
    platform VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'pending' NOT NULL,
    published_at TIMESTAMP,
    post_url VARCHAR,
    external_id VARCHAR,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    report_id INTEGER,
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_road_id ON reports(road_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_severity ON reports(severity);
CREATE INDEX IF NOT EXISTS idx_reports_workflow_status ON reports(workflow_status);
CREATE INDEX IF NOT EXISTS idx_road_projects_project_id ON road_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_road_inspections_project_id ON road_inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_contractor_responses_report_id ON contractor_responses(report_id);
CREATE INDEX IF NOT EXISTS idx_authority_reviews_report_id ON authority_reviews(report_id);
CREATE INDEX IF NOT EXISTS idx_authority_reviews_contractor_response_id ON authority_reviews(contractor_response_id);
CREATE INDEX IF NOT EXISTS idx_completion_evidence_report_id ON completion_evidence(report_id);
CREATE INDEX IF NOT EXISTS idx_evidence_videos_report_id ON evidence_videos(report_id);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_evidence_video_id ON social_media_posts(evidence_video_id);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_report_id ON social_media_posts(report_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_report_id ON notifications(report_id);

-- Optional sample data
-- INSERT INTO users (email, hashed_password, full_name, role) VALUES
-- ('admin@smartroad.local', 'hashed_password_here', 'System Admin', 'admin');
--
-- INSERT INTO reports (user_id, road_id, title, description, road_name, latitude, longitude, city, district, state, severity, status)
-- VALUES (1, 'RD-001', 'Pothole near school zone', 'Large pothole observed on main road', 'Main Road', 12.9716, 77.5946, 'Bengaluru', 'Bengaluru Urban', 'Karnataka', 'major', 'reported');
