"""
core/urls.py
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    RolViewSet,
    UsuarioViewSet,
    ConductorViewSet,
    UnidadViewSet,
    RutaViewSet,
    TurnoViewSet,
    ServicioViewSet,
    AforoViewSet,
    MantenimientoViewSet,
    PermisoViewSet,
    IncidenciaViewSet,
    BitacoraAuditoriaViewSet,
    MeView,
    ConfiguracionSistemaView,
    RegistroView,
    SesionActivaViewSet,
    ReporteConductorViewSet,
    HallazgoAuditoriaViewSet,
)

router = DefaultRouter()
router.register(r"roles", RolViewSet, basename="rol")
router.register(r"usuarios", UsuarioViewSet, basename="usuario")
router.register(r"conductores", ConductorViewSet, basename="conductor")
router.register(r"unidades", UnidadViewSet, basename="unidad")
router.register(r"rutas", RutaViewSet, basename="ruta")
router.register(r"turnos", TurnoViewSet, basename="turno")
router.register(r"servicios", ServicioViewSet, basename="servicio")
router.register(r"aforos", AforoViewSet, basename="aforo")
router.register(r"mantenimientos", MantenimientoViewSet, basename="mantenimiento")
router.register(r"permisos", PermisoViewSet, basename="permiso")
router.register(r"incidencias", IncidenciaViewSet, basename="incidencia")
router.register(r"bitacora", BitacoraAuditoriaViewSet, basename="bitacora")
router.register(r"sesiones", SesionActivaViewSet, basename="sesion")
router.register(r"reportes-conductor", ReporteConductorViewSet, basename="reporte-conductor")
router.register(r"hallazgos-auditoria", HallazgoAuditoriaViewSet, basename="hallazgo-auditoria")

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("registro/", RegistroView.as_view(), name="registro"),
    path("configuracion/codigo-supervisor/", ConfiguracionSistemaView.as_view(), name="codigo-supervisor"),
    path("", include(router.urls)),
]