"""Update session_id to BigInteger.

Revision ID: 002_session_id_bigint
Revises: 001_initial
Create Date: 2026-03-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_session_id_bigint'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Update session_id column to BigInteger."""
    op.alter_column(
        'logs',
        'session_id',
        existing_type=sa.Integer(),
        type_=sa.BigInteger(),
        existing_nullable=True
    )


def downgrade() -> None:
    """Revert session_id column to Integer."""
    op.alter_column(
        'logs',
        'session_id',
        existing_type=sa.BigInteger(),
        type_=sa.Integer(),
        existing_nullable=True
    )
