"""003_add_analysis_and_scan_orchestrator

Revision ID: 003_add_analysis_and_scan_orchestrator
Revises: 002_add_source_model
Create Date: 2026-08-10 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '003_add_analysis_and_scan_orchestrator'
down_revision: Union[str, None] = '002_add_source_model'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create project_analyses table
    op.create_table(
        'project_analyses',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('source_id', sa.String(length=36), nullable=True),
        sa.Column('source_fingerprint', sa.String(length=64), nullable=True),
        sa.Column('primary_language', sa.String(length=50), nullable=True),
        sa.Column('detected_languages', sa.JSON(), nullable=True),
        sa.Column('language_statistics', sa.JSON(), nullable=True),
        sa.Column('framework', sa.String(length=100), nullable=True),
        sa.Column('framework_version', sa.String(length=50), nullable=True),
        sa.Column('build_system', sa.String(length=100), nullable=True),
        sa.Column('dependency_manifests', sa.JSON(), nullable=True),
        sa.Column('entry_points', sa.JSON(), nullable=True),
        sa.Column('application_type', sa.String(length=50), nullable=True),
        sa.Column('binary_capable', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('binary_type', sa.String(length=50), nullable=True),
        sa.Column('statistics', sa.JSON(), nullable=True),
        sa.Column('warnings', sa.JSON(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='COMPLETED'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['source_id'], ['sources.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_analyses_project_id'), 'project_analyses', ['project_id'], unique=False)

    # 2. Add orchestration columns to scans table
    with op.batch_alter_table('scans') as batch_op:
        batch_op.add_column(sa.Column('source_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('analysis_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('source_fingerprint', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('severity_summary', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('error_message', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('started_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.create_foreign_key('fk_scans_source_id', 'sources', ['source_id'], ['id'], ondelete='SET NULL')
        batch_op.create_foreign_key('fk_scans_analysis_id', 'project_analyses', ['analysis_id'], ['id'], ondelete='SET NULL')

    # 3. Create scan_modules table
    op.create_table(
        'scan_modules',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('scan_id', sa.String(length=36), nullable=False),
        sa.Column('module_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('findings_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('skip_reason', sa.String(length=255), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('execution_time_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['scan_id'], ['scans.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_scan_modules_scan_id'), 'scan_modules', ['scan_id'], unique=False)

    # 4. Create scan_results table
    op.create_table(
        'scan_results',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('scan_id', sa.String(length=36), nullable=False),
        sa.Column('scan_module_id', sa.String(length=36), nullable=True),
        sa.Column('module_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False),
        sa.Column('confidence', sa.String(length=50), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('file', sa.String(length=512), nullable=True),
        sa.Column('line', sa.Integer(), nullable=True),
        sa.Column('column', sa.Integer(), nullable=True),
        sa.Column('scanner', sa.String(length=100), nullable=False),
        sa.Column('rule_id', sa.String(length=100), nullable=False),
        sa.Column('recommendation', sa.Text(), nullable=True),
        sa.Column('raw_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['scan_id'], ['scans.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['scan_module_id'], ['scan_modules.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_scan_results_scan_id'), 'scan_results', ['scan_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_scan_results_scan_id'), table_name='scan_results')
    op.drop_table('scan_results')
    op.drop_index(op.f('ix_scan_modules_scan_id'), table_name='scan_modules')
    op.drop_table('scan_modules')
    with op.batch_alter_table('scans') as batch_op:
        batch_op.drop_constraint('fk_scans_analysis_id', type_='foreignkey')
        batch_op.drop_constraint('fk_scans_source_id', type_='foreignkey')
        batch_op.drop_column('started_at')
        batch_op.drop_column('error_message')
        batch_op.drop_column('severity_summary')
        batch_op.drop_column('source_fingerprint')
        batch_op.drop_column('analysis_id')
        batch_op.drop_column('source_id')
    op.drop_index(op.f('ix_project_analyses_project_id'), table_name='project_analyses')
    op.drop_table('project_analyses')
