"""add contractor response and accepted due date system tables

Revision ID: 0005_contractor_workflow
Revises: 0004_add_firebase_uid
"""
from alembic import op
import sqlalchemy as sa


revision = '0005_contractor_workflow'
down_revision = '0004_add_firebase_uid'
branch_labels = None
depends_on = None


def upgrade():
    # Add workflow fields to reports table
    op.add_column('reports', sa.Column('workflow_status', sa.String(), server_default='reported', nullable=False))
    op.add_column('reports', sa.Column('accepted_deadline', sa.DateTime(), nullable=True))
    op.add_column('reports', sa.Column('notification_sent_at', sa.DateTime(), nullable=True))
    op.add_column('reports', sa.Column('contractor_response_deadline', sa.DateTime(), nullable=True))
    op.create_index('ix_reports_workflow_status', 'reports', ['workflow_status'])

    # Contractor responses table
    op.create_table(
        'contractor_responses',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('report_id', sa.Integer(), nullable=False),
        sa.Column('contractor_name', sa.String(), nullable=False),
        sa.Column('expected_completion_date', sa.DateTime(), nullable=False),
        sa.Column('repair_plan', sa.Text(), nullable=False),
        sa.Column('reason_for_delay', sa.Text(), nullable=True),
        sa.Column('estimated_work_duration', sa.String(), nullable=True),
        sa.Column('response_date', sa.DateTime(), nullable=False),
        sa.Column('status', sa.String(), server_default='pending', nullable=False),
    )
    op.create_index('ix_contractor_responses_report_id', 'contractor_responses', ['report_id'])

    # Authority reviews table
    op.create_table(
        'authority_reviews',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('report_id', sa.Integer(), nullable=False),
        sa.Column('contractor_response_id', sa.Integer(), nullable=False),
        sa.Column('authority_user_id', sa.Integer(), nullable=False),
        sa.Column('decision', sa.String(), nullable=False),
        sa.Column('accepted_deadline', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('review_date', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_authority_reviews_report_id', 'authority_reviews', ['report_id'])
    op.create_index('ix_authority_reviews_contractor_response_id', 'authority_reviews', ['contractor_response_id'])

    # Completion evidence table
    op.create_table(
        'completion_evidence',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('report_id', sa.Integer(), nullable=False),
        sa.Column('contractor_response_id', sa.Integer(), nullable=True),
        sa.Column('photos', sa.JSON(), server_default='[]'),
        sa.Column('video_filename', sa.String(), nullable=True),
        sa.Column('completion_report', sa.Text(), nullable=True),
        sa.Column('upload_date', sa.DateTime(), nullable=False),
        sa.Column('ai_analysis_status', sa.String(), server_default='pending', nullable=False),
        sa.Column('ai_analysis_result', sa.JSON(), nullable=True),
        sa.Column('official_verification_status', sa.String(), server_default='pending', nullable=False),
        sa.Column('official_verification_notes', sa.Text(), nullable=True),
        sa.Column('official_verifier_id', sa.Integer(), nullable=True),
        sa.Column('official_verification_date', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_completion_evidence_report_id', 'completion_evidence', ['report_id'])

    # Evidence videos table
    op.create_table(
        'evidence_videos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('report_id', sa.Integer(), nullable=False),
        sa.Column('video_filename', sa.String(), nullable=False),
        sa.Column('status', sa.String(), server_default='generating', nullable=False),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
        sa.Column('privacy_applied', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('moderator_approved', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('moderator_approved_at', sa.DateTime(), nullable=True),
        sa.Column('moderator_notes', sa.Text(), nullable=True),
        sa.Column('moderator_id', sa.Integer(), nullable=True),
    )
    op.create_index('ix_evidence_videos_report_id', 'evidence_videos', ['report_id'])

    # Social media posts table
    op.create_table(
        'social_media_posts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('evidence_video_id', sa.Integer(), nullable=False),
        sa.Column('report_id', sa.Integer(), nullable=False),
        sa.Column('platform', sa.String(), nullable=False),
        sa.Column('status', sa.String(), server_default='pending', nullable=False),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('post_url', sa.String(), nullable=True),
        sa.Column('external_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_social_media_posts_evidence_video_id', 'social_media_posts', ['evidence_video_id'])
    op.create_index('ix_social_media_posts_report_id', 'social_media_posts', ['report_id'])

    # Notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('report_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('is_read', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_report_id', 'notifications', ['report_id'])


def downgrade():
    op.drop_index('ix_notifications_report_id', table_name='notifications')
    op.drop_index('ix_notifications_user_id', table_name='notifications')
    op.drop_table('notifications')

    op.drop_index('ix_social_media_posts_report_id', table_name='social_media_posts')
    op.drop_index('ix_social_media_posts_evidence_video_id', table_name='social_media_posts')
    op.drop_table('social_media_posts')

    op.drop_index('ix_evidence_videos_report_id', table_name='evidence_videos')
    op.drop_table('evidence_videos')

    op.drop_index('ix_completion_evidence_report_id', table_name='completion_evidence')
    op.drop_table('completion_evidence')

    op.drop_index('ix_authority_reviews_contractor_response_id', table_name='authority_reviews')
    op.drop_index('ix_authority_reviews_report_id', table_name='authority_reviews')
    op.drop_table('authority_reviews')

    op.drop_index('ix_contractor_responses_report_id', table_name='contractor_responses')
    op.drop_table('contractor_responses')

    op.drop_index('ix_reports_workflow_status', table_name='reports')
    op.drop_column('reports', 'contractor_response_deadline')
    op.drop_column('reports', 'notification_sent_at')
    op.drop_column('reports', 'accepted_deadline')
    op.drop_column('reports', 'workflow_status')
