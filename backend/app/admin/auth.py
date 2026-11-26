"""Minimal admin auth for the prototype: a shared token in the X-Admin-Token header.

Set it with the ADMIN_TOKEN environment variable (default: "admin").
In production this would be replaced by real accounts/SSO.
"""
import os
import secrets

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "admin")

# Using APIKeyHeader adds an "Authorize" button to /docs.
_token_header = APIKeyHeader(name="X-Admin-Token", auto_error=False)


def require_admin(token: str | None = Security(_token_header)) -> None:
    if not token or not secrets.compare_digest(token, ADMIN_TOKEN):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing admin token")
