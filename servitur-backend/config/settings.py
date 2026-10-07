"""
config/settings.py
"""
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

# Por seguridad, DEBUG está APAGADO por defecto: para desarrollo local pon
# DEBUG=True en tu archivo .env (ver .env.example).
DEBUG = config("DEBUG", default=False, cast=bool)

_CLAVE_INSEGURA = "django-insecure-cambia-esto-en-produccion"
SECRET_KEY = config("SECRET_KEY", default=_CLAVE_INSEGURA)
if not DEBUG and SECRET_KEY == _CLAVE_INSEGURA:
    raise ImproperlyConfigured(
        "Con DEBUG=False debes definir una SECRET_KEY propia (variable de entorno)."
    )

ALLOWED_HOSTS = [h.strip() for h in config("ALLOWED_HOSTS", default="localhost,127.0.0.1").split(",") if h.strip()]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME", default="servitur"),
        "USER": config("DB_USER", default="servitur"),
        "PASSWORD": config("DB_PASSWORD", default="servitur"),
        "HOST": config("DB_HOST", default="db"),
        "PORT": config("DB_PORT", default="5432"),
    }
}

AUTH_USER_MODEL = "core.Usuario"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "es-mx"
TIME_ZONE = "America/Mexico_City"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

# Archivos subidos por los usuarios (p. ej. el documento de soporte de un
# Permiso). En producción (Render) esto normalmente se reemplaza por un
# almacenamiento externo (S3, etc.), pero para desarrollo local basta con
# servirlos desde el propio contenedor.
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in config("CORS_ALLOWED_ORIGINS", default="http://localhost:5173").split(",")
    if o.strip()
]

# Origenes confiables para CSRF (solo aplica a /admin/ y a la API navegable
# con sesión). En producción pon aquí la URL https del backend.
CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in config("CSRF_TRUSTED_ORIGINS", default="").split(",") if o.strip()
]

# --- Seguridad HTTPS (se activa sola cuando DEBUG=False, p. ej. en Render) ---
if not DEBUG:
    # Render y otros proveedores terminan el HTTPS en un proxy y mandan este encabezado.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=0, cast=int)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_HSTS_SECONDS > 0
    SECURE_CONTENT_TYPE_NOSNIFF = True

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        # Solo para poder probar la API navegable estando logueado en /admin/.
        # El frontend real siempre usa JWT.
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    # Límite de intentos por IP en las dos puertas públicas (login y registro)
    # para frenar la fuerza bruta de contraseñas y del código de supervisor.
    "DEFAULT_THROTTLE_RATES": {
        "login": config("THROTTLE_LOGIN", default="10/min"),
        "registro": config("THROTTLE_REGISTRO", default="10/hour"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    # Cada renovación emite un refresh nuevo y el anterior queda invalidado
    # (así un token robado/viejo no se puede reutilizar).
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}