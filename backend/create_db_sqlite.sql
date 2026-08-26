-- SQLite database creation script
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    firebase_uid TEXT UNIQUE,
    hashed_password TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'citizen',
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    road_id TEXT,
    title TEXT,
    description TEXT,
    road_name TEXT,
    latitude REAL,
    longitude REAL,
    city TEXT,
    district TEXT,
    state TEXT,
    pincode TEXT,
    weather TEXT,
    weather_conditions TEXT,
    device_info TEXT,
    vehicle_speed REAL,
    direction TEXT,
    reported_at TIMESTAMP,
    report_source TEXT,
    analysis_source TEXT,
    satellite_verified BOOLEAN DEFAULT 0,
    damage_type TEXT,
    severity TEXT,
    status TEXT DEFAULT 'reported',
    repair_priority TEXT,
    damage_count INTEGER,
    pothole_count INTEGER,
    average_pothole_size REAL,
    crack_length REAL,
    damage_area REAL,
    damage_length REAL,
    damage_width REAL,
    damage_depth REAL,
    damage_percentage REAL,
    road_health_index REAL,
    predicted_failure_risk REAL,
    repair_difficulty TEXT,
    estimated_repair_cost REAL,
    estimated_duration TEXT,
    expected_completion_date TIMESTAMP,
    assigned_engineer TEXT,
    assigned_contractor TEXT,
    contractor_assignment TEXT,
    engineer_verified BOOLEAN DEFAULT 0,
    budget_utilization REAL,
    material_estimates TEXT,
    cost_breakdown TEXT,
    audit_log TEXT,
    files TEXT DEFAULT '[]',
    predictions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Contractor Response & Accepted Due Date System fields
    workflow_status TEXT DEFAULT 'reported' NOT NULL,
    accepted_deadline TIMESTAMP,
    notification_sent_at TIMESTAMP,
    contractor_response_deadline TIMESTAMP
);

CREATE TABLE IF NOT EXISTS road_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL UNIQUE,
    road_name TEXT NOT NULL,
    contractor_name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    completion_date TIMESTAMP NOT NULL,
    maintenance_end_date TIMESTAMP NOT NULL,
    baseline_damage_percentage REAL DEFAULT 0,
    baseline_condition TEXT DEFAULT 'Healthy',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS road_inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    video_filename TEXT,
    evidence_images TEXT DEFAULT '[]',
    detections TEXT DEFAULT '{}',
    damage_percentage REAL DEFAULT 0,
    severity TEXT DEFAULT 'Healthy',
    condition_change REAL DEFAULT 0,
    status TEXT DEFAULT 'Monitoring',
    requires_human_verification BOOLEAN DEFAULT 0,
    alert_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contractor Response & Accepted Due Date System tables

CREATE TABLE IF NOT EXISTS contractor_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    contractor_name TEXT NOT NULL,
    expected_completion_date TIMESTAMP NOT NULL,
    repair_plan TEXT NOT NULL,
    reason_for_delay TEXT,
    estimated_work_duration TEXT,
    response_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending' NOT NULL
);

CREATE TABLE IF NOT EXISTS authority_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    contractor_response_id INTEGER NOT NULL,
    authority_user_id INTEGER NOT NULL,
    decision TEXT NOT NULL,
    accepted_deadline TIMESTAMP,
    notes TEXT,
    review_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS completion_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    contractor_response_id INTEGER,
    photos TEXT DEFAULT '[]',
    video_filename TEXT,
    completion_report TEXT,
    upload_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ai_analysis_status TEXT DEFAULT 'pending' NOT NULL,
    ai_analysis_result TEXT,
    official_verification_status TEXT DEFAULT 'pending' NOT NULL,
    official_verification_notes TEXT,
    official_verifier_id INTEGER,
    official_verification_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evidence_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    video_filename TEXT NOT NULL,
    status TEXT DEFAULT 'generating' NOT NULL,
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    privacy_applied BOOLEAN DEFAULT 0 NOT NULL,
    moderator_approved BOOLEAN DEFAULT 0 NOT NULL,
    moderator_approved_at TIMESTAMP,
    moderator_notes TEXT,
    moderator_id INTEGER
);

CREATE TABLE IF NOT EXISTS social_media_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_video_id INTEGER NOT NULL,
    report_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    published_at TIMESTAMP,
    post_url TEXT,
    external_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    report_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0 NOT NULL,
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
