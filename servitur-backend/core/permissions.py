"""
core/permissions.py

Permisos basados en el rol del usuario (ver tabla RBAC de la Actividad 2).
Se combinan con | (OR) en las vistas, ej:
    permission_classes = [EsAdministrador | EsAdminOSupervisor]
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission


def nombre_rol(user):
    """Nombre del rol del usuario, o None si no está autenticado / no tiene rol."""
    if not (user and user.is_authenticated):
        return None
    rol = getattr(user, "rol", None)
    return rol.nombre if rol else None


def _tiene_rol(request, *nombres_rol):
    return nombre_rol(request.user) in nombres_rol


class EsAdministrador(BasePermission):
    """Acceso completo a todo, incluida la gestión de roles."""

    def has_permission(self, request, view):
        return _tiene_rol(request, "Administrador")


class EsAdminOSupervisor(BasePermission):
    """Acceso completo excepto gestión de roles (ver EsAdministrador)."""

    def has_permission(self, request, view):
        return _tiene_rol(request, "Administrador", "Supervisor")


class EsPersonalOperativo(BasePermission):
    """Administrador, Supervisor o Monitoreo (sin acceso a Permisos)."""

    def has_permission(self, request, view):
        return _tiene_rol(request, "Administrador", "Supervisor", "Monitoreo")


class EsRH(BasePermission):
    def has_permission(self, request, view):
        return _tiene_rol(request, "RH")


class EsConductor(BasePermission):
    """Usuario autenticado que tiene un registro de Conductor asociado."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and hasattr(user, "conductor")
        )


def puede_restablecer_password(editor, objetivo):
    """
    Quién puede ponerle una contraseña nueva a la cuenta de OTRA persona:
      - Administrador: a cualquiera (menos a sí mismo; eso es "cambiar contraseña").
      - Supervisor: Monitoreo, RH y Conductor (no Administrador ni otro Supervisor).
      - RH: solo Conductores.
      - Monitoreo y Conductor: a nadie.
    """
    if editor is None or objetivo is None or editor.pk == objetivo.pk:
        return False
    rol_editor = nombre_rol(editor)
    rol_objetivo = nombre_rol(objetivo)
    if rol_editor == "Administrador":
        return True
    if rol_editor == "Supervisor":
        return rol_objetivo in ("Monitoreo", "RH", "Conductor")
    if rol_editor == "RH":
        return rol_objetivo == "Conductor"
    return False


class EsConductorSoloLectura(BasePermission):
    """
    Un Conductor puede CONSULTAR (GET/HEAD/OPTIONS) pero nunca crear, editar
    ni borrar. Se usa para catálogos que su pantalla necesita leer (rutas,
    turnos) y para sus propias incidencias.
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(
            request.method in SAFE_METHODS
            and user
            and user.is_authenticated
            and hasattr(user, "conductor")
        )
