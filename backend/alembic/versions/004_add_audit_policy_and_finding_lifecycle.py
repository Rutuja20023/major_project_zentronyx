"""004 Add AuditLog, SecurityPolicy, PolicyEvaluation, and Finding Lifecycle fields

Revision ID: 004_audit_policy_lifecycle
Revises: 003_add_analysis_and_scan_orchestrator
Create Date: 2026-08-10 19:36:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004_audit_policy_lifecycle'
down_revision = '003_add_analysis_and_scan_orchestrator'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('resource_type', sa.String(length=50), nullable=True),
        sa.Column('resource_id', sa.String(length=36), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)

    # 2. Create security_policies table
    op.create_table(
        'security_policies',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=True),
        sa.Column('max_critical_findings', sa.Integer(), nullable=True),
        sa.Column('max_high_findings', sa.Integer(), nullable=True),
        sa.Column('max_malware_probability', sa.Float(), nullable=True),
        sa.Column('block_on_dast_critical', sa.Boolean(), nullable=True),
        sa.Column('block_on_critical_sca', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # 3. Create policy_evaluations table
    op.create_table(
        'policy_evaluations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('scan_id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('policy_id', sa.String(length=36), nullable=True),
        sa.Column('decision', sa.String(length=50), nullable=False),
        sa.Column('reasons', sa.JSON(), nullable=True),
        sa.Column('rule_violations', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_policy_evaluations_project_id'), 'policy_evaluations', ['project_id'], unique=False)
    op.create_index(op.f('ix_policy_evaluations_scan_id'), 'policy_evaluations', ['scan_id'], unique=False)

    # 4. Add columns to scan_results table
    op.add_column('scan_results', sa.Column('status', sa.String(length=50), server_default='OPEN', nullable=False))
    op.add_column('scan_results', sa.Column('fingerprint', sa.String(length=64), nullable=True))
    op.add_column('scan_results', sa.Column('first_seen_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('scan_results', sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True))

    op.create_index(op.f('ix_scan_results_status'), 'scan_results', ['status'], unique=False)
    op.create_index(op.f('ix_scan_results_fingerprint'), 'scan_results', ['fingerprint'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_scan_results_fingerprint'), table_name='scan_results')
    op.drop_index(op.f('ix_scan_results_status'), table_name='scan_results')
    op.drop_column('scan_results', 'last_seen_at')
    op.drop_column('scan_results', 'first_seen_at')
    op.drop_column('scan_results', 'fingerprint')
    op.drop_column('scan_results', 'status')

    op.drop_table('policy_evaluations')
    op.drop_table('security_policies')
    op.drop_table('audit_logs')
