from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app import models

router = APIRouter()
DAMAGE_ALERT_THRESHOLD = 15.0


class ProjectIn(BaseModel):
    project_id: str
    road_name: str
    contractor_name: str
    latitude: float
    longitude: float
    completion_date: datetime
    maintenance_end_date: datetime
    baseline_damage_percentage: float = Field(default=0, ge=0, le=100)
    baseline_condition: str = 'Healthy'


class InspectionIn(BaseModel):
    project_id: str
    latitude: float
    longitude: float
    captured_at: datetime | None = None
    video_filename: str | None = None
    evidence_images: list[str] = []
    detections: dict = {}
    damage_percentage: float = Field(ge=0, le=100)
    severity: str = 'Minor'


def project_out(project):
    return {
        'project_id': project.project_id, 'road_name': project.road_name,
        'contractor_name': project.contractor_name, 'latitude': project.latitude,
        'longitude': project.longitude, 'completion_date': project.completion_date,
        'maintenance_end_date': project.maintenance_end_date,
        'baseline_damage_percentage': project.baseline_damage_percentage,
        'baseline_condition': project.baseline_condition,
    }


@router.post('/projects')
def create_project(payload: ProjectIn, db: Session = Depends(get_db)):
    if db.query(models.RoadProject).filter_by(project_id=payload.project_id).first():
        raise HTTPException(409, 'A project with this Project ID already exists')
    project = models.RoadProject(**payload.dict())
    db.add(project); db.commit(); db.refresh(project)
    return project_out(project)


@router.post('/inspections')
def record_inspection(payload: InspectionIn, db: Session = Depends(get_db)):
    project = db.query(models.RoadProject).filter_by(project_id=payload.project_id).first()
    if not project:
        raise HTTPException(404, 'Road project not found')
    captured_at = payload.captured_at or datetime.utcnow()
    increase = round(payload.damage_percentage - (project.baseline_damage_percentage or 0), 2)
    in_maintenance = captured_at <= project.maintenance_end_date
    # A material increase is an inspection alert even when an AI severity label is
    # conservative. The alert is never a final contractual finding: an authority
    # must verify the video/image evidence before action is taken.
    alert = increase > DAMAGE_ALERT_THRESHOLD and in_maintenance
    status = 'CONTRACTOR PERFORMANCE ALERT' if alert else 'Monitoring'
    reason = ('AI inspection indicates material road deterioration within the maintenance period; '
              'authority inspection is required before any contractual or legal decision.') if alert else None
    inspection = models.RoadInspection(
        **payload.dict(exclude={'captured_at'}), captured_at=captured_at,
        condition_change=increase, status=status, requires_human_verification=alert,
        alert_reason=reason,
    )
    db.add(inspection); db.commit(); db.refresh(inspection)
    return inspection_out(inspection, project)


def inspection_out(inspection, project):
    return {
        'id': inspection.id, 'project': project_out(project), 'captured_at': inspection.captured_at,
        'video_filename': inspection.video_filename, 'evidence_images': inspection.evidence_images or [],
        'detections': inspection.detections or {}, 'damage_percentage': inspection.damage_percentage,
        'severity': inspection.severity, 'condition_change': inspection.condition_change,
        'status': inspection.status, 'requires_human_verification': inspection.requires_human_verification,
        'alert_reason': inspection.alert_reason,
    }


@router.get('/dashboard')
def dashboard(db: Session = Depends(get_db)):
    projects = db.query(models.RoadProject).all()
    inspections = db.query(models.RoadInspection).order_by(models.RoadInspection.captured_at.desc()).all()
    project_by_id = {p.project_id: p for p in projects}
    latest = {}
    for inspection in inspections:
        latest.setdefault(inspection.project_id, inspection)
    latest_items = [inspection_out(item, project_by_id[item.project_id]) for item in latest.values() if item.project_id in project_by_id]
    conditions = [x['severity'].lower() for x in latest_items]
    return {
        'threshold_percentage': DAMAGE_ALERT_THRESHOLD,
        'total_roads_monitored': len(projects),
        'healthy_roads': sum(1 for x in conditions if x in {'healthy', 'none'}),
        'minor_damage': sum(1 for x in conditions if x in {'minor', 'moderate'}),
        'severe_damage': sum(1 for x in conditions if x in {'major', 'severe', 'critical'}),
        'contractors_with_alerts': len({x['project']['contractor_name'] for x in latest_items if x['status'] == 'CONTRACTOR PERFORMANCE ALERT'}),
        'inspections': latest_items,
    }
