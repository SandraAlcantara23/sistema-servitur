"""
core/serializers.py
"""
from datetime import date

from django.utils.text import slugify
from rest_framework import serializers

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


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ["id", "nombre"]


class UsuarioSerializer(serializers.ModelSerializer):
    """Para listar/editar usuarios. La contraseña nunca se devuelve."""

    rol_nombre = serializers.CharField(source="rol.nombre", read_only=True)
    password = serializers.CharField(write_only=True, required=False)
    foto_url = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "rol", "rol_nombre", "activo", "is_active", "password",
            "telefono", "domicilio", "foto", "foto_url",
            "preferencias_notificaciones",
        ]
        extra_kwargs = {
            "foto": {"write_only": True, "required": False},
        }

    def get_foto_url(self, obj):
        if not obj.foto:
            return None
        request = self.context.get("request")
        url = obj.foto.url
        return request.build_absolute_uri(url) if request else url

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        usuario = Usuario(**validated_data)
        if password:
            usuario.set_password(password)
        usuario.save()
        return usuario

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class ConductorSerializer(serializers.ModelSerializer):
    """
    Da de alta/edita un Conductor junto con su Usuario asociado en una sola
    petición, para que el frontend no tenga que hacer dos llamadas:
      - Al crear: si no se manda `usuario`, se crea uno nuevo a partir de
        `nombre` (nombre completo) y un `password` opcional (default
        "servitur123", a cambiar en el primer inicio de sesión).
      - Al editar: `nombre` actualiza first_name/last_name del Usuario, y
        `estatus` ("Activo"/"Baja") actualiza Usuario.activo/is_active.
    """

    usuario = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(), required=False
    )
    nombre = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    nombre_completo = serializers.CharField(
        source="usuario.get_full_name", read_only=True
    )
    estatus = serializers.SerializerMethodField()
    estatus_licencia = serializers.SerializerMethodField()
    unidad_asignada_eco = serializers.SerializerMethodField()

    class Meta:
        model = Conductor
        fields = [
            "id", "usuario", "nombre", "nombre_completo", "clave", "telefono",
            "licencia", "vigencia_licencia", "estatus_licencia", "domicilio",
            "unidad_asignada", "unidad_asignada_eco", "estatus", "password",
        ]

    def get_estatus(self, obj):
        return "Activo" if (obj.usuario.activo and obj.usuario.is_active) else "Baja"

    def get_estatus_licencia(self, obj):
        if not obj.vigencia_licencia:
            return None
        dias = (obj.vigencia_licencia - date.today()).days
        if dias < 0:
            return "Vencida"
        if dias <= 30:
            return "Por vencer"
        return "Vigente"

    def get_unidad_asignada_eco(self, obj):
        return obj.unidad_asignada.eco if obj.unidad_asignada else None

    def _generar_username(self, nombre, clave):
        base = slugify(nombre or clave or "conductor").replace("-", "") or "conductor"
        username = base
        i = 1
        while Usuario.objects.filter(username=username).exists():
            i += 1
            username = f"{base}{i}"
        return username

    def create(self, validated_data):
        nombre = validated_data.pop("nombre", "").strip()
        password = validated_data.pop("password", "") or "servitur123"

        if "usuario" not in validated_data:
            partes = nombre.split(" ", 1)
            first_name = partes[0] if partes else ""
            last_name = partes[1] if len(partes) > 1 else ""
            rol_conductor, _ = Rol.objects.get_or_create(nombre="Conductor")
            usuario = Usuario(
                username=self._generar_username(nombre, validated_data.get("clave")),
                first_name=first_name,
                last_name=last_name,
                rol=rol_conductor,
            )
            usuario.set_password(password)
            usuario.save()
            validated_data["usuario"] = usuario

        return super().create(validated_data)

    def update(self, instance, validated_data):
        nombre = validated_data.pop("nombre", None)
        validated_data.pop("password", None)
        estatus = validated_data.pop("estatus", None) or self.initial_data.get("estatus")

        if nombre:
            partes = nombre.strip().split(" ", 1)
            instance.usuario.first_name = partes[0]
            instance.usuario.last_name = partes[1] if len(partes) > 1 else ""
            instance.usuario.save()

        if estatus in ("Activo", "Baja"):
            instance.usuario.activo = estatus == "Activo"
            instance.usuario.is_active = estatus == "Activo"
            instance.usuario.save()

        return super().update(instance, validated_data)


class UnidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unidad
        fields = [
            "id", "eco", "placas", "tipo", "tecnologia",
            "rendimiento", "recorrido", "kilometraje",
            "conductor_actual", "domicilio_conductor", "ruta_actual",
        ]


class RutaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ruta
        fields = ["id", "nombre", "tipo_camino"]


class TurnoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Turno
        fields = ["id", "nombre", "hora_entrada", "hora_salida"]


class ServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servicio
        fields = ["id", "conductor", "unidad", "ruta", "turno", "fecha"]


class AforoSerializer(serializers.ModelSerializer):
    registrado_por = serializers.PrimaryKeyRelatedField(read_only=True)
    ruta_nombre = serializers.CharField(source="ruta.nombre", read_only=True)
    turno_nombre = serializers.CharField(source="turno.nombre", read_only=True)
    foto_url = serializers.SerializerMethodField()

    class Meta:
        model = Aforo
        fields = [
            "id", "ruta", "ruta_nombre", "turno", "turno_nombre", "fecha",
            "pasajeros_ida", "pasajeros_vuelta", "foto", "foto_url", "registrado_por",
        ]
        extra_kwargs = {
            "foto": {"write_only": True, "required": False},
        }

    def get_foto_url(self, obj):
        if not obj.foto:
            return None
        request = self.context.get("request")
        url = obj.foto.url
        return request.build_absolute_uri(url) if request else url


class MantenimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mantenimiento
        fields = ["id", "unidad", "categoria", "descripcion", "fecha"]


class IncidenciaSerializer(serializers.ModelSerializer):
    conductor_nombre = serializers.SerializerMethodField()
    unidad_eco = serializers.CharField(source="unidad.eco", read_only=True)

    def get_conductor_nombre(self, obj):
        return obj.conductor.usuario.get_full_name() or obj.conductor.usuario.username

    class Meta:
        model = Incidencia
        fields = [
            "id", "conductor", "conductor_nombre", "unidad", "unidad_eco",
            "tipo", "fecha", "descripcion",
        ]


class ReporteConductorSerializer(serializers.ModelSerializer):
    unidad_eco = serializers.CharField(source="unidad.eco", read_only=True)

    class Meta:
        model = ReporteConductor
        fields = [
            "id", "tipo_servicio", "unidad", "unidad_eco", "kms", "tecnologia",
            "tipo_servicio_texto", "fecha_ingreso", "fecha_salida", "conductor",
            "categorias", "conformidad_conductor", "firma_jefe_mantenimiento", "creado",
        ]

    def validate(self, data):
        inicio = data.get("fecha_ingreso", getattr(self.instance, "fecha_ingreso", None))
        fin = data.get("fecha_salida", getattr(self.instance, "fecha_salida", None))
        if inicio and fin and fin < inicio:
            raise serializers.ValidationError(
                {"fecha_salida": "La fecha de salida no puede ser anterior a la fecha de ingreso."}
            )
        return data


class PermisoSerializer(serializers.ModelSerializer):
    """
    conductor es opcional al crear: si quien crea es un Conductor, la vista
    (perform_create) lo asigna automáticamente a su propio registro sin
    importar lo que venga en el payload; solo Admin/Supervisor/RH necesitan
    mandarlo explícitamente para dar de alta la solicitud de alguien más.
    """

    conductor_nombre = serializers.SerializerMethodField()
    autorizado_por = serializers.PrimaryKeyRelatedField(read_only=True)
    documento_url = serializers.SerializerMethodField()

    def get_conductor_nombre(self, obj):
        return obj.conductor.usuario.get_full_name() or obj.conductor.usuario.username

    class Meta:
        model = Permiso
        fields = [
            "id", "conductor", "conductor_nombre", "tipo",
            "fecha_inicio", "fecha_fin", "motivo", "documento", "documento_url",
            "estado", "comentario_rechazo", "autorizado_por", "creado",
        ]
        read_only_fields = ["estado", "comentario_rechazo"]
        extra_kwargs = {
            "conductor": {"required": False},
            "documento": {"write_only": True, "required": False},
        }

    def get_documento_url(self, obj):
        if not obj.documento:
            return None
        request = self.context.get("request")
        url = obj.documento.url
        return request.build_absolute_uri(url) if request else url

    def validate(self, data):
        inicio = data.get("fecha_inicio", getattr(self.instance, "fecha_inicio", None))
        fin = data.get("fecha_fin", getattr(self.instance, "fecha_fin", None))
        if inicio and fin and fin < inicio:
            raise serializers.ValidationError(
                {"fecha_fin": "La fecha de fin no puede ser anterior a la fecha de inicio."}
            )
        return data


class BitacoraAuditoriaSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()
    rol = serializers.SerializerMethodField()

    class Meta:
        model = BitacoraAuditoria
        fields = [
            "id", "usuario", "usuario_nombre", "rol", "accion", "modulo",
            "entidad_afectada", "fecha",
        ]
        read_only_fields = fields  # solo lectura, se genera automáticamente

    def get_usuario_nombre(self, obj):
        if not obj.usuario:
            return "(usuario eliminado)"
        return obj.usuario.get_full_name() or obj.usuario.username

    def get_rol(self, obj):
        if not obj.usuario or not obj.usuario.rol:
            return None
        return obj.usuario.rol.nombre


class ConfiguracionSistemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionSistema
        fields = ["codigo_supervisor"]


class SesionActivaSerializer(serializers.ModelSerializer):
    class Meta:
        model = SesionActiva
        fields = ["id", "dispositivo", "ip", "creado"]


class HallazgoAuditoriaSerializer(serializers.ModelSerializer):
    registrado_por_nombre = serializers.SerializerMethodField()
    estado = serializers.CharField(read_only=True)
    cerrado_a_tiempo = serializers.BooleanField(read_only=True)

    class Meta:
        model = HallazgoAuditoria
        fields = [
            "id", "descripcion", "fecha_deteccion", "fecha_limite", "fecha_cierre",
            "estado", "cerrado_a_tiempo", "registrado_por", "registrado_por_nombre", "creado",
        ]
        extra_kwargs = {"registrado_por": {"read_only": True}}

    def get_registrado_por_nombre(self, obj):
        if not obj.registrado_por:
            return None
        return obj.registrado_por.get_full_name() or obj.registrado_por.username

    def validate(self, data):
        limite = data.get("fecha_limite", getattr(self.instance, "fecha_limite", None))
        deteccion = data.get("fecha_deteccion", getattr(self.instance, "fecha_deteccion", None))
        if limite and deteccion and limite < deteccion:
            raise serializers.ValidationError(
                {"fecha_limite": "No puede ser anterior a la fecha de detección."}
            )
        return data
