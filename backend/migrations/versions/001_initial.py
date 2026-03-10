"""Initial database schema creation.

Revision ID: 001_initial
Revises: 
Create Date: 2026-03-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create initial database schema."""
    
    # Create sessions table
    op.create_table(
        'sessions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('session_key', sa.String(length=255), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('event_count', sa.Integer(), nullable=True, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('session_key')
    )
    op.create_index('ix_sessions_session_key', 'sessions', ['session_key'], unique=True)
    
    # Create logs table
    op.create_table(
        'logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('level', sa.String(length=20), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=True),
        sa.Column('session_id', sa.Integer(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_logs_timestamp', 'logs', ['timestamp'])
    op.create_index('ix_logs_level', 'logs', ['level'])
    op.create_index('ix_logs_session_id', 'logs', ['session_id'])
    op.create_index('ix_logs_timestamp_level', 'logs', ['timestamp', 'level'])
    op.create_index('ix_logs_source', 'logs', ['source'])
    
    # Create patterns table
    op.create_table(
        'patterns',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('pattern_sequence', postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column('support', sa.Float(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('frequency', sa.Integer(), nullable=False),
        sa.Column('discovered_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create anomalies table
    op.create_table(
        'anomalies',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('anomaly_type', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('detected_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_anomalies_anomaly_type', 'anomalies', ['anomaly_type'])
    op.create_index('ix_anomalies_severity', 'anomalies', ['severity'])
    op.create_index('ix_anomalies_detected_at', 'anomalies', ['detected_at'])
    
    # Create clusters table
    op.create_table(
        'clusters',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('cluster_name', sa.String(length=100), nullable=False),
        sa.Column('centroid_vector', postgresql.ARRAY(sa.Float()), nullable=True),
        sa.Column('log_count', sa.Integer(), nullable=True, default=0),
        sa.Column('keywords', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Drop all tables."""
    op.drop_table('clusters')
    op.drop_index('ix_anomalies_detected_at', table_name='anomalies')
    op.drop_index('ix_anomalies_severity', table_name='anomalies')
    op.drop_index('ix_anomalies_anomaly_type', table_name='anomalies')
    op.drop_table('anomalies')
    op.drop_table('patterns')
    op.drop_index('ix_logs_source', table_name='logs')
    op.drop_index('ix_logs_timestamp_level', table_name='logs')
    op.drop_index('ix_logs_session_id', table_name='logs')
    op.drop_index('ix_logs_level', table_name='logs')
    op.drop_index('ix_logs_timestamp', table_name='logs')
    op.drop_table('logs')
    op.drop_index('ix_sessions_session_key', table_name='sessions')
    op.drop_table('sessions')
