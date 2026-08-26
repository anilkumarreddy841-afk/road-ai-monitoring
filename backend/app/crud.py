from sqlalchemy.orm import Session
from . import models
from .schemas import UserCreate, ReportCreate
from .security import get_password_hash
from datetime import datetime, timedelta


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_firebase_uid(db: Session, firebase_uid: str):
    return db.query(models.User).filter(models.User.firebase_uid == firebase_uid).first()


def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_users_by_role(db: Session, role: str):
    return db.query(models.User).filter(models.User.role == role).all()


def create_user(db: Session, user: UserCreate):
    hashed = get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed, full_name=user.full_name, role=user.role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def create_firebase_user(db: Session, firebase_uid: str, email: str, full_name: str | None = None):
    db_user = models.User(
        firebase_uid=firebase_uid,
        email=email,
        hashed_password=get_password_hash(firebase_uid),
        full_name=full_name,
        role='citizen',
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_report(db: Session, report_id: int):
    return db.query(models.Report).filter(models.Report.id == report_id).first()


def update_report(db: Session, report_id: int, updates: dict):
    report = get_report(db, report_id)
    if not report:
        return None
    for key, value in updates.items():
        if hasattr(report, key):
            setattr(report, key, value)
    report.last_updated = datetime.utcnow()
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def create_report(
    db: Session,
    user_id: int,
    report: ReportCreate,
    severity: str | None = None,
    files: list[str] | None = None,
    predictions: dict | None = None,
    material_estimates: dict | None = None,
    cost_breakdown: dict | None = None,
    estimated_repair_cost: float | None = None,
    repair_difficulty: str | None = None,
    budget_utilization: float | None = None,
):
    db_report = models.Report(
        user_id=user_id,
        road_id=report.road_id,
        title=report.title,
        description=report.description,
        road_name=report.road_name,
        latitude=report.latitude,
        longitude=report.longitude,
        city=report.city,
        district=report.district,
        state=report.state,
        pincode=report.pincode,
        weather=report.weather,
        weather_conditions=report.weather_conditions,
        device_info=report.device_info,
        report_source=report.report_source,
        analysis_source=report.analysis_source,
        satellite_verified=report.satellite_verified,
        vehicle_speed=report.vehicle_speed,
        direction=report.direction,
        reported_at=report.reported_at,
        damage_type=report.damage_type,
        severity=severity or report.severity or report.damage_type or 'unknown',
        status=report.status or report.repair_priority or 'reported',
        repair_priority=report.repair_priority,
        damage_count=report.damage_count,
        pothole_count=report.pothole_count,
        average_pothole_size=report.average_pothole_size,
        crack_length=report.crack_length,
        damage_area=report.damage_area,
        damage_length=report.damage_length,
        damage_width=report.damage_width,
        damage_depth=report.damage_depth,
        damage_percentage=report.damage_percentage,
        road_health_index=report.road_health_index,
        predicted_failure_risk=report.predicted_failure_risk,
        repair_difficulty=repair_difficulty or report.repair_difficulty,
        estimated_repair_cost=estimated_repair_cost or report.estimated_repair_cost,
        estimated_duration=report.estimated_duration,
        expected_completion_date=report.expected_completion_date,
        assigned_engineer=report.assigned_engineer,
        assigned_contractor=report.assigned_contractor,
        contractor_assignment=report.contractor_assignment,
        engineer_verified=report.engineer_verified,
        budget_utilization=budget_utilization,
        material_estimates=material_estimates or report.material_estimates,
        cost_breakdown=cost_breakdown or report.cost_breakdown,
        files=files or [],
        predictions=predictions or {},
        created_at=datetime.utcnow(),
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report


def get_reports(db: Session):
    return db.query(models.Report).order_by(models.Report.created_at.desc()).all()


def get_report_summary(db: Session):
    reports = get_reports(db)
    total = len(reports)
    completed = sum(1 for r in reports if r.status == 'completed')
    pending = total - completed
    severity_distribution = {}
    damage_types = {}
    cities = {}
    states = {}
    districts = {}
    total_cost = 0.0
    total_area = 0.0
    total_length = 0.0
    total_risk = 0.0

    for report in reports:
        severity_distribution[report.severity or 'unknown'] = severity_distribution.get(report.severity or 'unknown', 0) + 1
        damage_types[report.damage_type or 'other'] = damage_types.get(report.damage_type or 'other', 0) + 1
        cities[report.city or 'Unknown'] = cities.get(report.city or 'Unknown', 0) + 1
        states[report.state or 'Unknown'] = states.get(report.state or 'Unknown', 0) + 1
        districts[report.district or 'Unknown'] = districts.get(report.district or 'Unknown', 0) + 1
        total_cost += float(report.estimated_repair_cost or 0)
        total_area += float(report.damage_area or 0)
        total_length += float(report.damage_length or 0)
        total_risk += float(report.predicted_failure_risk or 0)

    return {
        'total_reports': total,
        'completed_repairs': completed,
        'pending_repairs': pending,
        'severity_distribution': severity_distribution,
        'damage_type_distribution': damage_types,
        'top_cities': sorted(cities.items(), key=lambda x: x[1], reverse=True)[:5],
        'top_states': sorted(states.items(), key=lambda x: x[1], reverse=True)[:5],
        'top_districts': sorted(districts.items(), key=lambda x: x[1], reverse=True)[:5],
        'total_estimated_repair_cost': round(total_cost, 2),
        'total_damage_area': round(total_area, 2),
        'total_damage_length': round(total_length, 2),
        'average_risk_score': round((total_risk / total) if total else 0, 2),
    }


# ---------------------------------------------------------------------------
# Contractor Response & Accepted Due Date System — CRUD
# ---------------------------------------------------------------------------

def append_audit_log(db: Session, report: models.Report, event: str, details: dict | None = None):
    """Append an event to the report's audit_log JSON array."""
    log = report.audit_log or []
    if not isinstance(log, list):
        log = []
    entry = {'event': event, 'timestamp': datetime.utcnow().isoformat(), 'details': details or {}}
    log.append(entry)
    report.audit_log = log
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def create_notification(db: Session, user_id: int, title: str, message: str,
                        notif_type: str, report_id: int | None = None):
    notif = models.Notification(
        user_id=user_id,
        report_id=report_id,
        title=title,
        message=message,
        type=notif_type,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def get_notifications(db: Session, user_id: int, unread_only: bool = False):
    query = db.query(models.Notification).filter(models.Notification.user_id == user_id)
    if unread_only:
        query = query.filter(models.Notification.is_read == False)
    return query.order_by(models.Notification.created_at.desc()).all()


def mark_notification_read(db: Session, notification_id: int, user_id: int):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == user_id,
    ).first()
    if not notif:
        return None
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


def notify_contractor(db: Session, report: models.Report, response_deadline_days: int = 3):
    """Mark a report as contractor_notified and create a notification for the assigned contractor."""
    now = datetime.utcnow()
    response_deadline = now + timedelta(days=response_deadline_days)
    report.workflow_status = 'contractor_notified'
    report.notification_sent_at = now
    report.contractor_response_deadline = response_deadline
    db.add(report)
    db.commit()
    db.refresh(report)
    append_audit_log(db, report, 'contractor_notified', {
        'notification_sent_at': now.isoformat(),
        'response_deadline': response_deadline.isoformat(),
    })
    # Notify the contractor user if one exists
    contractor_user = None
    if report.assigned_contractor:
        contractor_user = db.query(models.User).filter(
            models.User.email == report.assigned_contractor
        ).first()
    if contractor_user:
        create_notification(
            db, contractor_user.id,
            'New Road Damage Case Assigned',
            f'A road damage case has been assigned to you. Please respond with your expected completion date within {response_deadline_days} days.',
            'contractor_assigned',
            report_id=report.id,
        )
    return report


def create_contractor_response(db: Session, report_id: int, contractor_name: str,
                               expected_completion_date: datetime, repair_plan: str,
                               reason_for_delay: str | None = None,
                               estimated_work_duration: str | None = None):
    response = models.ContractorResponse(
        report_id=report_id,
        contractor_name=contractor_name,
        expected_completion_date=expected_completion_date,
        repair_plan=repair_plan,
        reason_for_delay=reason_for_delay,
        estimated_work_duration=estimated_work_duration,
        response_date=datetime.utcnow(),
        status='pending',
    )
    db.add(response)
    db.commit()
    db.refresh(response)

    report = get_report(db, report_id)
    if report:
        report.workflow_status = 'contractor_responded'
        report.expected_completion_date = expected_completion_date
        db.add(report)
        db.commit()
        db.refresh(report)
        append_audit_log(db, report, 'contractor_responded', {
            'response_id': response.id,
            'expected_completion_date': expected_completion_date.isoformat(),
        })
        # Notify authority users
        authority_users = get_users_by_role(db, 'government') + get_users_by_role(db, 'admin')
        for au in authority_users:
            create_notification(
                db, au.id,
                'Contractor Response Submitted',
                f'Contractor {contractor_name} has responded to case #{report_id}. Review the proposed completion date.',
                'contractor_responded',
                report_id=report_id,
            )
    return response


def create_authority_review(db: Session, report_id: int, contractor_response_id: int,
                            authority_user_id: int, decision: str,
                            accepted_deadline: datetime | None = None,
                            notes: str | None = None):
    review = models.AuthorityReview(
        report_id=report_id,
        contractor_response_id=contractor_response_id,
        authority_user_id=authority_user_id,
        decision=decision,
        accepted_deadline=accepted_deadline,
        notes=notes,
        review_date=datetime.utcnow(),
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    report = get_report(db, report_id)
    if report:
        if decision == 'accepted':
            report.workflow_status = 'date_accepted'
            report.accepted_deadline = accepted_deadline
            append_audit_log(db, report, 'date_accepted', {
                'review_id': review.id,
                'accepted_deadline': accepted_deadline.isoformat() if accepted_deadline else None,
            })
            # Notify contractor
            contractor_user = None
            cr = get_contractor_response(db, contractor_response_id)
            if cr:
                contractor_user = db.query(models.User).filter(
                    models.User.email == cr.contractor_name
                ).first()
            if contractor_user:
                create_notification(
                    db, contractor_user.id,
                    'Repair Deadline Accepted',
                    f'Your proposed completion date has been accepted. The official repair deadline is set.',
                    'date_accepted',
                    report_id=report_id,
                )
        elif decision == 'rejected':
            report.workflow_status = 'contractor_responded'
            append_audit_log(db, report, 'date_rejected', {
                'review_id': review.id,
                'notes': notes,
            })
        elif decision == 'revision_requested':
            report.workflow_status = 'contractor_responded'
            append_audit_log(db, report, 'revision_requested', {
                'review_id': review.id,
                'notes': notes,
            })
        db.add(report)
        db.commit()
        db.refresh(report)
    return review


def get_contractor_response(db: Session, response_id: int):
    return db.query(models.ContractorResponse).filter(models.ContractorResponse.id == response_id).first()


def get_contractor_response_by_report(db: Session, report_id: int):
    return db.query(models.ContractorResponse).filter(
        models.ContractorResponse.report_id == report_id
    ).order_by(models.ContractorResponse.response_date.desc()).first()


def get_authority_review_by_report(db: Session, report_id: int):
    return db.query(models.AuthorityReview).filter(
        models.AuthorityReview.report_id == report_id
    ).order_by(models.AuthorityReview.review_date.desc()).first()


def get_completion_evidence(db: Session, report_id: int):
    return db.query(models.CompletionEvidence).filter(
        models.CompletionEvidence.report_id == report_id
    ).order_by(models.CompletionEvidence.upload_date.desc()).first()


def create_completion_evidence(db: Session, report_id: int, contractor_response_id: int | None,
                               photos: list[str], video_filename: str | None,
                               completion_report: str | None):
    evidence = models.CompletionEvidence(
        report_id=report_id,
        contractor_response_id=contractor_response_id,
        photos=photos,
        video_filename=video_filename,
        completion_report=completion_report,
        upload_date=datetime.utcnow(),
        ai_analysis_status='pending',
        official_verification_status='pending',
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    report = get_report(db, report_id)
    if report:
        report.workflow_status = 'evidence_submitted'
        db.add(report)
        db.commit()
        db.refresh(report)
        append_audit_log(db, report, 'evidence_submitted', {
            'evidence_id': evidence.id,
            'photos_count': len(photos),
            'has_video': video_filename is not None,
        })
        # Notify authority/engineer users
        for role in ['engineer', 'government', 'admin']:
            for user in get_users_by_role(db, role):
                create_notification(
                    db, user.id,
                    'Completion Evidence Submitted',
                    f'Contractor has submitted completion evidence for case #{report_id}. Review and verify.',
                    'evidence_submitted',
                    report_id=report_id,
                )
    return evidence


def update_evidence_ai_analysis(db: Session, evidence_id: int, status: str, result: dict | None = None):
    evidence = db.query(models.CompletionEvidence).filter(models.CompletionEvidence.id == evidence_id).first()
    if not evidence:
        return None
    evidence.ai_analysis_status = status
    evidence.ai_analysis_result = result
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return evidence


def verify_evidence(db: Session, evidence_id: int, verifier_id: int,
                    status: str, notes: str | None = None):
    evidence = db.query(models.CompletionEvidence).filter(models.CompletionEvidence.id == evidence_id).first()
    if not evidence:
        return None
    evidence.official_verification_status = status
    evidence.official_verification_notes = notes
    evidence.official_verifier_id = verifier_id
    evidence.official_verification_date = datetime.utcnow()
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    report = get_report(db, evidence.report_id)
    if report:
        if status == 'verified':
            report.workflow_status = 'official_verification'
            report.engineer_verified = True
            append_audit_log(db, report, 'evidence_verified', {
                'evidence_id': evidence_id,
                'verifier_id': verifier_id,
            })
        else:
            append_audit_log(db, report, 'evidence_rejected', {
                'evidence_id': evidence_id,
                'verifier_id': verifier_id,
                'notes': notes,
            })
        db.add(report)
        db.commit()
        db.refresh(report)
    return evidence


def create_evidence_video(db: Session, report_id: int, video_filename: str):
    video = models.EvidenceVideo(
        report_id=report_id,
        video_filename=video_filename,
        status='generating',
        generated_at=datetime.utcnow(),
        privacy_applied=False,
        moderator_approved=False,
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return video


def update_evidence_video(db: Session, video_id: int, status: str | None = None,
                          privacy_applied: bool | None = None,
                          moderator_approved: bool | None = None,
                          moderator_id: int | None = None,
                          moderator_notes: str | None = None):
    video = db.query(models.EvidenceVideo).filter(models.EvidenceVideo.id == video_id).first()
    if not video:
        return None
    if status:
        video.status = status
    if privacy_applied is not None:
        video.privacy_applied = privacy_applied
    if moderator_approved is not None:
        video.moderator_approved = moderator_approved
        if moderator_approved:
            video.moderator_approved_at = datetime.utcnow()
            video.moderator_id = moderator_id
    if moderator_notes is not None:
        video.moderator_notes = moderator_notes
    db.add(video)
    db.commit()
    db.refresh(video)
    return video


def get_evidence_video(db: Session, report_id: int):
    return db.query(models.EvidenceVideo).filter(
        models.EvidenceVideo.report_id == report_id
    ).order_by(models.EvidenceVideo.generated_at.desc()).first()


def create_social_media_post(db: Session, evidence_video_id: int, report_id: int, platform: str):
    post = models.SocialMediaPost(
        evidence_video_id=evidence_video_id,
        report_id=report_id,
        platform=platform,
        status='pending',
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def update_social_media_post(db: Session, post_id: int, status: str,
                             post_url: str | None = None, external_id: str | None = None):
    post = db.query(models.SocialMediaPost).filter(models.SocialMediaPost.id == post_id).first()
    if not post:
        return None
    post.status = status
    if post_url:
        post.post_url = post_url
    if external_id:
        post.external_id = external_id
    if status == 'published':
        post.published_at = datetime.utcnow()
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def get_workflow_detail(db: Session, report_id: int):
    """Aggregate all workflow entities for a single report."""
    report = get_report(db, report_id)
    if not report:
        return None
    contractor_response = get_contractor_response_by_report(db, report_id)
    authority_review = get_authority_review_by_report(db, report_id)
    evidence = get_completion_evidence(db, report_id)
    video = get_evidence_video(db, report_id)
    posts = db.query(models.SocialMediaPost).filter(
        models.SocialMediaPost.report_id == report_id
    ).all()
    notifications = db.query(models.Notification).filter(
        models.Notification.report_id == report_id
    ).order_by(models.Notification.created_at.desc()).all()
    return {
        'report': report,
        'contractor_response': contractor_response,
        'authority_review': authority_review,
        'completion_evidence': evidence,
        'evidence_video': video,
        'social_media_posts': posts,
        'notifications': notifications,
    }


def get_reports_for_contractor(db: Session, contractor_email: str):
    """Get all reports assigned to a contractor that are in the workflow."""
    return db.query(models.Report).filter(
        models.Report.assigned_contractor == contractor_email,
        models.Report.workflow_status != 'reported',
    ).order_by(models.Report.created_at.desc()).all()


def get_reports_for_authority(db: Session):
    """Get all reports that need authority attention."""
    return db.query(models.Report).filter(
        models.Report.workflow_status.in_([
            'contractor_responded', 'date_accepted', 'in_progress',
            'evidence_submitted', 'ai_analysis', 'official_verification',
            'overdue', 'failed',
        ])
    ).order_by(models.Report.created_at.desc()).all()


def check_deadlines(db: Session):
    """Check all reports with accepted deadlines for reminders and expiration."""
    now = datetime.utcnow()
    reports = db.query(models.Report).filter(
        models.Report.accepted_deadline != None,
        models.Report.workflow_status.in_(['date_accepted', 'in_progress', 'evidence_submitted']),
    ).all()
    results = []
    for report in reports:
        if not report.accepted_deadline:
            continue
        days_remaining = (report.accepted_deadline - now).days
        # 7 days remaining reminder
        if days_remaining == 7:
            _send_reminder(db, report, 7)
            results.append({'report_id': report.id, 'reminder': '7_days'})
        # 3 days remaining reminder
        elif days_remaining == 3:
            _send_reminder(db, report, 3)
            results.append({'report_id': report.id, 'reminder': '3_days'})
        # 1 day remaining reminder
        elif days_remaining == 1:
            _send_reminder(db, report, 1)
            results.append({'report_id': report.id, 'reminder': '1_day'})
        # Deadline expired
        elif days_remaining < 0 and report.workflow_status not in ('overdue', 'failed', 'resolved'):
            report.workflow_status = 'overdue'
            db.add(report)
            db.commit()
            db.refresh(report)
            append_audit_log(db, report, 'deadline_expired', {
                'accepted_deadline': report.accepted_deadline.isoformat(),
            })
            # Notify contractor and authority
            if report.assigned_contractor:
                contractor_user = db.query(models.User).filter(
                    models.User.email == report.assigned_contractor
                ).first()
                if contractor_user:
                    create_notification(
                        db, contractor_user.id,
                        'Repair Deadline Expired',
                        f'The repair deadline for case #{report.id} has expired. The case has been marked as overdue.',
                        'deadline_expired',
                        report_id=report.id,
                    )
            for role in ['engineer', 'government', 'admin']:
                for user in get_users_by_role(db, role):
                    create_notification(
                        db, user.id,
                        'Case Overdue',
                        f'Case #{report.id} has passed its repair deadline and is now overdue. Escalated for official review.',
                        'deadline_expired',
                        report_id=report.id,
                    )
            results.append({'report_id': report.id, 'reminder': 'deadline_expired'})
    return results


def _send_reminder(db: Session, report: models.Report, days_remaining: int):
    """Send a deadline reminder notification to the contractor and authority."""
    append_audit_log(db, report, 'reminder_sent', {
        'days_remaining': days_remaining,
        'timestamp': datetime.utcnow().isoformat(),
    })
    if report.assigned_contractor:
        contractor_user = db.query(models.User).filter(
            models.User.email == report.assigned_contractor
        ).first()
        if contractor_user:
            create_notification(
                db, contractor_user.id,
                f'Repair Deadline Reminder: {days_remaining} days remaining',
                f'The repair deadline for case #{report.id} is in {days_remaining} days. Please submit completion evidence before the deadline.',
                'reminder',
                report_id=report.id,
            )
    for role in ['engineer', 'government', 'admin']:
        for user in get_users_by_role(db, role):
            create_notification(
                db, user.id,
                f'Deadline Reminder: {days_remaining} days',
                f'Case #{report.id} repair deadline is in {days_remaining} days.',
                'reminder',
                report_id=report.id,
            )
