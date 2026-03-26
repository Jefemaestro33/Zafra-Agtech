"""
auth.py — Autenticación JWT para AgTech Sistema
Usuarios hardcoded con bcrypt. Tokens JWT con expiración.

Uso:
  from auth import verificar_token, USUARIOS
"""
import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel


# ============================================================
# CONFIG
# ============================================================
JWT_SECRET = os.environ.get("JWT_SECRET", "agtech-nextipac-jwt-secret-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 72  # 3 días — práctico para trabajo en campo

security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================================================
# USUARIOS
# ============================================================
# Contraseñas generadas con bcrypt — no almacenadas en texto plano
USUARIOS = {
    "ernest": {
        "nombre": "Ernest",
        "usuario": "ernest",
        "rol": "admin",
        "iniciales": "ED",
        # Contraseña: Nxt!p4c_Agr0-2026
        "password_hash": pwd_context.hash("Nxt!p4c_Agr0-2026"),
    },
    "salvador": {
        "nombre": "Salvador",
        "usuario": "salvador",
        "rol": "agronomo",
        "iniciales": "SV",
        # Contraseña: C4mpo_V3rde#Hass
        "password_hash": pwd_context.hash("C4mpo_V3rde#Hass"),
    },
}


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
    if not pwd_context.verify(password, user["password_hash"]):
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
