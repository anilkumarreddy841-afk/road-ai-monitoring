"""link SQL users to Firebase Auth accounts

Revision ID: 0004_add_firebase_uid
Revises: 0003_road_monitoring
"""
from alembic import op
import sqlalchemy as sa


revision = '0004_add_firebase_uid'
down_revision = '0003_road_monitoring'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('firebase_uid', sa.String(), nullable=True))
    op.create_index('ix_users_firebase_uid', 'users', ['firebase_uid'], unique=True)


def downgrade():
    op.drop_index('ix_users_firebase_uid', table_name='users')
    op.drop_column('users', 'firebase_uid')