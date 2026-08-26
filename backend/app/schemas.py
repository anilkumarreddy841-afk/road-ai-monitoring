from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = 'citizen'


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str = 'bearer'


class ReportCreate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    road_id: Optional[str] = None
    road_name: Optional[str] = None
    latitude: float
    longitude: float
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    weather: Optional[str] = None
    weather_conditions: Optional[str] = None
    device_info: Optional[dict] = None
    report_source: Optional[str] = None
    analysis_source: Optional[str] = None
    satellite_verified: Optional[bool] = None
    vehicle_speed: Optional[float] = None
    direction: Optional[str] = None
    reported_at: Optional[datetime] = None
    damage_type: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    repair_priority: Optional[str] = None
    damage_count: Optional[int] = None
    pothole_count: Optional[int] = None
    average_pothole_size: Optional[float] = None
    crack_length: Optional[float] = None
    damage_area: Optional[float] = None
    damage_length: Optional[float] = None
    damage_width: Optional[float] = None
    damage_depth: Optional[float] = None
    damage_percentage: Optional[float] = None
    road_health_index: Optional[float] = None
    predicted_failure_risk: Optional[float] = None
    repair_difficulty: Optional[str] = None
    estimated_repair_cost: Optional[float] = None
    estimated_duration: Optional[str] = None
    expected_completion_date: Optional[datetime] = None
    assigned_engineer: Optional[str] = None
    assigned_contractor: Optional[str] = None
    contractor_assignment: Optional[str] = None
    engineer_verified: Optional[bool] = None
    budget_utilization: Optional[float] = None
    material_estimates: Optional[dict] = None
    cost_breakdown: Optional[dict] = None


class ReportOut(BaseModel):
    id: int
    road_id: Optional[str]
    title: Optional[str]
    description: Optional[str]
    road_name: Optional[str]
    latitude: float
    longitude: float
    city: Optional[str]
    district: Optional[str]
    state: Optional[str]
    pincode: Optional[str]
    weather: Optional[str]
    weather_conditions: Optional[str]
    device_info: Optional[dict] = None
    report_source: Optional[str] = None
    analysis_source: Optional[str] = None
    satellite_verified: Optional[bool] = None
    vehicle_speed: Optional[float] = None
    direction: Optional[str] = None
    reported_at: Optional[datetime] = None
    damage_type: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    repair_priority: Optional[str] = None
    damage_count: Optional[int] = None
    pothole_count: Optional[int] = None
    average_pothole_size: Optional[float] = None
    crack_length: Optional[float] = None
    damage_area: Optional[float] = None
    damage_length: Optional[float] = None
    damage_width: Optional[float] = None
    damage_depth: Optional[float] = None
    damage_percentage: Optional[float] = None
    road_health_index: Optional[float] = None
    predicted_failure_risk: Optional[float] = None
    repair_difficulty: Optional[str] = None
    estimated_repair_cost: Optional[float] = None
    estimated_duration: Optional[str] = None
    expected_completion_date: Optional[datetime] = None
    assigned_engineer: Optional[str] = None
    assigned_contractor: Optional[str] = None
    contractor_assignment: Optional[str] = None
    engineer_verified: Optional[bool] = None
    budget_utilization: Optional[float] = None
    material_estimates: Optional[dict] = None
    cost_breakdown: Optional[dict] = None
    files: Optional[list[str]] = None
    predictions: Optional[dict] = None
    created_at: datetime
    last_updated: Optional[datetime] = None

    # Contractor Response & Accepted Due Date System fields
    workflow_status: Optional[str] = 'reported'
    accepted_deadline: Optional[datetime] = None
    notification_sent_at: Optional[datetime] = None
    contractor_response_deadline: Optional[datetime] = None

    class Config:
        orm_mode = True


# ---------------------------------------------------------------------------
# Contractor Response & Accepted Due Date System — Schemas
# ---------------------------------------------------------------------------

class ContractorResponseCreate(BaseModel):
    expected_completion_date: datetime
    repair_plan: str
    reason_for_delay: Optional[str] = None
    estimated_work_duration: Optional[str] = None


class ContractorResponseOut(BaseModel):
    id: int
    report_id: int
    contractor_name: str
    expected_completion_date: datetime
    repair_plan: str
    reason_for_delay: Optional[str] = None
    estimated_work_duration: Optional[str] = None
    response_date: datetime
    status: str

    class Config:
        orm_mode = True


class AuthorityReviewCreate(BaseModel):
    decision: str = Field(..., description='accepted|rejected|revision_requested')
    accepted_deadline: Optional[datetime] = None
    notes: Optional[str] = None


class AuthorityReviewOut(BaseModel):
    id: int
    report_id: int
    contractor_response_id: int
    authority_user_id: int
    decision: str
    accepted_deadline: Optional[datetime] = None
    notes: Optional[str] = None
    review_date: datetime

    class Config:
        orm_mode = True


class CompletionEvidenceCreate(BaseModel):
    completion_report: Optional[str] = None


class CompletionEvidenceOut(BaseModel):
    id: int
    report_id: int
    contractor_response_id: Optional[int] = None
    photos: List[str] = []
    video_filename: Optional[str] = None
    completion_report: Optional[str] = None
    upload_date: datetime
    ai_analysis_status: str
    ai_analysis_result: Optional[dict] = None
    official_verification_status: str
    official_verification_notes: Optional[str] = None
    official_verifier_id: Optional[int] = None
    official_verification_date: Optional[datetime] = None

    class Config:
        orm_mode = True


class EvidenceVideoOut(BaseModel):
    id: int
    report_id: int
    video_filename: str
    status: str
    generated_at: datetime
    privacy_applied: bool
    moderator_approved: bool
    moderator_approved_at: Optional[datetime] = None
    moderator_notes: Optional[str] = None
    moderator_id: Optional[int] = None

    class Config:
        orm_mode = True


class SocialMediaPostCreate(BaseModel):
    platform: str = Field(..., description='youtube|instagram|facebook|x')


class SocialMediaPostOut(BaseModel):
    id: int
    evidence_video_id: int
    report_id: int
    platform: str
    status: str
    published_at: Optional[datetime] = None
    post_url: Optional[str] = None
    external_id: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True


class NotificationOut(BaseModel):
    id: int
    user_id: int
    report_id: Optional[int] = None
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        orm_mode = True


class WorkflowDetailOut(BaseModel):
    """Aggregated workflow detail for a single report."""
    report: ReportOut
    contractor_response: Optional[ContractorResponseOut] = None
    authority_review: Optional[AuthorityReviewOut] = None
    completion_evidence: Optional[CompletionEvidenceOut] = None
    evidence_video: Optional[EvidenceVideoOut] = None
    social_media_posts: List[SocialMediaPostOut] = []
    notifications: List[NotificationOut] = []

    class Config:
        orm_mode = True
