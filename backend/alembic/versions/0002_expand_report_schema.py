"""Expand the persisted road-damage report fields.

Revision ID: 0002_expand_report_schema
Revises: 0001_initial
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_expand_report_schema"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


REPORT_COLUMNS = (
    ("road_id", sa.String()), ("road_name", sa.String()),
    ("weather", sa.String()), ("weather_conditions", sa.String()),
    ("device_info", sa.JSON()), ("vehicle_speed", sa.Float()),
    ("direction", sa.String()), ("reported_at", sa.DateTime()),
    ("report_source", sa.String()), ("analysis_source", sa.String()),
    ("satellite_verified", sa.Boolean()), ("damage_type", sa.String()),
    ("repair_priority", sa.String()), ("damage_count", sa.Integer()),
    ("pothole_count", sa.Integer()), ("average_pothole_size", sa.Float()),
    ("crack_length", sa.Float()), ("damage_area", sa.Float()),
    ("damage_length", sa.Float()), ("damage_width", sa.Float()),
    ("damage_depth", sa.Float()), ("damage_percentage", sa.Float()),
    ("road_health_index", sa.Float()), ("predicted_failure_risk", sa.Float()),
    ("repair_difficulty", sa.String()), ("estimated_repair_cost", sa.Float()),
    ("estimated_duration", sa.String()), ("expected_completion_date", sa.DateTime()),
    ("assigned_engineer", sa.String()), ("assigned_contractor", sa.String()),
    ("contractor_assignment", sa.String()), ("engineer_verified", sa.Boolean()),
    ("budget_utilization", sa.Float()), ("material_estimates", sa.JSON()),
    ("cost_breakdown", sa.JSON()), ("audit_log", sa.JSON()),
    ("files", sa.JSON()), ("predictions", sa.JSON()),
    ("last_updated", sa.DateTime()),
)


def upgrade():
    for name, column_type in REPORT_COLUMNS:
        op.add_column("reports", sa.Column(name, column_type, nullable=True))
    for name in ("road_id", "user_id", "status", "severity"):
        op.create_index(f"ix_reports_{name}", "reports", [name])


def downgrade():
    for name in ("severity", "status", "user_id", "road_id"):
        op.drop_index(f"ix_reports_{name}", table_name="reports")
    for name, _ in reversed(REPORT_COLUMNS):
        op.drop_column("reports", name)
