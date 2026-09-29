"""
core/views.py
"""
import random
import string

from django.utils.text import slugify
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.views import TokenObtainPairView

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
    Incidencia,
    ReporteConductor,
    BitacoraAuditoria,
    ConfiguracionSistema,
    SesionActiva,
    HallazgoAuditoria,
)
from .serializers import (
    RolSerializer,
    UsuarioSerializer,
    ConductorSerializer,
    UnidadSerializer,
    RutaSerializer,
    TurnoSerializer,
    ServicioSerializer,
    AforoSerializer,
    MantenimientoSerializer,
    PermisoSerializer,
    IncidenciaSerializer,
    ReporteConductorSerializer,
    BitacoraAuditoriaSerializer,
    SesionActivaSerializer,
    HallazgoAuditoriaSerializer,
)
from .permissions import (
    EsAdministrador,
    EsAdminOSupervisor,
    EsPersonalOperativo,
    EsRH,
    EsConductor,
)


def _describir_dispositivo(user_agent):
    """Traduce un User-Agent crudo a algo legible tipo 'Chrome en Windows'."""
    ua = user_agent or ""

    if "Edg/" in ua:
        navegador = "Edge"
    elif "Chrome/" in ua and "Chromium" not in ua:
        navegador = "Chrome"
    elif "Firefox/" in ua:
        navegador = "Firefox"
    elif "Safari/" in ua and "Chrome" not in ua:
        navegador = "Safari"
    else:
        navegador = "Navegador desconocido"

    if "Windows" in ua:
        so = "Windows"
    elif "Android" in ua:
        so = "Android"
    elif "iPhone" in ua or "iPad" in ua:
        so = "iOS"
    elif "Mac OS X" in ua:
        so = "macOS"
    elif "Linux" in ua:
        so = "Linux"
    else:
        so = "dispositivo desconocido"

    return f"{navegador} en {so}"


def registrar_bitacora(usuario, accion, modulo, entidad_afectada):
    BitacoraAuditoria.objects.create(
        usuario=usuario, accion=accion, modulo=modulo, entidad_afectada=entidad_afectada
    )


def _es_admin_o_supervisor(request):
    user = request.user
    return bool(
        user.is_authenticated and user.rol and user.rol.nombre in ("Administrador", "Supervisor")
    )


class RolViewSet(viewsets.ModelViewSet):
    """Solo Administrador puede ver/gestionar roles."""

    queryset = Rol.objects.all()
    serializer_class = RolSerializer
    permission_classes = [EsAdministrador]


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.select_related("rol").all()
    serializer_class = UsuarioSerializer
    permission_classes = [EsAdminOSupervisor]

    def get_queryset(self):
        # Cada quien puede ver/editar su propio usuario aunque no sea Admin/Supervisor
        if self.action in ("retrieve", "update", "partial_update") and not _es_admin_o_supervisor(self.request):
            return Usuario.objects.filter(pk=self.request.user.pk)
        return super().get_queryset()

    def get_permissions(self):
        if self.action in ("retrieve", "update", "partial_update", "cambiar_password"):
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    @action(detail=False, methods=["post"])
    def cambiar_password(self, request):
        """
        POST /api/usuarios/cambiar_password/ {actual, nueva}
        Cambia la contraseña del usuario autenticado, verificando primero
        la contraseña actual (a diferencia del PATCH normal, que un
        Admin/Supervisor puede usar para resetear la de alguien más sin
        pedirle la anterior).
        """
        actual = request.data.get("actual", "")
        nueva = request.data.get("nueva", "")
        if not nueva or len(nueva) < 6:
            return Response({"detail": "La nueva contraseña debe tener al menos 6 caracteres."}, status=400)
        if not request.user.check_password(actual):
            return Response({"detail": "La contraseña actual no es correcta."}, status=400)
        request.user.set_password(nueva)
        request.user.save()
        return Response({"detail": "Contraseña actualizada."})


class ConductorViewSet(viewsets.ModelViewSet):
    queryset = Conductor.objects.select_related("usuario").all()
    serializer_class = ConductorSerializer
    permission_classes = [EsPersonalOperativo | EsRH]


class UnidadViewSet(viewsets.ModelViewSet):
    queryset = Unidad.objects.all()
    serializer_class = UnidadSerializer
    permission_classes = [EsPersonalOperativo]


class RutaViewSet(viewsets.ModelViewSet):
    queryset = Ruta.objects.all()
    serializer_class = RutaSerializer
    permission_classes = [EsPersonalOperativo]


class TurnoViewSet(viewsets.ModelViewSet):
    queryset = Turno.objects.all()
    serializer_class = TurnoSerializer
    permission_classes = [EsPersonalOperativo]


class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.select_related("conductor", "unidad", "ruta", "turno").all()
    serializer_class = ServicioSerializer
    permission_classes = [EsPersonalOperativo]


class AforoViewSet(viewsets.ModelViewSet):
    """Personal operativo ve todo; un Conductor solo ve/crea lo suyo."""

    serializer_class = AforoSerializer
    permission_classes = [EsPersonalOperativo | EsConductor]

    def get_serializer_context(self):
        # Necesario para que foto_url arme una URL absoluta.
        return {**super().get_serializer_context(), "request": self.request}

    def get_queryset(self):
        qs = Aforo.objects.select_related("ruta", "turno", "registrado_por").all()
        user = self.request.user
        if user.rol and user.rol.nombre in ("Administrador", "Supervisor", "Monitoreo"):
            return qs
        return qs.filter(registrado_por=user)

    def perform_create(self, serializer):
        aforo = serializer.save(registrado_por=self.request.user)
        registrar_bitacora(self.request.user, "crear", "Aforo", f"Aforo #{aforo.id}")


class MantenimientoViewSet(viewsets.ModelViewSet):
    queryset = Mantenimiento.objects.select_related("unidad").all()
    serializer_class = MantenimientoSerializer
    permission_classes = [EsPersonalOperativo]


class IncidenciaViewSet(viewsets.ModelViewSet):
    """
    Admin/Supervisor/Monitoreo ven y registran todas las incidencias.
    Un Conductor solo ve las suyas (no puede crear/editar).
    """

    serializer_class = IncidenciaSerializer
    permission_classes = [EsPersonalOperativo | EsConductor]

    def get_queryset(self):
        qs = Incidencia.objects.select_related("conductor__usuario", "unidad").all()
        user = self.request.user
        if user.rol and user.rol.nombre in ("Administrador", "Supervisor", "Monitoreo"):
            return qs
        return qs.filter(conductor__usuario=user)

    def perform_create(self, serializer):
        incidencia = serializer.save()
        registrar_bitacora(
            self.request.user, "crear", "Incidencias",
            f"Incidencia #{incidencia.id} ({incidencia.tipo}) de {incidencia.conductor}",
        )


class ReporteConductorViewSet(viewsets.ModelViewSet):
    """Concentrado digital del formato "Reporte de Conductor" (FOPR-MAN-01-02)."""

    queryset = ReporteConductor.objects.select_related("unidad").all()
    serializer_class = ReporteConductorSerializer
    permission_classes = [EsPersonalOperativo]

    def perform_create(self, serializer):
        reporte = serializer.save()
        registrar_bitacora(
            self.request.user, "crear", "Reportes",
            f"Reporte del Conductor de {reporte.conductor} (unidad {reporte.unidad.eco})",
        )

    def perform_destroy(self, instance):
        registrar_bitacora(
            self.request.user, "eliminar", "Reportes",
            f"Reporte del Conductor de {instance.conductor} (unidad {instance.unidad.eco})",
        )
        instance.delete()


class PermisoViewSet(viewsets.ModelViewSet):
    """
    Administrador/Supervisor y RH ven y autorizan/rechazan todo.
    Un Conductor solo ve/crea sus propias solicitudes (personal u oficio de
    comisión), con rango de fechas, motivo y un documento de soporte opcional.
    """

    serializer_class = PermisoSerializer
    permission_classes = [EsAdminOSupervisor | EsRH | EsConductor]

    def get_serializer_context(self):
        # Necesario para que documento_url arme una URL absoluta.
        return {**super().get_serializer_context(), "request": self.request}

    def get_queryset(self):
        qs = Permiso.objects.select_related("conductor__usuario", "autorizado_por").all()
        user = self.request.user
        if user.rol and user.rol.nombre in ("Administrador", "Supervisor", "RH"):
            return qs
        # Conductor: solo lo suyo
        return qs.filter(conductor__usuario=user)

    def perform_create(self, serializer):
        conductor = getattr(self.request.user, "conductor", None)
        if conductor is not None:
            permiso = serializer.save(conductor=conductor)
        else:
            permiso = serializer.save()
        registrar_bitacora(self.request.user, "crear", "Permisos", f"Permiso #{permiso.id}")

    @action(detail=True, methods=["post"], permission_classes=[EsAdminOSupervisor | EsRH])
    def autorizar(self, request, pk=None):
        permiso = self.get_object()
        permiso.estado = Permiso.Estado.AUTORIZADO
        permiso.comentario_rechazo = ""
        permiso.autorizado_por = request.user
        permiso.save()
        registrar_bitacora(request.user, "autorizar", "Permisos", f"Permiso #{permiso.id}")
        return Response(PermisoSerializer(permiso, context={"request": request}).data)

    @action(detail=True, methods=["post"], permission_classes=[EsAdminOSupervisor | EsRH])
    def rechazar(self, request, pk=None):
        permiso = self.get_object()
        permiso.estado = Permiso.Estado.RECHAZADO
        permiso.comentario_rechazo = request.data.get("comentario", "")
        permiso.autorizado_por = request.user
        permiso.save()
        registrar_bitacora(request.user, "rechazar", "Permisos", f"Permiso #{permiso.id}")
        return Response(PermisoSerializer(permiso, context={"request": request}).data)


class BitacoraAuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Solo lectura: el registro lo crea el sistema, no se edita a mano.
    Admin/Supervisor ven la bitácora completa; cualquier otro usuario
    autenticado solo ve sus propios eventos (la usa "Mi perfil" para
    mostrar la actividad reciente de cualquier rol).
    """

    serializer_class = BitacoraAuditoriaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = BitacoraAuditoria.objects.select_related("usuario", "usuario__rol").all()
        user = self.request.user
        if user.rol and user.rol.nombre in ("Administrador", "Supervisor"):
            return qs
        return qs.filter(usuario=user)


class MeView(APIView):
    """
    GET /api/me/  -> datos del usuario autenticado (rol, nombre, y su
    conductor_id si aplica). El frontend la llama justo después del login
    para saber a dónde mandar al usuario y qué mostrarle según su rol.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        conductor = getattr(user, "conductor", None)
        foto_url = None
        if user.foto:
            foto_url = request.build_absolute_uri(user.foto.url)
        return Response({
            "id": user.id,
            "username": user.username,
            "nombre": user.get_full_name() or user.username,
            "email": user.email,
            "rol": user.rol.nombre if user.rol else None,
            "conductor_id": conductor.id if conductor else None,
            "telefono": user.telefono,
            "domicilio": user.domicilio,
            "foto_url": foto_url,
            "miembro_desde": user.date_joined.strftime("%d/%m/%Y"),
            "preferencias_notificaciones": user.preferencias_notificaciones,
        })


def _generar_codigo_supervisor():
    sufijo = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"SVT-SUP-{sufijo}"


class ConfiguracionSistemaView(APIView):
    """
    GET  /api/configuracion/codigo-supervisor/  -> código de autorización vigente.
    POST /api/configuracion/codigo-supervisor/  -> genera uno nuevo y lo guarda
    (el anterior deja de funcionar de inmediato).

    Solo Administrador/Supervisor pueden verlo o regenerarlo: es el código que
    se comparte con quien deba registrarse como Supervisor o Monitoreo desde
    la pantalla pública de Registro.
    """

    permission_classes = [EsAdminOSupervisor]

    def get(self, request):
        config = ConfiguracionSistema.obtener()
        return Response({"codigo_supervisor": config.codigo_supervisor})

    def post(self, request):
        config = ConfiguracionSistema.obtener()
        config.codigo_supervisor = _generar_codigo_supervisor()
        config.save()
        registrar_bitacora(
            request.user, "regenerar", "Configuración", "Código de autorización de Supervisor"
        )
        return Response({"codigo_supervisor": config.codigo_supervisor})


class RegistroView(APIView):
    """
    POST /api/registro/  (público, sin autenticación)

    Crea una cuenta nueva desde la pantalla de Registro. Para rol Monitoreo
    o Supervisor valida el código de autorización contra
    ConfiguracionSistema.codigo_supervisor.

    Para rol Conductor, esta vista SOLO crea el Usuario (sin ficha de
    Conductor): la ficha (clave, licencia, vigencia, domicilio, etc.) la
    completa después un Administrador o RH desde la pantalla de Conductores.
    Hasta entonces, ese usuario no puede usar Aforo/Permisos porque esas
    pantallas dependen de que exista su registro de Conductor.
    """

    permission_classes = [permissions.AllowAny]

    ROLES_VALIDOS = ("Conductor", "Monitoreo", "Supervisor")
    ROLES_CON_CODIGO = ("Monitoreo", "Supervisor")

    def post(self, request):
        data = request.data
        first_name = (data.get("first_name") or "").strip()
        last_name = (data.get("last_name") or "").strip()
        email = (data.get("email") or "").strip()
        telefono = (data.get("telefono") or "").strip()
        password = data.get("password") or ""
        rol_nombre = data.get("rol") or ""
        codigo = (data.get("codigo_autorizacion") or "").strip()

        if not first_name:
            return Response({"detail": "Falta el nombre."}, status=400)
        if not email:
            return Response({"detail": "Falta el correo electrónico."}, status=400)
        if Usuario.objects.filter(email__iexact=email).exists():
            return Response({"detail": "Ya existe una cuenta con ese correo."}, status=400)
        if len(telefono) != 10 or not telefono.isdigit():
            return Response({"detail": "El teléfono debe tener 10 dígitos."}, status=400)
        if len(password) < 8:
            return Response({"detail": "La contraseña debe tener al menos 8 caracteres."}, status=400)
        if rol_nombre not in self.ROLES_VALIDOS:
            return Response({"detail": "Rol no válido."}, status=400)

        if rol_nombre in self.ROLES_CON_CODIGO:
            config = ConfiguracionSistema.obtener()
            if not codigo or codigo != config.codigo_supervisor:
                return Response(
                    {"detail": f"El código de autorización de {rol_nombre} no es válido."},
                    status=400,
                )

        rol, _ = Rol.objects.get_or_create(nombre=rol_nombre)

        base = slugify(email.split("@")[0]) or "usuario"
        username = base
        i = 1
        while Usuario.objects.filter(username=username).exists():
            i += 1
            username = f"{base}{i}"

        usuario = Usuario(
            username=username,
            first_name=first_name,
            last_name=last_name,
            email=email,
            telefono=telefono,
            rol=rol,
        )
        usuario.set_password(password)
        usuario.save()

        registrar_bitacora(
            usuario, "registrar_cuenta", "Registro", f"Se creó una cuenta nueva (correo: {email})"
        )

        return Response({"detail": "Cuenta creada correctamente."}, status=201)


class MiTokenObtainPairView(TokenObtainPairView):
    """
    Sustituye a TokenObtainPairView en config/urls.py: hace exactamente lo
    mismo (POST /api/token/ -> access + refresh) pero además guarda una
    SesionActiva con el dispositivo (User-Agent) e IP de quien inició
    sesión, para que "Sesión y seguridad" en Configuración pueda mostrar
    sesiones reales en vez del ejemplo fijo que tenía antes.
    """

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        refresh = response.data.get("refresh") if response.status_code == 200 else None
        if refresh:
            try:
                from rest_framework_simplejwt.tokens import RefreshToken

                token = RefreshToken(refresh)
                SesionActiva.objects.create(
                    usuario_id=token["user_id"],
                    refresh_jti=token["jti"],
                    dispositivo=_describir_dispositivo(request.META.get("HTTP_USER_AGENT", "")),
                    ip=request.META.get("REMOTE_ADDR"),
                )
            except Exception:
                # No queremos que un problema al registrar la sesión tumbe el login.
                pass
        return response


class SesionActivaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /api/sesiones/                 -> sesiones activas del usuario autenticado
    POST /api/sesiones/cerrar_todas/    -> invalida (blacklist) todos sus refresh tokens
    Usada por "Sesión y seguridad" en Configuración.
    """

    serializer_class = SesionActivaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SesionActiva.objects.filter(usuario=self.request.user)

    @action(detail=False, methods=["post"])
    def cerrar_todas(self, request):
        sesiones = SesionActiva.objects.filter(usuario=request.user)
        for jti in sesiones.values_list("refresh_jti", flat=True):
            outstanding = OutstandingToken.objects.filter(jti=jti).first()
            if outstanding:
                BlacklistedToken.objects.get_or_create(token=outstanding)
        sesiones.delete()
        registrar_bitacora(
            request.user, "cerrar_sesiones", "Configuración", "Cerró sesión en todos los dispositivos"
        )
        return Response({"detail": "Se cerraron todas las sesiones."})

    @action(detail=True, methods=["post"])
    def cerrar(self, request, pk=None):
        """
        POST /api/sesiones/{id}/cerrar/  -> cierra solo esa sesión.
        get_object() ya limita el queryset a las sesiones del usuario
        autenticado (ver get_queryset), así que nadie puede cerrar la de
        alguien más adivinando un id.
        """
        sesion = self.get_object()
        outstanding = OutstandingToken.objects.filter(jti=sesion.refresh_jti).first()
        if outstanding:
            BlacklistedToken.objects.get_or_create(token=outstanding)
        dispositivo = sesion.dispositivo or "sesión"
        sesion.delete()
        registrar_bitacora(request.user, "cerrar_sesion", "Configuración", f"Cerró la sesión: {dispositivo}")
        return Response({"detail": "Sesión cerrada."})


class HallazgoAuditoriaViewSet(viewsets.ModelViewSet):
    """
    Hallazgos de auditorías internas/externas, con fecha límite y fecha de
    cierre. Alimenta el indicador "Cumplimiento a Auditorías" en la pantalla
    del mismo nombre.
    """

    queryset = HallazgoAuditoria.objects.select_related("registrado_por").all()
    serializer_class = HallazgoAuditoriaSerializer
    permission_classes = [EsAdminOSupervisor]

    def perform_create(self, serializer):
        hallazgo = serializer.save(registrado_por=self.request.user)
        registrar_bitacora(
            self.request.user, "crear", "Cumplimiento",
            f"Hallazgo de auditoría: {hallazgo.descripcion[:60]}",
        )

    def perform_update(self, serializer):
        hallazgo = serializer.save()
        registrar_bitacora(
            self.request.user, "editar", "Cumplimiento",
            f"Hallazgo de auditoría #{hallazgo.id}",
        )