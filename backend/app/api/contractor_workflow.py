"""
Contractor Response & Accepted Due Date System API.

Endpoints:
  - GET  /api/workflow/reports               List reports in workflow (role-filtered)
  - GET  /api/workflow/{report_id}           Get full workflow detail for a case
  - POST /api/workflow/{report_id}/notify    Notify contractor (engineer/admin)
  - POST /api/workflow/{report_id}/respond   Contractor submits response
  - POST /api/workflow/{report_id}/review    Authority reviews proposed date
  - POST /api/workflow/{report_id}/evidence  Contractor uploads completion evidence
  - POST /api/workflow/{report_id}/verify    Official verification of evidence
  - POST /api/workflow/{report_id}/generate-video  Generate AI evidence video
  - POST /api/workflow/{report_id}/publish   Approve & publish to social media
  - GET  /api/workflow/notifications         Get user's notifications
  - POST /api/workflow/notifications/{id}/read  Mark notification as read
  - GET  /api/workflow/reminders             Check deadlines (internal/cron)
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import os
import json
import aiofiles
import httpx

from app.db import get_db
from app.deps import get_current_user, require_role
from app import crud, schemas, models

router = APIRouter()

UPLOAD_DIR = os.path.join(os.getcwd(), 'backend', 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

VALID_WORKFLOW_STATUSES = {
    'reported', 'contractor_notified', 'contractor_responded', 'date_accepted',
    'in_progress', 'evidence_submitted', 'ai_analysis', 'official_verification',
    'resolved', 'overdue', 'failed',
}


def _report_to_dict(report: models.Report):
    """Serialize a Report model to a dict matching the existing reports API shape."""
    return {
        'id': report.id,
        'road_id': report.road_id,
        'title': report.title,
        'description': report.description,
        'road_name': report.road_name,
        'latitude': report.latitude,
        'longitude': report.longitude,
        'city': report.city,
        'district': report.district,
        'state': report.state,
        'pincode': report.pincode,
        'weather': report.weather,
        'weather_conditions': report.weather_conditions,
        'device_info': report.device_info,
        'report_source': report.report_source,
        'analysis_source': report.analysis_source,
        'satellite_verified': report.satellite_verified,
        'vehicle_speed': report.vehicle_speed,
        'direction': report.direction,
        'reported_at': report.reported_at,
        'damage_type': report.damage_type,
        'severity': report.severity,
        'status': report.status,
        'repair_priority': report.repair_priority,
        'damage_count': report.damage_count,
        'pothole_count': report.pothole_count,
        'average_pothole_size': report.average_pothole_size,
        'crack_length': report.crack_length,
        'damage_area': report.damage_area,
        'damage_length': report.damage_length,
        'damage_width': report.damage_width,
        'damage_depth': report.damage_depth,
        'damage_percentage': report.damage_percentage,
        'road_health_index': report.road_health_index,
        'predicted_failure_risk': report.predicted_failure_risk,
        'repair_difficulty': report.repair_difficulty,
        'estimated_repair_cost': report.estimated_repair_cost,
        'estimated_duration': report.estimated_duration,
        'expected_completion_date': report.expected_completion_date,
        'assigned_engineer': report.assigned_engineer,
        'assigned_contractor': report.assigned_contractor,
        'contractor_assignment': report.contractor_assignment,
        'engineer_verified': report.engineer_verified,
        'budget_utilization': report.budget_utilization,
        'material_estimates': report.material_estimates or {},
        'cost_breakdown': report.cost_breakdown or {},
        'files': report.files or [],
        'predictions': report.predictions or {},
        'created_at': report.created_at,
        'last_updated': report.last_updated,
        'workflow_status': report.workflow_status,
        'accepted_deadline': report.accepted_deadline,
        'notification_sent_at': report.notification_sent_at,
        'contractor_response_deadline': report.contractor_response_deadline,
    }


def _response_to_dict(resp: models.ContractorResponse):
    return {
        'id': resp.id,
        'report_id': resp.report_id,
        'contractor_name': resp.contractor_name,
        'expected_completion_date': resp.expected_completion_date,
        'repair_plan': resp.repair_plan,
        'reason_for_delay': resp.reason_for_delay,
        'estimated_work_duration': resp.estimated_work_duration,
        'response_date': resp.response_date,
        'status': resp.status,
    }


def _review_to_dict(review: models.AuthorityReview):
    return {
        'id': review.id,
        'report_id': review.report_id,
        'contractor_response_id': review.contractor_response_id,
        'authority_user_id': review.authority_user_id,
        'decision': review.decision,
        'accepted_deadline': review.accepted_deadline,
        'notes': review.notes,
        'review_date': review.review_date,
    }


def _evidence_to_dict(ev: models.CompletionEvidence):
    return {
        'id': ev.id,
        'report_id': ev.report_id,
        'contractor_response_id': ev.contractor_response_id,
        'photos': ev.photos or [],
        'video_filename': ev.video_filename,
        'completion_report': ev.completion_report,
        'upload_date': ev.upload_date,
        'ai_analysis_status': ev.ai_analysis_status,
        'ai_analysis_result': ev.ai_analysis_result,
        'official_verification_status': ev.official_verification_status,
        'official_verification_notes': ev.official_verification_notes,
        'official_verifier_id': ev.official_verifier_id,
        'official_verification_date': ev.official_verification_date,
    }


def _video_to_dict(v: models.EvidenceVideo):
    return {
        'id': v.id,
        'report_id': v.report_id,
        'video_filename': v.video_filename,
        'status': v.status,
        'generated_at': v.generated_at,
        'privacy_applied': v.privacy_applied,
        'moderator_approved': v.moderator_approved,
        'moderator_approved_at': v.moderator_approved_at,
        'moderator_notes': v.moderator_notes,
        'moderator_id': v.moderator_id,
    }


def _post_to_dict(p: models.SocialMediaPost):
    return {
        'id': p.id,
        'evidence_video_id': p.evidence_video_id,
        'report_id': p.report_id,
        'platform': p.platform,
        'status': p.status,
        'published_at': p.published_at,
        'post_url': p.post_url,
        'external_id': p.external_id,
        'created_at': p.created_at,
    }


def _notif_to_dict(n: models.Notification):
    return {
        'id': n.id,
        'user_id': n.user_id,
        'report_id': n.report_id,
        'title': n.title,
        'message': n.message,
        'type': n.type,
        'is_read': n.is_read,
        'created_at': n.created_at,
    }


# ---------------------------------------------------------------------------
# List & Detail
# ---------------------------------------------------------------------------

@router.get('/reports', summary='List reports in the contractor workflow')
def list_workflow_reports(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """List reports relevant to the current user's role in the workflow."""
    if user.role == 'contractor':
        reports = crud.get_reports_for_contractor(db, user.email)
    elif user.role in ('government', 'finance', 'admin'):
        reports = crud.get_reports_for_authority(db)
    elif user.role == 'engineer':
        reports = crud.get_reports_for_authority(db)
    else:
        # citizen — only see their own reports
        reports = db.query(models.Report).filter(models.Report.user_id == user.id).all()

    return [_report_to_dict(r) for r in reports]


@router.get('/{report_id}', summary='Get full workflow detail for a case')
def get_workflow_detail(
    report_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    detail = crud.get_workflow_detail(db, report_id)
    if not detail:
        raise HTTPException(status_code=404, detail='Report not found')

    report = detail['report']
    # Permission check: contractor can only see their assigned reports,
    # citizen can only see their own reports
    if user.role == 'contractor' and report.assigned_contractor != user.email:
        raise HTTPException(status_code=403, detail='Not assigned to this case')
    if user.role == 'citizen' and report.user_id != user.id:
        raise HTTPException(status_code=403, detail='Not your report')

    return {
        'report': _report_to_dict(report),
        'contractor_response': _response_to_dict(detail['contractor_response']) if detail['contractor_response'] else None,
        'authority_review': _review_to_dict(detail['authority_review']) if detail['authority_review'] else None,
        'completion_evidence': _evidence_to_dict(detail['completion_evidence']) if detail['completion_evidence'] else None,
        'evidence_video': _video_to_dict(detail['evidence_video']) if detail['evidence_video'] else None,
        'social_media_posts': [_post_to_dict(p) for p in detail['social_media_posts']],
        'notifications': [_notif_to_dict(n) for n in detail['notifications']],
    }


# ---------------------------------------------------------------------------
# Contractor Notification
# ---------------------------------------------------------------------------

class NotifyIn(BaseModel):
    response_deadline_days: int = Field(default=3, ge=1, le=14,
                                         description='Days the contractor has to respond')


@router.post('/{report_id}/notify', summary='Notify contractor of a new case')
def notify_contractor(
    report_id: int,
    payload: NotifyIn,
    db: Session = Depends(get_db),
    user=Depends(require_role(['engineer', 'admin'])),
):
    report = crud.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')
    if not report.assigned_contractor:
        raise HTTPException(status_code=400, detail='Report has no assigned contractor')

    report = crud.notify_contractor(db, report, response_deadline_days=payload.response_deadline_days)
    return {'message': 'Contractor notified', 'workflow_status': report.workflow_status,
            'response_deadline': report.contractor_response_deadline}


# ---------------------------------------------------------------------------
# Contractor Response
# ---------------------------------------------------------------------------

@router.post('/{report_id}/respond', summary='Contractor submits response with proposed completion date')
def submit_contractor_response(
    report_id: int,
    payload: schemas.ContractorResponseCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role(['contractor'])),
):
    report = crud.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')
    if report.assigned_contractor != user.email:
        raise HTTPException(status_code=403, detail='This case is not assigned to you')
    if report.workflow_status != 'contractor_notified':
        raise HTTPException(status_code=400,
                            detail=f'Cannot respond: case is in "{report.workflow_status}" state')

    response = crud.create_contractor_response(
        db, report_id, user.full_name or user.email,
        payload.expected_completion_date, payload.repair_plan,
        payload.reason_for_delay, payload.estimated_work_duration,
    )
    return {'message': 'Response submitted', 'response': _response_to_dict(response)}


# ---------------------------------------------------------------------------
# Authority Review
# ---------------------------------------------------------------------------

@router.post('/{report_id}/review', summary='Authority reviews contractor proposed date')
def review_contractor_date(
    report_id: int,
    payload: schemas.AuthorityReviewCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role(['government', 'finance', 'admin'])),
):
    report = crud.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')
    if report.workflow_status != 'contractor_responded':
        raise HTTPException(status_code=400,
                            detail=f'Cannot review: case is in "{report.workflow_status}" state')

    contractor_response = crud.get_contractor_response_by_report(db, report_id)
    if not contractor_response:
        raise HTTPException(status_code=404, detail='No contractor response found')

    # Validate decision
    if payload.decision not in ('accepted', 'rejected', 'revision_requested'):
        raise HTTPException(status_code=400, detail='Invalid decision')

    # If accepted, accepted_deadline is required
    accepted_deadline = payload.accepted_deadline
    if payload.decision == 'accepted' and not accepted_deadline:
        accepted_deadline = payload.expected_completion_date if hasattr(payload, 'expected_completion_date') else None
    if payload.decision == 'accepted' and not accepted_deadline:
        raise HTTPException(status_code=400, detail='accepted_deadline is required when decision is accepted')

    review = crud.create_authority_review(
        db, report_id, contractor_response.id, user.id,
        payload.decision, accepted_deadline, payload.notes,
    )
    return {'message': 'Review recorded', 'review': _review_to_dict(review),
            'workflow_status': report.workflow_status}


# ---------------------------------------------------------------------------
# Completion Evidence Upload
# ---------------------------------------------------------------------------

@router.post('/{report_id}/evidence', summary='Contractor uploads completion evidence')
async def upload_completion_evidence(
    report_id: int,
    completion_report: str = Form(None),
    photos: List[UploadFile] = File([]),
    video: UploadFile = File(None),
    db: Session = Depends(get_db),
    user=Depends(require_role(['contractor'])),
):
    report = crud.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')
    if report.assigned_contractor != user.email:
        raise HTTPException(status_code=403, detail='This case is not assigned to you')
    if report.workflow_status not in ('date_accepted', 'in_progress'):
        raise HTTPException(status_code=400,
                            detail=f'Cannot upload evidence: case is in "{report.workflow_status}" state')

    # Save uploaded files
    saved_photos = []
    for f in photos:
        dest = os.path.join(UPLOAD_DIR, f'evidence_{report_id}_{f.filename}')
        async with aiofiles.open(dest, 'wb') as out_file:
            content = await f.read()
            await out_file.write(content)
        saved_photos.append(os.path.basename(dest))

    video_filename = None
    if video:
        dest = os.path.join(UPLOAD_DIR, f'evidence_{report_id}_{video.filename}')
        async with aiofiles.open(dest, 'wb') as out_file:
            content = await video.read()
            await out_file.write(content)
        video_filename = os.path.basename(dest)

    contractor_response = crud.get_contractor_response_by_report(db, report_id)
    evidence = crud.create_completion_evidence(
        db, report_id,
        contractor_response.id if contractor_response else None,
        saved_photos, video_filename, completion_report,
    )

    # Trigger AI analysis of the evidence (before/after comparison)
    ai_url = os.getenv('AI_SERVICE_URL')
    if ai_url and video_filename:
        try:
            async with httpx.AsyncClient() as client:
                video_path = os.path.join(UPLOAD_DIR, video_filename)
                with open(video_path, 'rb') as vf:
                    files_payload = [('video', (video_filename, vf, 'video/mp4'))]
                    # Also send original report files for before/after comparison
                    for fname in (report.files or []):
                        fpath = os.path.join(UPLOAD_DIR, fname)
                        if os.path.exists(fpath):
                            files_payload.append(('before_files', (fname, open(fpath, 'rb'), 'image/jpeg')))
                    resp = await client.post(
                        ai_url.replace('/predict', '/compare-videos'),
                        files=files_payload, timeout=60.0,
                    )
                    if resp.status_code == 200:
                        ai_result = resp.json()
                        crud.update_evidence_ai_analysis(db, evidence.id, 'complete', ai_result)
                    else:
                        crud.update_evidence_ai_analysis(db, evidence.id, 'failed',
                                                         {'error': f'AI service returned {resp.status_code}'})
        except Exception:
            crud.update_evidence_ai_analysis(db, evidence.id, 'failed',
                                             {'error': 'AI service unavailable'})
        finally:
            for _, file_tuple in files_payload:
                file_tuple[1].close()
    else:
        crud.update_evidence_ai_analysis(db, evidence.id, 'complete',
                                         {'message': 'No video provided for AI comparison; analysis skipped.'})

    return {'message': 'Evidence submitted', 'evidence': _evidence_to_dict(evidence)}


# ---------------------------------------------------------------------------
# Official Verification
# ---------------------------------------------------------------------------

class VerifyIn(BaseModel):
    status: str = Field(..., description='verified|rejected')
    notes: Optional[str] = None


@router.post('/{report_id}/verify', summary='Official verification of completion evidence')
def verify_evidence(
    report_id: int,
    payload: VerifyIn,
    db: Session = Depends(get_db),
    user=Depends(require_role(['engineer', 'government', 'admin'])),
):
    report = crud.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')
    if payload.status not in ('verified', 'rejected'):
        raise HTTPException(status_code=400, detail='Invalid verification status')

    evidence = crud.get_completion_evidence(db, report_id)
    if not evidence:
        raise HTTPException(status_code=404, detail='No completion evidence found')

    evidence = crud.verify_evidence(db, evidence.id, user.id, payload.status, payload.notes)
    return {'message': 'Evidence verified', 'evidence': _evidence_to_dict(evidence),
            'workflow_status': report.workflow_status}


# ---------------------------------------------------------------------------
# AI Evidence Video Generation
# ---------------------------------------------------------------------------

@router.post('/{report_id}/generate-video', summary='Generate AI evidence video')
async def generate_evidence_video(
    report_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role(['engineer', 'government', 'admin'])),
):
    report = crud.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')
    if report.workflow_status not in ('official_verification', 'resolved'):
        raise HTTPException(status_code=400,
                            detail=f'Cannot generate video: case is in "{report.workflow_status}" state')

    evidence = crud.get_completion_evidence(db, report_id)
    if not evidence:
        raise HTTPException(status_code=404, detail='No completion evidence found')

    # Create evidence video record
    video_filename = f'evidence_video_{report_id}_{int(datetime.utcnow().timestamp())}.mp4'
    video = crud.create_evidence_video(db, report_id, video_filename)

    # Call AI service to generate the video
    ai_url = os.getenv('AI_SERVICE_URL')
    if ai_url:
        try:
            async with httpx.AsyncClient() as client:
                # Build the payload for the AI service
                payload = {
                    'case_id': report.id,
                    'road_name': report.road_name,
                    'damage_type': report.damage_type,
                    'severity': report.severity,
                    'date_reported': report.created_at.isoformat() if report.created_at else None,
                    'contractor_response': _response_to_dict(evidence.contractor_response) if evidence.contractor_response else None,
                    'authority_review': None,
                    'accepted_deadline': report.accepted_deadline.isoformat() if report.accepted_deadline else None,
                    'current_status': report.workflow_status,
                    'before_files': report.files or [],
                    'after_video': evidence.video_filename,
                    'after_photos': evidence.photos or [],
                    'disclaimer': 'This case status is subject to official review.',
                }
                resp = await client.post(
                    ai_url.replace('/predict', '/generate-evidence-video'),
                    json=payload, timeout=120.0,
                )
                if resp.status_code == 200:
                    result = resp.json()
                    crud.update_evidence_video(
                        db, video.id,
                        status='ready',
                        privacy_applied=result.get('privacy_applied', True),
                    )
                    # Notify moderator/admin
                    for role in ['government', 'admin']:
                        for u in crud.get_users_by_role(db, role):
                            crud.create_notification(
                                db, u.id,
                                'Evidence Video Ready for Review',
                                f'An evidence video has been generated for case #{report_id}. Please review and approve for public release.',
                                'video_ready',
                                report_id=report_id,
                            )
                    return {'message': 'Video generated', 'video': _video_to_dict(video),
                            'ai_result': result}
                else:
                    crud.update_evidence_video(db, video.id, status='failed')
                    return {'message': 'Video generation failed', 'video': _video_to_dict(video),
                            'error': f'AI service returned {resp.status_code}'}
        except Exception as e:
            crud.update_evidence_video(db, video.id, status='failed')
            return {'message': 'Video generation failed', 'video': _video_to_dict(video),
                    'error': str(e)}
    else:
        # No AI service configured — mark as ready with stub
        crud.update_evidence_video(db, video.id, status='ready', privacy_applied=True)
        return {'message': 'Video generated (stub - no AI service)', 'video': _video_to_dict(video)}


# ---------------------------------------------------------------------------
# Social Media Publishing
# ---------------------------------------------------------------------------

class PublishIn(BaseModel):
    platforms: List[str] = Field(..., description='List of platforms: youtube, instagram, facebook, x')


@router.post('/{report_id}/publish', summary='Approve and publish evidence video to social media')
def publish_to_social_media(
    report_id: int,
    payload: PublishIn,
    db: Session = Depends(get_db),
    user=Depends(require_role(['government', 'admin'])),
):
    report = crud.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail='Report not found')

    video = crud.get_evidence_video(db, report_id)
    if not video:
        raise HTTPException(status_code=404, detail='No evidence video found')
    if not video.moderator_approved:
        raise HTTPException(status_code=400, detail='Video must be approved by a moderator first')

    valid_platforms = {'youtube', 'instagram', 'facebook', 'x'}
    invalid = [p for p in payload.platforms if p not in valid_platforms]
    if invalid:
        raise HTTPException(status_code=400, detail=f'Invalid platforms: {invalid}')

    results = []
    for platform in payload.platforms:
        post = crud.create_social_media_post(db, video.id, report_id, platform)
        # Stub: simulate publishing
        crud.update_social_media_post(
            db, post.id, 'published',
            post_url=f'https://{platform}.com/posts/stub_{report_id}_{int(datetime.utcnow().timestamp())}',
            external_id=f'ext_{report_id}_{platform}',
        )
        results.append(_post_to_dict(post))

    return {'message': 'Published to social media', 'posts': results}


# ---------------------------------------------------------------------------
# Moderator Approval
# ---------------------------------------------------------------------------

class ModeratorApprovalIn(BaseModel):
    approved: bool
    notes: Optional[str] = None


@router.post('/{report_id}/moderate', summary='Moderator approves/rejects evidence video for public release')
def moderate_evidence_video(
    report_id: int,
    payload: ModeratorApprovalIn,
    db: Session = Depends(get_db),
    user=Depends(require_role(['government', 'admin'])),
):
    video = crud.get_evidence_video(db, report_id)
    if not video:
        raise HTTPException(status_code=404, detail='No evidence video found')
    if video.status != 'ready':
        raise HTTPException(status_code=400, detail='Video must be ready before moderation')

    video = crud.update_evidence_video(
        db, video.id,
        moderator_approved=payload.approved,
        moderator_id=user.id,
        moderator_notes=payload.notes,
    )
    return {'message': 'Moderation recorded', 'video': _video_to_dict(video)}


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

@router.get('/notifications', summary='Get user notifications')
def get_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    notifs = crud.get_notifications(db, user.id, unread_only=unread_only)
    return [_notif_to_dict(n) for n in notifs]


@router.post('/notifications/{notification_id}/read', summary='Mark notification as read')
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    notif = crud.mark_notification_read(db, notification_id, user.id)
    if not notif:
        raise HTTPException(status_code=404, detail='Notification not found')
    return {'message': 'Notification marked as read'}


# ---------------------------------------------------------------------------
# Reminders (internal/cron endpoint)
# ---------------------------------------------------------------------------

@router.get('/reminders', summary='Check deadlines for reminders and expiration')
def check_reminders(
    db: Session = Depends(get_db),
    user=Depends(require_role(['admin'])),
):
    """Internal endpoint to check all deadlines. Can be called by a cron job or manually."""
    results = crud.check_deadlines(db)
    return {'checked': len(results), 'results': results}
