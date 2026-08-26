from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, JSON, Text, ForeignKey
from datetime import datetime
from .db import Base


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    firebase_uid = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default='citizen')
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Report(Base):
    __tablename__ = 'reports'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    road_id = Column(String, nullable=True)
    title = Column(String, nullable=True)
    description = Column(String, nullable=True)
    road_name = Column(String, nullable=True)
    latitude = Column(Float)
    longitude = Column(Float)
    city = Column(String, nullable=True)
    district = Column(String, nullable=True)
    state = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    weather = Column(String, nullable=True)
    weather_conditions = Column(String, nullable=True)
    device_info = Column(JSON, nullable=True)
    vehicle_speed = Column(Float, nullable=True)
    direction = Column(String, nullable=True)
    reported_at = Column(DateTime, nullable=True)
    report_source = Column(String, nullable=True)
    analysis_source = Column(String, nullable=True)
    satellite_verified = Column(Boolean, default=False)
    damage_type = Column(String, nullable=True)
    severity = Column(String, nullable=True)
    status = Column(String, default='reported')
    repair_priority = Column(String, nullable=True)
    damage_count = Column(Integer, nullable=True)
    pothole_count = Column(Integer, nullable=True)
    average_pothole_size = Column(Float, nullable=True)
    crack_length = Column(Float, nullable=True)
    damage_area = Column(Float, nullable=True)
    damage_length = Column(Float, nullable=True)
    damage_width = Column(Float, nullable=True)
    damage_depth = Column(Float, nullable=True)
    damage_percentage = Column(Float, nullable=True)
    road_health_index = Column(Float, nullable=True)
    predicted_failure_risk = Column(Float, nullable=True)
    repair_difficulty = Column(String, nullable=True)
    estimated_repair_cost = Column(Float, nullable=True)
    estimated_duration = Column(String, nullable=True)
    expected_completion_date = Column(DateTime, nullable=True)
    assigned_engineer = Column(String, nullable=True)
    assigned_contractor = Column(String, nullable=True)
    contractor_assignment = Column(String, nullable=True)
    engineer_verified = Column(Boolean, default=False)
    budget_utilization = Column(Float, nullable=True)
    material_estimates = Column(JSON, nullable=True)
    cost_breakdown = Column(JSON, nullable=True)
    audit_log = Column(JSON, nullable=True)
    files = Column(JSON, default=list)
    predictions = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # --- Contractor Response & Accepted Due Date System fields ---
    workflow_status = Column(String, default='reported', nullable=False,
                             comment='reported|contractor_notified|contractor_responded|date_accepted|in_progress|evidence_submitted|ai_analysis|official_verification|resolved|overdue|failed')
    accepted_deadline = Column(DateTime, nullable=True,
                               comment='The final accepted repair deadline after authority review')
    notification_sent_at = Column(DateTime, nullable=True,
                                  comment='When the contractor was first notified of the case')
    contractor_response_deadline = Column(DateTime, nullable=True,
                                          comment='Deadline for the contractor to submit a response')


class RoadProject(Base):
    """A completed road work package that can be monitored over its warranty."""
    __tablename__ = 'road_projects'
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, unique=True, index=True, nullable=False)
    road_name = Column(String, nullable=False)
    contractor_name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    completion_date = Column(DateTime, nullable=False)
    maintenance_end_date = Column(DateTime, nullable=False)
    baseline_damage_percentage = Column(Float, default=0.0)
    baseline_condition = Column(String, default='Healthy')
    created_at = Column(DateTime, default=datetime.utcnow)


class RoadInspection(Base):
    """An AI-assisted video inspection. Alerts are deliberately not final findings."""
    __tablename__ = 'road_inspections'
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, index=True, nullable=False)
    captured_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    video_filename = Column(String, nullable=True)
    evidence_images = Column(JSON, default=list)
    detections = Column(JSON, default=dict)
    damage_percentage = Column(Float, default=0.0)
    severity = Column(String, default='Healthy')
    condition_change = Column(Float, default=0.0)
    status = Column(String, default='Monitoring')
    requires_human_verification = Column(Boolean, default=False)
    alert_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ContractorResponse(Base):
    """A contractor's response to a road damage case, proposing a completion date and plan."""
    __tablename__ = 'contractor_responses'
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey('reports.id'), nullable=False, index=True)
    contractor_name = Column(String, nullable=False)
    expected_completion_date = Column(DateTime, nullable=False)
    repair_plan = Column(Text, nullable=False)
    reason_for_delay = Column(Text, nullable=True)
    estimated_work_duration = Column(String, nullable=True)
    response_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String, default='pending', nullable=False,
                    comment='pending|accepted|rejected|revision_requested')

    report = None  # set via relationship below


class AuthorityReview(Base):
    """An authority's review of a contractor's proposed completion date."""
    __tablename__ = 'authority_reviews'
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey('reports.id'), nullable=False, index=True)
    contractor_response_id = Column(Integer, ForeignKey('contractor_responses.id'), nullable=False, index=True)
    authority_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    decision = Column(String, nullable=False,
                      comment='accepted|rejected|revision_requested')
    accepted_deadline = Column(DateTime, nullable=True,
                               comment='The deadline accepted by the authority (may differ from contractor proposal)')
    notes = Column(Text, nullable=True)
    review_date = Column(DateTime, default=datetime.utcnow, nullable=False)


class CompletionEvidence(Base):
    """Evidence uploaded by the contractor to prove repair completion."""
    __tablename__ = 'completion_evidence'
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey('reports.id'), nullable=False, index=True)
    contractor_response_id = Column(Integer, ForeignKey('contractor_responses.id'), nullable=True, index=True)
    photos = Column(JSON, default=list, comment='List of photo filenames')
    video_filename = Column(String, nullable=True)
    completion_report = Column(Text, nullable=True)
    upload_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    ai_analysis_status = Column(String, default='pending', nullable=False,
                                comment='pending|analyzing|complete|failed')
    ai_analysis_result = Column(JSON, nullable=True)
    official_verification_status = Column(String, default='pending', nullable=False,
                                          comment='pending|verified|rejected')
    official_verification_notes = Column(Text, nullable=True)
    official_verifier_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    official_verification_date = Column(DateTime, nullable=True)


class EvidenceVideo(Base):
    """An AI-generated evidence/awareness video for a road damage case."""
    __tablename__ = 'evidence_videos'
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey('reports.id'), nullable=False, index=True)
    video_filename = Column(String, nullable=False)
    status = Column(String, default='generating', nullable=False,
                    comment='generating|ready|failed')
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    privacy_applied = Column(Boolean, default=False, nullable=False,
                             comment='Whether faces and plates have been blurred')
    moderator_approved = Column(Boolean, default=False, nullable=False)
    moderator_approved_at = Column(DateTime, nullable=True)
    moderator_notes = Column(Text, nullable=True)
    moderator_id = Column(Integer, ForeignKey('users.id'), nullable=True)


class SocialMediaPost(Base):
    """A record of an evidence video published to a social media platform."""
    __tablename__ = 'social_media_posts'
    id = Column(Integer, primary_key=True, index=True)
    evidence_video_id = Column(Integer, ForeignKey('evidence_videos.id'), nullable=False, index=True)
    report_id = Column(Integer, ForeignKey('reports.id'), nullable=False, index=True)
    platform = Column(String, nullable=False,
                      comment='youtube|instagram|facebook|x')
    status = Column(String, default='pending', nullable=False,
                    comment='pending|published|failed')
    published_at = Column(DateTime, nullable=True)
    post_url = Column(String, nullable=True)
    external_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Notification(Base):
    """An in-app notification for a user about a workflow event."""
    __tablename__ = 'notifications'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    report_id = Column(Integer, ForeignKey('reports.id'), nullable=True, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, nullable=False,
                  comment='contractor_assigned|contractor_responded|date_accepted|reminder|deadline_expired|evidence_submitted|verification_complete|video_ready|publish_approved')
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
