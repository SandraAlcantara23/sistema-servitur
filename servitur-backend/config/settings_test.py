"""
config/settings_test.py

Configuración SOLO para correr las pruebas rápido y sin PostgreSQL
(usa SQLite en memoria). Uso:
    python manage.py test --settings=config.settings_test
Con Docker (PostgreSQL) también puedes correr simplemente:
    python manage.py test
"""
from .settings import *  # noqa: F401,F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]  # más rápido en pruebas
MEDIA_ROOT = BASE_DIR / "media_test"  # noqa: F405
