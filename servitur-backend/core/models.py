"""
core/models.py

Modelos de Django para el Sistema Web Servitur.
Corresponden 1:1 al modelo entidad-relación de la Actividad 2 (11 entidades).

Notas de integración:
- Usuario extiende AbstractUser: agrégalo como AUTH_USER_MODEL en settings.py:
    AUTH_USER_MODEL = "core.Usuario"
  (debe hacerse ANTES de la primera migración; si el proyecto ya tiene
  migraciones con el User por defecto, este cambio requiere migrar desde cero
  o un proceso de migración de usuario personalizado.)
- Todas las tablas usan el "id" autogenerado de Django como PK
  (equivalente a id_rol, id_usuario, etc. del diagrama ER).
- Los ForeignKey usan PROTECT donde borrar el registro padre no debería
  borrar en cascada datos operativos (evita perder historial); usa CASCADE
  donde sí tiene sentido (p. ej. Conductor -> Usuario).
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class Rol(models.Model):
    """Administrador, Supervisor, Monitoreo, RH, Conductor."""

    nombre = models.CharField(max_length=30, unique=True)

    class Meta:
        verbose_name = "Rol"
        verbose_name_plural = "Roles"

    def __str__(self):
        return self.nombre


class Usuario(AbstractUser):
    """Usuario del sistema. Sustituye al User por defecto de Django."""

    rol = models.ForeignKey(Rol, on_delete=models.PROTECT, related_name="usuarios")
    activo = models.BooleanField(default=True)
    # Datos de contacto y foto que cualquier usuario (sin importar su rol)
    # puede editar desde "Mi perfil". Son independientes de los campos de
    # Conductor (que se usan para la ficha administrativa del conductor).
    telefono = models.CharField(max_length=10, blank=True, default="")
    domicilio = models.CharField(max_length=255, blank=True, default="")
    foto = models.FileField(upload_to="perfiles/", null=True, blank=True)
    # Preferencias de notificación de Configuración: {"permiso": {"sistema": true, "correo": false}, ...}
    preferencias_notificaciones = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.get_full_name() or self.username


class Conductor(models.Model):
    usuario = models.OneToOneField(
        Usuario, on_delete=models.CASCADE, related_name="conductor"
    )
    clave = models.CharField(max_length=20, unique=True)
    telefono = models.CharField(max_length=10, blank=True, default="")
    licencia = models.CharField(max_length=30)
    vigencia_licencia = models.DateField()
    domicilio = models.CharField(max_length=255)
    unidad_asignada = models.ForeignKey(
        "Unidad",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conductores_asignados",
        help_text="Unidad asignada de forma fija a este conductor (distinto del Servicio del día).",
    )

    def __str__(self):
        return f"{self.usuario.get_full_name()} ({self.clave})"


class Unidad(models.Model):
    class Tipo(models.TextChoices):
        AUTOBUS = "autobus", "Autobús"
        CAMIONETA = "camioneta", "Camioneta/Van"

    eco = models.CharField(max_length=4, unique=True)
    placas = models.CharField(max_length=15)
    tipo = models.CharField(max_length=15, choices=Tipo.choices)
    tecnologia = models.CharField(max_length=50)
    rendimiento = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="Editado manualmente; ya no se calcula automáticamente.",
    )
    recorrido = models.PositiveIntegerField(default=0)
    kilometraje = models.PositiveIntegerField(default=0)
    # Campos informativos de texto libre (no relaciones): se editan a mano
    # desde la pantalla de Unidades, igual que ya lo hacía el mock del
    # frontend. No sustituyen a Servicio/Conductor.unidad_asignada, que son
    # los datos "oficiales"; estos son solo para el catálogo rápido.
    conductor_actual = models.CharField(max_length=150, blank=True, default="")
    domicilio_conductor = models.CharField(max_length=255, blank=True, default="")
    ruta_actual = models.CharField(max_length=100, blank=True, default="")

    def __str__(self):
        return f"ECO {self.eco}"


class Ruta(models.Model):
    class TipoCamino(models.TextChoices):
        AUTOPISTA = "autopista", "Autopista"
        NORMAL = "normal", "Carretera normal"

    nombre = models.CharField(max_length=50, unique=True)
    tipo_camino = models.CharField(max_length=15, choices=TipoCamino.choices)

    def __str__(self):
        return self.nombre


class Turno(models.Model):
    """
    1er/2do/3er turno (entrada o salida) y Turno mixto (entrada o salida).
    Ej. nombre="1er turno - entrada".
    """

    nombre = models.CharField(max_length=40, unique=True)
    hora_entrada = models.TimeField(null=True, blank=True)
    hora_salida = models.TimeField(null=True, blank=True)

    def __str__(self):
        return self.nombre


class Servicio(models.Model):
    """Asignación de conductor + unidad a una ruta/turno/fecha."""

    conductor = models.ForeignKey(
        Conductor, on_delete=models.PROTECT, related_name="servicios"
    )
    unidad = models.ForeignKey(
        Unidad, on_delete=models.PROTECT, related_name="servicios"
    )
    ruta = models.ForeignKey(Ruta, on_delete=models.PROTECT, related_name="servicios")
    turno = models.ForeignKey(
        Turno, on_delete=models.PROTECT, related_name="servicios"
    )
    fecha = models.DateField()

    class Meta:
        unique_together = ("unidad", "ruta", "turno", "fecha")

    def __str__(self):
        return f"{self.ruta} · {self.fecha}"


class Aforo(models.Model):
    """Registro manual, acumulado por ruta y fecha (no por viaje individual)."""

    ruta = models.ForeignKey(Ruta, on_delete=models.PROTECT, related_name="aforos")
    turno = models.ForeignKey(Turno, on_delete=models.PROTECT, related_name="aforos")
    fecha = models.DateField()
    pasajeros_ida = models.PositiveSmallIntegerField(default=0)
    pasajeros_vuelta = models.PositiveSmallIntegerField(default=0)
    # Foto de evidencia (opcional): un solo archivo por registro, igual que
    # Usuario.foto o Permiso.documento.
    foto = models.FileField(upload_to="aforos/", null=True, blank=True)
    registrado_por = models.ForeignKey(
        Usuario, on_delete=models.PROTECT, related_name="aforos_registrados"
    )

    class Meta:
        unique_together = ("ruta", "turno", "fecha")
        verbose_name_plural = "Aforos"

    def __str__(self):
        return f"Aforo {self.ruta} · {self.fecha}"


class Mantenimiento(models.Model):
    """Registro administrativo simple: categoría + descripción."""

    unidad = models.ForeignKey(
        Unidad, on_delete=models.CASCADE, related_name="mantenimientos"
    )
    categoria = models.CharField(max_length=50)
    descripcion = models.TextField()
    fecha = models.DateField()

    def __str__(self):
        return f"{self.unidad} · {self.categoria} ({self.fecha})"


class Permiso(models.Model):
    """
    Solicitud de permiso personal u oficio de comisión hecha por un conductor,
    con rango de fechas, motivo y un documento de soporte opcional (constancia
    médica, comprobante de trámite, etc.). RH/Administrador/Supervisor la
    aprueban o rechazan (con comentario opcional en el rechazo).
    """

    class Tipo(models.TextChoices):
        PERSONAL = "personal", "Permiso personal"
        OFICIO = "oficio", "Oficio de comisión"

    class Estado(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        AUTORIZADO = "autorizado", "Aprobado"
        RECHAZADO = "rechazado", "Rechazado"

    conductor = models.ForeignKey(
        Conductor, on_delete=models.CASCADE, related_name="permisos"
    )
    tipo = models.CharField(max_length=15, choices=Tipo.choices)
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)
    motivo = models.TextField(blank=True, default="")
    documento = models.FileField(upload_to="permisos/", null=True, blank=True)
    estado = models.CharField(
        max_length=15, choices=Estado.choices, default=Estado.PENDIENTE
    )
    comentario_rechazo = models.TextField(blank=True, default="")
    autorizado_por = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="permisos_autorizados",
    )
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado"]

    def __str__(self):
        return f"{self.conductor} · {self.tipo} ({self.estado})"


class Incidencia(models.Model):
    """
    Retrasos e incidencias operativas (falla mecánica, accidente menor, queja
    de cliente, etc.) registradas por Admin/Supervisor/Monitoreo, asociadas a
    un conductor y una unidad. Alimenta el panel de estadísticas de la
    pestaña "Retrasos e incidencias" dentro de Permisos.
    """

    class Tipo(models.TextChoices):
        RETRASO = "retraso", "Retraso"
        FALLA_MECANICA = "falla_mecanica", "Falla mecánica"
        ACCIDENTE_MENOR = "accidente_menor", "Accidente menor"
        QUEJA_CLIENTE = "queja_cliente", "Queja de cliente"

    conductor = models.ForeignKey(
        Conductor, on_delete=models.CASCADE, related_name="incidencias"
    )
    unidad = models.ForeignKey(
        Unidad, on_delete=models.PROTECT, related_name="incidencias"
    )
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    fecha = models.DateField()
    descripcion = models.TextField()

    class Meta:
        verbose_name_plural = "Incidencias"
        ordering = ["-fecha"]

    def __str__(self):
        return f"{self.get_tipo_display()} · {self.conductor} ({self.fecha})"


class ReporteConductor(models.Model):
    """
    Concentrado digital de la hoja física "Reporte de Conductor"
    (FOPR-MAN-01-02): datos generales del servicio + las 12 categorías de
    actividades reportadas por el conductor / diagnóstico técnico.
    """

    class TipoServicio(models.TextChoices):
        PREVENTIVO = "preventivo", "Preventivo"
        CORRECTIVO = "correctivo", "Correctivo"

    tipo_servicio = models.CharField(
        max_length=15, choices=TipoServicio.choices, default=TipoServicio.PREVENTIVO
    )
    unidad = models.ForeignKey(
        Unidad, on_delete=models.PROTECT, related_name="reportes_conductor"
    )
    kms = models.CharField(max_length=30, blank=True, default="")
    tecnologia = models.CharField(max_length=50, blank=True, default="")
    tipo_servicio_texto = models.CharField(max_length=100, blank=True, default="")
    fecha_ingreso = models.DateField()
    fecha_salida = models.DateField()
    conductor = models.CharField(max_length=150)
    # Lista de 12 dicts: [{"nombre": ..., "actividad": ..., "diagnostico": ..., "firma": ...}, ...]
    categorias = models.JSONField(default=list)
    conformidad_conductor = models.CharField(max_length=150, blank=True, default="")
    firma_jefe_mantenimiento = models.CharField(max_length=150, blank=True, default="")
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Reporte del Conductor"
        verbose_name_plural = "Reportes del Conductor"
        ordering = ["-creado"]

    def __str__(self):
        return f"Reporte {self.conductor} · {self.unidad} ({self.fecha_ingreso})"


class BitacoraAuditoria(models.Model):
    """Registro automático de acciones de usuarios (no la bitácora de Excel)."""

    usuario = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, related_name="acciones"
    )
    accion = models.CharField(max_length=100)
    modulo = models.CharField(max_length=50, blank=True, default="")
    entidad_afectada = models.CharField(max_length=100)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Bitácora de auditoría"
        ordering = ["-fecha"]

    def __str__(self):
        return f"{self.usuario} · {self.accion} ({self.fecha:%Y-%m-%d %H:%M})"


class ConfiguracionSistema(models.Model):
    """
    Configuración global de la plataforma. Se usa como singleton (un solo
    registro, id=1): por ahora solo guarda el código de autorización vigente
    para que alguien pueda registrarse como Supervisor o Monitoreo (ver
    Registro.jsx y Configuración > "Código de autorización de Supervisor").
    """

    codigo_supervisor = models.CharField(max_length=30, default="SVT-SUP-2026")

    class Meta:
        verbose_name = "Configuración del sistema"
        verbose_name_plural = "Configuración del sistema"

    def __str__(self):
        return "Configuración del sistema"

    @classmethod
    def obtener(cls):
        """Devuelve el único registro de configuración, creándolo si no existe."""
        config, _ = cls.objects.get_or_create(pk=1)
        return config


class SesionActiva(models.Model):
    """
    Una fila por cada inicio de sesión exitoso (por cada refresh token
    emitido). Alimenta "Sesión y seguridad" en Configuración: lista de
    dónde ha iniciado sesión el usuario y el botón para cerrarlas todas.
    `refresh_jti` es el "jti" (id único) del refresh token emitido, y es lo
    que se usa para invalidarlo en la lista negra de SimpleJWT al cerrar
    sesión.
    """

    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="sesiones")
    refresh_jti = models.CharField(max_length=255, unique=True)
    dispositivo = models.CharField(max_length=255, blank=True, default="")
    ip = models.GenericIPAddressField(null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Sesión activa"
        verbose_name_plural = "Sesiones activas"
        ordering = ["-creado"]

    def __str__(self):
        return f"{self.usuario} · {self.dispositivo} ({self.creado:%Y-%m-%d %H:%M})"


class HallazgoAuditoria(models.Model):
    """
    Hallazgo (no conformidad) detectado en una auditoría interna o externa,
    con una fecha límite para corregirlo. Alimenta el indicador "Cumplimiento
    a Auditorías": de los hallazgos cuya fecha límite cayó en un mes dado,
    qué porcentaje se cerró a tiempo (fecha_cierre <= fecha_limite).
    """

    descripcion = models.TextField()
    fecha_deteccion = models.DateField()
    fecha_limite = models.DateField()
    fecha_cierre = models.DateField(null=True, blank=True)
    registrado_por = models.ForeignKey(
        Usuario, on_delete=models.PROTECT, related_name="hallazgos_registrados"
    )
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Hallazgo de auditoría"
        verbose_name_plural = "Hallazgos de auditoría"
        ordering = ["-fecha_limite"]

    @property
    def estado(self):
        return "cerrado" if self.fecha_cierre else "abierto"

    @property
    def cerrado_a_tiempo(self):
        return bool(self.fecha_cierre and self.fecha_cierre <= self.fecha_limite)

    def __str__(self):
        return f"{self.descripcion[:40]} (vence {self.fecha_limite})"