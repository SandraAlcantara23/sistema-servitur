"""
core/views.py
"""
import secrets
import string
from datetime import timedelta

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.settings import api_settings as jwt_settings
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.utils import datetime_from_epoch
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

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
    EsConductorSoloLectura,
    nombre_rol,
    puede_restablecer_password,
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
    """
    Crea un evento en la bitácora de auditoría (siempre del lado del servidor).
    Se recortan los textos al largo de cada columna para que un detalle largo
    nunca tumbe la operación principal con un error de base de datos.
    """
    BitacoraAuditoria.objects.create(
        usuario=usuario,
        accion=str(accion)[:100],
        modulo=str(modulo)[:50],
        entidad_afectada=str(entidad_afectada)[:100],
    )


class BitacoraMixin:
    """
    Registra automáticamente en la bitácora de auditoría cada alta, cambio y
    baja hecha a través de la API, con el usuario que la realizó.

    Cada vista define `modulo_bitacora` y, si quiere un texto más claro,
    sobrescribe `etiqueta_bitacora(obj)`. Si necesita guardar campos extra al
    crear (p. ej. quién lo registró), sobrescribe `datos_extra_creacion()`.
    """

    modulo_bitacora = ""

    def etiqueta_bitacora(self, obj):
        return f"{self.modulo_bitacora} #{obj.pk}"

    def datos_extra_creacion(self):
        return {}

    def perform_create(self, serializer):
        obj = serializer.save(**self.datos_extra_creacion())
        registrar_bitacora(self.request.user, "crear", self.modulo_bitacora, self.etiqueta_bitacora(obj))
        return obj

    def perform_update(self, serializer):
        obj = serializer.save()
        registrar_bitacora(self.request.user, "actualizar", self.modulo_bitacora, self.etiqueta_bitacora(obj))
        return obj

    def perform_destroy(self, instance):
        etiqueta = self.etiqueta_bitacora(instance)
        instance.delete()
        registrar_bitacora(self.request.user, "eliminar", self.modulo_bitacora, etiqueta)


def _es_admin_o_supervisor(request):
    return nombre_rol(request.user) in ("Administrador", "Supervisor")


def _validar_password(password, user=None):
    """Valida con los validadores de Django y regresa la lista de mensajes de error."""
    try:
        validate_password(password, user=user)
    except DjangoValidationError as e:
        return list(e.messages)
    return []


def _invalidar_refresh_jti(jti):
    """
    Mete a la lista negra el refresh token con ese jti, aunque no exista aún
    en OutstandingToken (SimpleJWT no registra los tokens que nacen de una
    rotación, así que hay que crearlo antes de poder invalidarlo).
    """
    outstanding, _ = OutstandingToken.objects.get_or_create(
        jti=jti,
        defaults={
            "token": "",
            "expires_at": timezone.now() + jwt_settings.REFRESH_TOKEN_LIFETIME,
        },
    )
    BlacklistedToken.objects.get_or_create(token=outstanding)


def _cerrar_sesiones_de(usuario):
    """Invalida todos los refresh tokens del usuario y borra sus sesiones activas."""
    sesiones = SesionActiva.objects.filter(usuario=usuario)
    for jti in list(sesiones.values_list("refresh_jti", flat=True)):
        _invalidar_refresh_jti(jti)
    sesiones.delete()


def _generar_password_temporal(usuario):
    """Contraseña aleatoria que además cumple los validadores de Django."""
    for _ in range(10):
        candidata = secrets.token_urlsafe(9)
        if not _validar_password(candidata, user=usuario):
            return candidata
    raise ValidationError("No se pudo generar una contraseña temporal segura. Intenta de nuevo.")


class RolViewSet(viewsets.ModelViewSet):
    """Solo Administrador puede ver/gestionar roles."""

    queryset = Rol.objects.all()
    serializer_class = RolSerializer
    permission_classes = [EsAdministrador]


class UsuarioViewSet(BitacoraMixin, viewsets.ModelViewSet):
    """
    Administrador/Supervisor administran cuentas; cualquier usuario puede ver
    y editar SU PROPIO registro (datos de contacto, foto, preferencias), pero
    las reglas de privilegio (rol, estado, usuario, contraseña ajena) se
    validan en UsuarioSerializer.validate.
    """

    queryset = Usuario.objects.select_related("rol").all()
    serializer_class = UsuarioSerializer
    permission_classes = [EsAdminOSupervisor]
    modulo_bitacora = "Usuarios"

    def etiqueta_bitacora(self, obj):
        return f"Usuario {obj.username}"

    def get_queryset(self):
        # Cada quien puede ver/editar su propio usuario aunque no sea Admin/Supervisor
        if self.action in ("retrieve", "update", "partial_update") and not _es_admin_o_supervisor(self.request):
            return Usuario.objects.filter(pk=self.request.user.pk)
        return super().get_queryset()

    def get_permissions(self):
        if self.action in ("retrieve", "update", "partial_update", "cambiar_password", "restablecer_password"):
            return [permissions.IsAuthenticated()]
        if self.action == "destroy":
            return [EsAdministrador()]
        return super().get_permissions()

    def perform_update(self, serializer):
        cambio_password = "password" in serializer.validated_data
        obj = serializer.save()
        # Los cambios de uno mismo (foto, teléfono, preferencias) son muy
        # frecuentes y no aportan a la auditoría; se registran los hechos
        # sobre cuentas de otras personas.
        if obj.pk != self.request.user.pk:
            registrar_bitacora(self.request.user, "actualizar", self.modulo_bitacora, self.etiqueta_bitacora(obj))
            if cambio_password:
                # Si le cambian la contraseña a alguien, sus sesiones abiertas dejan de servir.
                _cerrar_sesiones_de(obj)
        return obj

    def perform_destroy(self, instance):
        if instance.pk == self.request.user.pk:
            raise PermissionDenied("No puedes eliminar tu propia cuenta.")
        super().perform_destroy(instance)

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
        if not request.user.check_password(actual):
            return Response({"detail": "La contraseña actual no es correcta."}, status=400)
        errores = _validar_password(nueva, user=request.user)
        if errores:
            return Response({"detail": " ".join(errores)}, status=400)
        request.user.set_password(nueva)
        request.user.save()
        registrar_bitacora(request.user, "cambiar_password", "Configuración", "Cambió su contraseña")
        return Response({"detail": "Contraseña actualizada."})


    @action(detail=True, methods=["post"])
    def restablecer_password(self, request, pk=None):
        """
        POST /api/usuarios/{id}/restablecer_password/
        Para cuando alguien olvidó su contraseña. Genera una contraseña
        temporal aleatoria, la guarda cifrada, cierra las sesiones abiertas de
        esa cuenta y la devuelve UNA sola vez en la respuesta para que quien
        la restableció se la entregue a la persona. Queda en la bitácora.

        Quién puede a quién: ver permissions.puede_restablecer_password.
        """
        if nombre_rol(request.user) not in ("Administrador", "Supervisor", "RH"):
            raise PermissionDenied("No tienes permiso para restablecer contraseñas.")
        objetivo = self.get_object()
        if objetivo.pk == request.user.pk:
            raise PermissionDenied("Para cambiar tu contraseña usa la opción «Cambiar contraseña».")
        if not puede_restablecer_password(request.user, objetivo):
            raise PermissionDenied("No tienes permiso para restablecer la contraseña de esa cuenta.")
        if not (objetivo.is_active and objetivo.activo):
            return Response(
                {"detail": "La cuenta está dada de baja; reactívala antes de restablecer su contraseña."},
                status=400,
            )

        temporal = _generar_password_temporal(objetivo)
        objetivo.set_password(temporal)
        objetivo.save()
        _cerrar_sesiones_de(objetivo)
        registrar_bitacora(
            request.user, "restablecer_password", self.modulo_bitacora, self.etiqueta_bitacora(objetivo)
        )
        return Response(
            {
                "detail": "Contraseña restablecida. Entrégala a la persona; no se volverá a mostrar.",
                "usuario_username": objetivo.username,
                "password_temporal": temporal,
            },
            headers={"Cache-Control": "no-store"},
        )


class ConductorViewSet(BitacoraMixin, viewsets.ModelViewSet):
    queryset = Conductor.objects.select_related("usuario", "unidad_asignada").all()
    serializer_class = ConductorSerializer
    permission_classes = [EsPersonalOperativo | EsRH]
    modulo_bitacora = "Conductores"

    def etiqueta_bitacora(self, obj):
        return f"Conductor {obj.clave}"


class UnidadViewSet(BitacoraMixin, viewsets.ModelViewSet):
    queryset = Unidad.objects.all()
    serializer_class = UnidadSerializer
    permission_classes = [EsPersonalOperativo]
    modulo_bitacora = "Unidades"

    def etiqueta_bitacora(self, obj):
        return f"Unidad {obj.eco}"


class RutaViewSet(BitacoraMixin, viewsets.ModelViewSet):
    """Catálogo de rutas. El Conductor solo puede consultarlo (lo necesita su pantalla de Aforo)."""

    queryset = Ruta.objects.all()
    serializer_class = RutaSerializer
    permission_classes = [EsPersonalOperativo | EsConductorSoloLectura]
    modulo_bitacora = "Rutas"

    def etiqueta_bitacora(self, obj):
        return f"Ruta {obj.nombre}"


class TurnoViewSet(BitacoraMixin, viewsets.ModelViewSet):
    """Catálogo de turnos. El Conductor solo puede consultarlo (lo necesita su pantalla de Aforo)."""

    queryset = Turno.objects.all()
    serializer_class = TurnoSerializer
    permission_classes = [EsPersonalOperativo | EsConductorSoloLectura]
    modulo_bitacora = "Turnos"

    def etiqueta_bitacora(self, obj):
        return f"Turno {obj.nombre}"


class ServicioViewSet(BitacoraMixin, viewsets.ModelViewSet):
    queryset = Servicio.objects.select_related("conductor", "unidad", "ruta", "turno").all()
    serializer_class = ServicioSerializer
    permission_classes = [EsPersonalOperativo]
    modulo_bitacora = "Servicios"


class AforoViewSet(BitacoraMixin, viewsets.ModelViewSet):
    """Personal operativo ve todo; un Conductor solo ve/crea lo suyo."""

    serializer_class = AforoSerializer
    permission_classes = [EsPersonalOperativo | EsConductor]
    modulo_bitacora = "Aforo"

    def get_serializer_context(self):
        # Necesario para que foto_url arme una URL absoluta.
        return {**super().get_serializer_context(), "request": self.request}

    def get_queryset(self):
        qs = Aforo.objects.select_related("ruta", "turno", "registrado_por").all()
        user = self.request.user
        if nombre_rol(user) in ("Administrador", "Supervisor", "Monitoreo"):
            return qs
        return qs.filter(registrado_por=user)

    def datos_extra_creacion(self):
        return {"registrado_por": self.request.user}

    def etiqueta_bitacora(self, obj):
        return f"Aforo #{obj.pk}"


class MantenimientoViewSet(BitacoraMixin, viewsets.ModelViewSet):
    queryset = Mantenimiento.objects.select_related("unidad").all()
    serializer_class = MantenimientoSerializer
    permission_classes = [EsPersonalOperativo]
    modulo_bitacora = "Mantenimiento"

    def etiqueta_bitacora(self, obj):
        return f"Mantenimiento {obj.categoria} de la unidad {obj.unidad.eco}"


class IncidenciaViewSet(BitacoraMixin, viewsets.ModelViewSet):
    """
    Admin/Supervisor/Monitoreo ven y registran todas las incidencias.
    Un Conductor solo puede CONSULTAR las suyas: no puede crear, editar ni
    borrar (así nadie puede inventar ni ocultar incidencias).
    """

    serializer_class = IncidenciaSerializer
    permission_classes = [EsPersonalOperativo | EsConductorSoloLectura]
    modulo_bitacora = "Incidencias"

    def get_queryset(self):
        qs = Incidencia.objects.select_related("conductor__usuario", "unidad").all()
        user = self.request.user
        if nombre_rol(user) in ("Administrador", "Supervisor", "Monitoreo"):
            return qs
        return qs.filter(conductor__usuario=user)

    def etiqueta_bitacora(self, obj):
        return f"Incidencia #{obj.pk} ({obj.tipo}) de {obj.conductor}"


class ReporteConductorViewSet(BitacoraMixin, viewsets.ModelViewSet):
    """Concentrado digital del formato "Reporte de Conductor" (FOPR-MAN-01-02)."""

    queryset = ReporteConductor.objects.select_related("unidad").all()
    serializer_class = ReporteConductorSerializer
    permission_classes = [EsPersonalOperativo]
    modulo_bitacora = "Reportes"

    def etiqueta_bitacora(self, obj):
        return f"Reporte del Conductor de {obj.conductor} (unidad {obj.unidad.eco})"


class PermisoViewSet(BitacoraMixin, viewsets.ModelViewSet):
    """
    Administrador/Supervisor y RH ven y autorizan/rechazan todo.
    Un Conductor solo ve/crea sus propias solicitudes (personal u oficio de
    comisión), con rango de fechas, motivo y un documento de soporte opcional,
    y solo puede modificarlas o cancelarlas mientras sigan PENDIENTES.
    """

    serializer_class = PermisoSerializer
    permission_classes = [EsAdminOSupervisor | EsRH | EsConductor]
    modulo_bitacora = "Permisos"

    def get_serializer_context(self):
        # Necesario para que documento_url arme una URL absoluta.
        return {**super().get_serializer_context(), "request": self.request}

    def get_queryset(self):
        qs = Permiso.objects.select_related("conductor__usuario", "autorizado_por").all()
        user = self.request.user
        if nombre_rol(user) in ("Administrador", "Supervisor", "RH"):
            return qs
        # Conductor: solo lo suyo
        return qs.filter(conductor__usuario=user)

    def _es_gestor(self):
        return nombre_rol(self.request.user) in ("Administrador", "Supervisor", "RH")

    def _exigir_pendiente_si_conductor(self, permiso):
        if not self._es_gestor() and permiso.estado != Permiso.Estado.PENDIENTE:
            raise PermissionDenied("Solo puedes modificar o cancelar solicitudes que sigan pendientes.")

    def etiqueta_bitacora(self, obj):
        return f"Permiso #{obj.pk}"

    def perform_create(self, serializer):
        conductor = getattr(self.request.user, "conductor", None)
        if conductor is not None and not self._es_gestor():
            # Un Conductor siempre crea la solicitud a su propio nombre.
            permiso = serializer.save(conductor=conductor)
        else:
            if "conductor" not in serializer.validated_data:
                raise ValidationError({"conductor": "Indica el conductor de la solicitud."})
            permiso = serializer.save()
        registrar_bitacora(self.request.user, "crear", "Permisos", self.etiqueta_bitacora(permiso))

    def perform_update(self, serializer):
        permiso = serializer.instance
        self._exigir_pendiente_si_conductor(permiso)
        if self._es_gestor():
            serializer.save()
        else:
            # El Conductor no puede reasignar la solicitud a otra persona.
            serializer.save(conductor=permiso.conductor)
        registrar_bitacora(self.request.user, "actualizar", "Permisos", self.etiqueta_bitacora(permiso))

    def perform_destroy(self, instance):
        self._exigir_pendiente_si_conductor(instance)
        super().perform_destroy(instance)

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
        if nombre_rol(user) in ("Administrador", "Supervisor"):
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
    sufijo = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    return f"SVT-SUP-{sufijo}"


class ConfiguracionSistemaView(APIView):
    """
    GET  /api/configuracion/codigo-supervisor/  -> código de autorización vigente.
    POST /api/configuracion/codigo-supervisor/  -> genera uno nuevo y lo guarda
    (el anterior deja de funcionar de inmediato).

    Solo el Administrador puede verlo o regenerarlo (el Supervisor no, según
    la tabla RBAC): es el código que se comparte con quien deba registrarse
    como Supervisor o Monitoreo desde la pantalla pública de Registro.
    """

    permission_classes = [EsAdministrador]

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

    Tiene límite de intentos por IP (scope "registro") para frenar el
    adivinar el código de autorización por fuerza bruta.
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "registro"

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
        if rol_nombre not in self.ROLES_VALIDOS:
            return Response({"detail": "Rol no válido."}, status=400)

        if rol_nombre in self.ROLES_CON_CODIGO:
            config = ConfiguracionSistema.obtener()
            if not codigo or not secrets.compare_digest(codigo, config.codigo_supervisor):
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

        errores = _validar_password(password, user=usuario)
        if errores:
            return Response({"detail": " ".join(errores)}, status=400)

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
    sesión, y deja constancia en la bitácora de auditoría. Tiene límite de
    intentos por IP (scope "login") contra fuerza bruta de contraseñas.
    """

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        refresh = response.data.get("refresh") if response.status_code == 200 else None
        if refresh:
            try:
                token = RefreshToken(refresh)
                usuario = Usuario.objects.get(pk=token["user_id"])
                SesionActiva.objects.create(
                    usuario=usuario,
                    refresh_jti=token["jti"],
                    dispositivo=_describir_dispositivo(request.META.get("HTTP_USER_AGENT", "")),
                    ip=request.META.get("REMOTE_ADDR"),
                )
                registrar_bitacora(usuario, "iniciar_sesion", "Sesión", "Inició sesión")
            except Exception:
                # No queremos que un problema al registrar la sesión tumbe el login.
                pass
        return response


class MiTokenRefreshView(TokenRefreshView):
    """
    Sustituye a TokenRefreshView. Como los refresh tokens ROTAN (cada
    renovación emite uno nuevo con otro jti), hay que mantener la SesionActiva
    apuntando al jti VIGENTE; si no, "Cerrar sesión" invalidaría un token
    viejo y el nuevo seguiría funcionando.
    """

    def post(self, request, *args, **kwargs):
        jti_anterior = None
        try:
            jti_anterior = RefreshToken(request.data.get("refresh", ""))["jti"]
        except Exception:
            pass

        response = super().post(request, *args, **kwargs)

        nuevo = response.data.get("refresh") if response.status_code == 200 else None
        if nuevo and jti_anterior:
            try:
                token = RefreshToken(nuevo)
                # Registrar el token nuevo para que pueda invalidarse después.
                OutstandingToken.objects.get_or_create(
                    jti=token["jti"],
                    defaults={
                        "user_id": token["user_id"],
                        "token": nuevo,
                        "created_at": timezone.now(),
                        "expires_at": datetime_from_epoch(token["exp"]),
                    },
                )
                SesionActiva.objects.filter(refresh_jti=jti_anterior).update(refresh_jti=token["jti"])
            except Exception:
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
        for jti in list(sesiones.values_list("refresh_jti", flat=True)):
            _invalidar_refresh_jti(jti)
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
        _invalidar_refresh_jti(sesion.refresh_jti)
        dispositivo = sesion.dispositivo or "sesión"
        sesion.delete()
        registrar_bitacora(request.user, "cerrar_sesion", "Configuración", f"Cerró la sesión: {dispositivo}")
        return Response({"detail": "Sesión cerrada."})


class HallazgoAuditoriaViewSet(BitacoraMixin, viewsets.ModelViewSet):
    """
    Hallazgos de auditorías internas/externas, con fecha límite y fecha de
    cierre. Alimenta el indicador "Cumplimiento a Auditorías" en la pantalla
    del mismo nombre.
    """

    queryset = HallazgoAuditoria.objects.select_related("registrado_por").all()
    serializer_class = HallazgoAuditoriaSerializer
    permission_classes = [EsAdminOSupervisor]
    modulo_bitacora = "Cumplimiento"

    def datos_extra_creacion(self):
        return {"registrado_por": self.request.user}

    def etiqueta_bitacora(self, obj):
        return f"Hallazgo de auditoría #{obj.pk}: {obj.descripcion[:50]}"
