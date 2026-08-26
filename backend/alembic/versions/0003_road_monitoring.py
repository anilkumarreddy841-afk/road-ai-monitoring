"""add road monitoring and contractor accountability tables

Revision ID: 0003_road_monitoring
Revises: 0002_expand_report_schema
"""
from alembic import op
import sqlalchemy as sa

revision = '0003_road_monitoring'
down_revision = '0002_expand_report_schema'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'road_projects',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('road_name', sa.String(), nullable=False),
        sa.Column('contractor_name', sa.String(), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('completion_date', sa.DateTime(), nullable=False),
        sa.Column('maintenance_end_date', sa.DateTime(), nullable=False),
        sa.Column('baseline_damage_percentage', sa.Float(), server_default='0'),
        sa.Column('baseline_condition', sa.String(), server_default='Healthy'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_road_projects_project_id', 'road_projects', ['project_id'], unique=True)
    op.create_table(
        'road_inspections',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('captured_at', sa.DateTime(), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('video_filename', sa.String(), nullable=True),
        sa.Column('evidence_images', sa.JSON(), nullable=True),
        sa.Column('detections', sa.JSON(), nullable=True),
        sa.Column('damage_percentage', sa.Float(), server_default='0'),
        sa.Column('severity', sa.String(), server_default='Healthy'),
        sa.Column('condition_change', sa.Float(), server_default='0'),
        sa.Column('status', sa.String(), server_default='Monitoring'),
        sa.Column('requires_human_verification', sa.Boolean(), server_default=sa.false()),
        sa.Column('alert_reason', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_road_inspections_project_id', 'road_inspections', ['project_id'])


def downgrade():
    op.drop_index('ix_road_inspections_project_id', table_name='road_inspections')
    op.drop_table('road_inspections')
    op.drop_index('ix_road_projects_project_id', table_name='road_projects')
    op.drop_table('road_projects')
