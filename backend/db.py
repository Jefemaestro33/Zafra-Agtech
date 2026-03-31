"""
db.py — Shared database connection module for AgTech Sistema.
All backend modules should import get_conn, query, execute from here.
"""
import os
from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get("DATABASE_URL", "")


@contextmanager
def get_conn(db_url=None):
    """Get a database connection. Uses DATABASE_URL env var by default."""
    url = db_url or DATABASE_URL
    if not url:
        raise RuntimeError("DATABASE_URL not configured")
    conn = psycopg2.connect(url)
    try:
        yield conn
    finally:
        conn.close()


def query(sql, params=None, one=False, db_url=None):
    """Execute query and return results as list of dicts."""
    with get_conn(db_url) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
    if one:
        return dict(rows[0]) if rows else None
    return [dict(r) for r in rows]


def execute(sql, params=None, db_url=None):
    """Execute INSERT/UPDATE and commit."""
    with get_conn(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
        conn.commit()
