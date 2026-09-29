from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    Rol,
    Usuario,
    Conductor,
    Unidad,
    Ruta,
    Turno,
    Servicio,
    Aforo,
    Mantenimiento,
    Permiso,
    BitacoraAuditoria,
)


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    # Extiende el UserAdmin de Django agregando el campo "rol" y "activo"
    fieldsets = UserAdmin.fieldsets + (
        ("Rol del sistema", {"fields": ("rol", "activo")}),
    )
    list_display = ("username", "email", "rol", "is_active", "activo")
    list_filter = UserAdmin.list_filter + ("rol",)


admin.site.register(Rol)
admin.site.register(Conductor)
admin.site.register(Unidad)
admin.site.register(Ruta)
admin.site.register(Turno)
admin.site.register(Servicio)
admin.site.register(Aforo)
admin.site.register(Mantenimiento)
admin.site.register(Permiso)
admin.site.register(BitacoraAuditoria)