"""002_add_source_model

Revision ID: 002_add_source_model
Revises: 001_initial_schema
Create Date: 2026-08-10 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_add_source_model'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'sources',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('source_url', sa.String(length=512), nullable=True),
        sa.Column('original_filename', sa.String(length=255), nullable=True),
        sa.Column('storage_path', sa.String(length=512), nullable=True),
        sa.Column('branch', sa.String(length=100), nullable=True),
        sa.Column('commit_hash', sa.String(length=100), nullable=True),
        sa.Column('source_fingerprint', sa.String(length=64), nullable=True),
        sa.Column('acquisition_status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('file_size', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('acquired_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sources_project_id'), 'sources', ['project_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_sources_project_id'), table_name='sources')
    op.drop_table('sources')
