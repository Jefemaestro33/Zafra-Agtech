"""
auth.py — Autenticación JWT para Zafra
Usuarios desde AUTH_USERS env var (JSON) o AUTH_USER_N / AUTH_PASS_N.
Sin esos env vars, arranca con un fallback de DEV con passwords
intencionalmente débiles. NUNCA usar el fallback en producción.
"""
import os
import json
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel


# ============================================================
# CONFIG
# ============================================================
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    import logging
    JWT_SECRET = "zafra-dev-secret-change-me-in-production"
    logging.warning("JWT_SECRET not set — using insecure dev default. Set JWT_SECRET env var in production!")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 2

security = HTTPBearer()


def _hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_pw(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


# ============================================================
# USUARIOS
# ============================================================
def _load_users() -> dict:
    """Load users from AUTH_USERS env var (JSON) or raise error."""
    raw = os.environ.get("AUTH_USERS")
    if raw:
        try:
            users_list = json.loads(raw)
            return {
                u["usuario"]: {
                    "nombre": u["nombre"],
                    "usuario": u["usuario"],
                    "rol": u["rol"],
                    "iniciales": u.get("iniciales", u["nombre"][:2].upper()),
                    "password_hash": _hash_pw(u["password"]),
                }
                for u in users_list
            }
        except (json.JSONDecodeError, KeyError) as e:
            raise RuntimeError(f"AUTH_USERS env var has invalid format: {e}")

    # Dev fallback: require AUTH_USER_1 and AUTH_PASS_1 env vars
    users = {}
    i = 1
    while True:
        user = os.environ.get(f"AUTH_USER_{i}")
        pw = os.environ.get(f"AUTH_PASS_{i}")
        if not user or not pw:
            break
        name = os.environ.get(f"AUTH_NAME_{i}", user.capitalize())
        role = os.environ.get(f"AUTH_ROLE_{i}", "admin")
        users[user] = {
            "nombre": name,
            "usuario": user,
            "rol": role,
            "iniciales": name[:2].upper(),
            "password_hash": _hash_pw(pw),
        }
        i += 1

    if not users:
        import logging
        logging.warning(
            "No AUTH_USERS or AUTH_USER_N env vars found — using default dev users. "
            "Set env vars in production!"
        )
        DEV_PLACEHOLDER = "dev-only-set-AUTH_USERS-in-prod"
        return {
            "ernest":   {"nombre": "Ernest",   "usuario": "ernest",   "rol": "admin",      "iniciales": "ED", "password_hash": _hash_pw(DEV_PLACEHOLDER)},
            "salvador": {"nombre": "Salvador", "usuario": "salvador", "rol": "agronomo",   "iniciales": "SV", "password_hash": _hash_pw(DEV_PLACEHOLDER)},
            "carloslp": {"nombre": "Carlos LP","usuario": "carloslp", "rol": "observador", "iniciales": "CL", "password_hash": _hash_pw(DEV_PLACEHOLDER)},
            "invitado": {"nombre": "Invitado", "usuario": "invitado", "rol": "observador", "iniciales": "IN", "password_hash": _hash_pw(DEV_PLACEHOLDER)},
        }
    return users


USUARIOS = _load_users()


# ============================================================
# PYDANTIC MODELS
# ============================================================
class LoginRequest(BaseModel):
    usuario: str
    password: str


class TokenResponse(BaseModel):
    token: str
    usuario: str
    nombre: str
    rol: str
    iniciales: str


# ============================================================
# FUNCIONES
# ============================================================
def autenticar_usuario(usuario: str, password: str) -> dict | None:
    """Verifica credenciales. Retorna datos del usuario o None."""
    user = USUARIOS.get(usuario.lower().strip())
    if not user:
        return None
    if not _verify_pw(password, user["password_hash"]):
        return None
    return user


def crear_token(usuario: str, rol: str) -> str:
    """Genera JWT con expiración."""
    payload = {
        "sub": usuario,
        "rol": rol,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verificar_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency de FastAPI — extrae y valida el token JWT."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        usuario = payload.get("sub")
        if usuario is None or usuario not in USUARIOS:
            raise HTTPException(status_code=401, detail="Token inválido")
        return {
            "usuario": usuario,
            "rol": payload.get("rol"),
            "nombre": USUARIOS[usuario]["nombre"],
            "iniciales": USUARIOS[usuario]["iniciales"],
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expirado o inválido")
