"""
core/permissions.py

Permisos basados en el rol del usuario (ver tabla RBAC de la Actividad 2).
Se combinan con | (OR) en las vistas, ej:
    permission_classes = [EsAdministrador | EsSupervisor]
"""

from rest_framework.permissions import BasePermission


def _tiene_rol(request, *nombres_rol):
    user = request.user
    return bool(
        user
        and user.is_authenticated
        and getattr(user, "rol", None)
        and user.rol.nombre in nombres_rol
    )


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