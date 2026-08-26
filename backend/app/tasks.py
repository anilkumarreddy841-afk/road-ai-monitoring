"""
Background tasks for the Contractor Response & Accepted Due Date System.

These functions handle:
  - Deadline reminders (7, 3, 1 days remaining)
  - Deadline expiration (marking cases as overdue/failed)
  - AI analysis triggering for submitted evidence
  - Case escalation

The main entry point is ``run_reminder_check(db)`` which is called:
  - On application startup (via main.py)
  - Via the /api/workflow/reminders endpoint (admin only)
  - Can be wired to a cron job or Celery beat for periodic execution
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from . import crud, models


def run_reminder_check(db: Session):
    """
    Check all reports with accepted deadlines for:
      - 7-day, 3-day, 1-day reminders
      - Deadline expiration (mark as overdue)

    Returns a list of actions taken.
    """
    return crud.check_deadlines(db)


def run_evidence_analysis(db: Session):
    """
    Check for evidence submissions that are pending AI analysis
    and trigger the AI service for before/after video comparison.

    This is a stub that can be extended with a proper task queue (Celery/RQ).
    """
    pending = db.query(models.CompletionEvidence).filter(
        models.CompletionEvidence.ai_analysis_status == 'pending',
        models.CompletionEvidence.video_filename != None,
    ).all()

    results = []
    for evidence in pending:
        # Mark as analyzing
        evidence.ai_analysis_status = 'analyzing'
        db.add(evidence)
        db.commit()

        # In a real implementation, this would call the AI service
        # For now, we mark it as complete with a stub result
        evidence.ai_analysis_status = 'complete'
        evidence.ai_analysis_result = {
            'message': 'AI analysis completed (stub)',
            'damage_reduction': 0.0,
            'confidence': 0.0,
            'timestamp': datetime.utcnow().isoformat(),
        }
        db.add(evidence)
        db.commit()
        db.refresh(evidence)
        results.append({'evidence_id': evidence.id, 'status': 'complete'})

    return results


def run_escalation_check(db: Session):
    """
    Check for overdue cases that need escalation.
    Cases that are overdue for more than 7 days are marked as 'failed'.
    """
    now = datetime.utcnow()
    overdue_reports = db.query(models.Report).filter(
        models.Report.workflow_status == 'overdue',
        models.Report.accepted_deadline < now - timedelta(days=7),
    ).all()

    results = []
    for report in overdue_reports:
        report.workflow_status = 'failed'
        db.add(report)
        db.commit()
        db.refresh(report)
        crud.append_audit_log(db, report, 'case_failed', {
            'reason': 'Overdue for more than 7 days without completion evidence',
            'timestamp': now.isoformat(),
        })
        # Notify authority
        for role in ['engineer', 'government', 'admin']:
            for user in crud.get_users_by_role(db, role):
                crud.create_notification(
                    db, user.id,
                    'Case Marked as Failed',
                    f'Case #{report.id} has been marked as FAILED due to prolonged overdue status. Escalated for official review.',
                    'deadline_expired',
                    report_id=report.id,
                )
        results.append({'report_id': report.id, 'status': 'failed'})

    return results


def run_daily_maintenance(db: Session):
    """
    Run all daily maintenance tasks.
    This should be called once per day (e.g., via cron at midnight).
    """
    reminder_results = run_reminder_check(db)
    analysis_results = run_evidence_analysis(db)
    escalation_results = run_escalation_check(db)
    return {
        'reminders': reminder_results,
        'evidence_analysis': analysis_results,
        'escalations': escalation_results,
    }
