"""
core/tests.py

Pruebas automáticas del backend (Actividad 6: Pruebas y seguridad).
Correr con:
    python manage.py test                                   (con PostgreSQL / Docker)
    python manage.py test --settings=config.settings_test   (rápido, sin PostgreSQL)

Cubren: control de acceso por rol (RBAC), escalada de privilegios, reglas
del Conductor, sesiones/tokens, bitácora de auditoría y registro de cuentas.
"""
from datetime import date, time

from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APIClient, APITestCase

from .models import (
    Aforo,
    BitacoraAuditoria,
    Conductor,
    ConfiguracionSistema,
    Incidencia,
    Permiso,
    Rol,
    Ruta,
    SesionActiva,
    Turno,
    Unidad,
    Usuario,
)

CLAVE = "Servitur#2026"  # contraseña válida para las pruebas


class BaseAPITest(APITestCase):
    """Crea los 5 roles, un usuario por rol y datos mínimos de catálogo."""

    @classmethod
    def setUpTestData(cls):
        cls.roles = {n: Rol.objects.create(nombre=n) for n in
                     ("Administrador", "Supervisor", "Monitoreo", "RH", "Conductor")}
        cls.admin = cls._usuario("admin1", "Administrador")
        cls.supervisor = cls._usuario("super1", "Supervisor")
        cls.monitoreo = cls._usuario("monit1", "Monitoreo")
        cls.rh = cls._usuario("rh1", "RH")
        cls.u_cond1 = cls._usuario("cond1", "Conductor")
        cls.u_cond2 = cls._usuario("cond2", "Conductor")

        cls.unidad = Unidad.objects.create(eco="5200", placas="ABC123", tipo="autobus", tecnologia="Diesel")
        cls.cond1 = Conductor.objects.create(
            usuario=cls.u_cond1, clave="C-001", licencia="L1",
            vigencia_licencia=date(2030, 1, 1), domicilio="Calle 1", unidad_asignada=cls.unidad,
        )
        cls.cond2 = Conductor.objects.create(
            usuario=cls.u_cond2, clave="C-002", licencia="L2",
            vigencia_licencia=date(2030, 1, 1), domicilio="Calle 2",
        )
        cls.ruta = Ruta.objects.create(nombre="Jilotepec", tipo_camino="autopista")
        cls.turno = Turno.objects.create(nombre="1er turno - entrada", hora_entrada=time(6, 30))

    @classmethod
    def _usuario(cls, username, rol):
        u = Usuario(username=username, email=f"{username}@servitur.test",
                    first_name=username.capitalize(), rol=cls.roles[rol])
        u.set_password(CLAVE)
        u.save()
        return u

    def setUp(self):
        cache.clear()  # reinicia los contadores de throttling entre pruebas

    def cliente(self, usuario):
        c = APIClient()
        c.force_authenticate(user=usuario)
        return c


# --------------------------------------------------------------------------
# 1. Matriz de acceso por rol (RBAC)
# --------------------------------------------------------------------------
class MatrizRBACTest(BaseAPITest):
    def assertAcceso(self, usuario, url, permitido):
        r = self.cliente(usuario).get(url)
        esperado = (200,) if permitido else (403,)
        self.assertIn(r.status_code, esperado, f"{usuario.username} GET {url} -> {r.status_code}")

    def test_sin_autenticar_no_hay_acceso(self):
        for url in ("/api/unidades/", "/api/permisos/", "/api/usuarios/", "/api/bitacora/", "/api/me/"):
            self.assertEqual(APIClient().get(url).status_code, 401, url)

    def test_unidades_solo_personal_operativo(self):
        for u, ok in ((self.admin, 1), (self.supervisor, 1), (self.monitoreo, 1), (self.rh, 0), (self.u_cond1, 0)):
            self.assertAcceso(u, "/api/unidades/", ok)

    def test_permisos_no_los_ve_monitoreo(self):
        for u, ok in ((self.admin, 1), (self.supervisor, 1), (self.rh, 1), (self.u_cond1, 1), (self.monitoreo, 0)):
            self.assertAcceso(u, "/api/permisos/", ok)

    def test_conductores_no_los_lista_un_conductor(self):
        for u, ok in ((self.admin, 1), (self.monitoreo, 1), (self.rh, 1), (self.u_cond1, 0)):
            self.assertAcceso(u, "/api/conductores/", ok)

    def test_roles_solo_administrador(self):
        for u, ok in ((self.admin, 1), (self.supervisor, 0), (self.monitoreo, 0), (self.rh, 0), (self.u_cond1, 0)):
            self.assertAcceso(u, "/api/roles/", ok)

    def test_lista_de_usuarios_solo_admin_o_supervisor(self):
        for u, ok in ((self.admin, 1), (self.supervisor, 1), (self.monitoreo, 0), (self.rh, 0), (self.u_cond1, 0)):
            self.assertAcceso(u, "/api/usuarios/", ok)

    def test_hallazgos_solo_admin_o_supervisor(self):
        for u, ok in ((self.admin, 1), (self.supervisor, 1), (self.monitoreo, 0), (self.rh, 0), (self.u_cond1, 0)):
            self.assertAcceso(u, "/api/hallazgos-auditoria/", ok)

    def test_codigo_supervisor_solo_administrador(self):
        for u, ok in ((self.admin, 1), (self.supervisor, 0), (self.monitoreo, 0), (self.rh, 0), (self.u_cond1, 0)):
            self.assertAcceso(u, "/api/configuracion/codigo-supervisor/", ok)

    def test_bitacora_completa_solo_admin_o_supervisor(self):
        BitacoraAuditoria.objects.create(usuario=self.admin, accion="crear", modulo="X", entidad_afectada="a")
        BitacoraAuditoria.objects.create(usuario=self.u_cond1, accion="crear", modulo="X", entidad_afectada="b")
        self.assertEqual(len(self.cliente(self.admin).get("/api/bitacora/").data), 2)
        self.assertEqual(len(self.cliente(self.supervisor).get("/api/bitacora/").data), 2)
        # Cualquier otro rol solo ve lo suyo
        datos = self.cliente(self.u_cond1).get("/api/bitacora/").data
        self.assertEqual([e["entidad_afectada"] for e in datos], ["b"])


# --------------------------------------------------------------------------
# 2. Escalada de privilegios sobre /api/usuarios/
# --------------------------------------------------------------------------
class EscaladaPrivilegiosTest(BaseAPITest):
    def test_conductor_no_puede_volverse_administrador(self):
        r = self.cliente(self.u_cond1).patch(f"/api/usuarios/{self.u_cond1.id}/", {"rol": self.roles["Administrador"].id})
        self.assertEqual(r.status_code, 403)
        self.u_cond1.refresh_from_db()
        self.assertEqual(self.u_cond1.rol.nombre, "Conductor")

    def test_monitoreo_y_rh_tampoco_pueden_cambiar_su_rol(self):
        for u in (self.monitoreo, self.rh):
            r = self.cliente(u).patch(f"/api/usuarios/{u.id}/", {"rol": self.roles["Administrador"].id})
            self.assertEqual(r.status_code, 403, u.username)

    def test_usuario_no_puede_cambiar_su_usuario_ni_reactivarse(self):
        c = self.cliente(self.u_cond1)
        self.assertEqual(c.patch(f"/api/usuarios/{self.u_cond1.id}/", {"username": "otro"}).status_code, 403)
        self.assertEqual(c.patch(f"/api/usuarios/{self.u_cond1.id}/", {"is_active": False}).status_code, 403)

    def test_usuario_si_puede_editar_sus_datos_de_contacto(self):
        r = self.cliente(self.u_cond1).patch(
            f"/api/usuarios/{self.u_cond1.id}/",
            {"first_name": "Nuevo", "telefono": "7731234567", "preferencias_notificaciones": {"permisos": True}},
            format="json",
        )
        self.assertEqual(r.status_code, 200, r.data)
        self.u_cond1.refresh_from_db()
        self.assertEqual(self.u_cond1.first_name, "Nuevo")

    def test_usuario_no_puede_ver_ni_editar_a_otro(self):
        r = self.cliente(self.u_cond1).patch(f"/api/usuarios/{self.u_cond2.id}/", {"first_name": "Hack"})
        self.assertEqual(r.status_code, 404)

    def test_supervisor_no_puede_cambiar_roles(self):
        r = self.cliente(self.supervisor).patch(f"/api/usuarios/{self.u_cond1.id}/", {"rol": self.roles["Monitoreo"].id})
        self.assertEqual(r.status_code, 403)

    def test_supervisor_no_puede_tocar_cuenta_de_administrador(self):
        c = self.cliente(self.supervisor)
        self.assertEqual(c.patch(f"/api/usuarios/{self.admin.id}/", {"password": CLAVE + "x"}).status_code, 403)
        self.assertEqual(c.patch(f"/api/usuarios/{self.admin.id}/", {"first_name": "X"}).status_code, 403)

    def test_supervisor_no_puede_crear_administradores(self):
        r = self.cliente(self.supervisor).post(
            "/api/usuarios/", {"username": "nuevo", "rol": self.roles["Administrador"].id, "password": CLAVE},
        )
        self.assertEqual(r.status_code, 403)

    def test_administrador_si_puede_cambiar_roles(self):
        r = self.cliente(self.admin).patch(f"/api/usuarios/{self.u_cond1.id}/", {"rol": self.roles["Monitoreo"].id})
        self.assertEqual(r.status_code, 200, r.data)

    def test_cambiar_password_propia_por_patch_esta_bloqueado(self):
        r = self.cliente(self.u_cond1).patch(f"/api/usuarios/{self.u_cond1.id}/", {"password": CLAVE + "9"})
        self.assertEqual(r.status_code, 403)

    def test_solo_administrador_elimina_usuarios_y_no_a_si_mismo(self):
        self.assertEqual(self.cliente(self.supervisor).delete(f"/api/usuarios/{self.u_cond2.id}/").status_code, 403)
        self.assertEqual(self.cliente(self.admin).delete(f"/api/usuarios/{self.admin.id}/").status_code, 403)

    def test_cambiar_password_exige_actual_y_politica(self):
        c = self.cliente(self.u_cond1)
        self.assertEqual(c.post("/api/usuarios/cambiar_password/", {"actual": "mal", "nueva": CLAVE + "1"}).status_code, 400)
        self.assertEqual(c.post("/api/usuarios/cambiar_password/", {"actual": CLAVE, "nueva": "123"}).status_code, 400)
        self.assertEqual(c.post("/api/usuarios/cambiar_password/", {"actual": CLAVE, "nueva": "12345678"}).status_code, 400)
        r = c.post("/api/usuarios/cambiar_password/", {"actual": CLAVE, "nueva": "NuevaClave#77"})
        self.assertEqual(r.status_code, 200, r.data)
        self.u_cond1.refresh_from_db()
        self.assertTrue(self.u_cond1.check_password("NuevaClave#77"))


# --------------------------------------------------------------------------
# 3. Reglas del Conductor (incidencias, permisos, aforo, catálogos)
# --------------------------------------------------------------------------
class ReglasConductorTest(BaseAPITest):
    def _incidencia(self, conductor):
        return Incidencia.objects.create(
            conductor=conductor, unidad=self.unidad, tipo="retraso", fecha=date(2026, 9, 1), descripcion="x",
        )

    def test_conductor_no_puede_crear_incidencias(self):
        r = self.cliente(self.u_cond1).post("/api/incidencias/", {
            "conductor": self.cond2.id, "unidad": self.unidad.id, "tipo": "retraso",
            "fecha": "2026-09-02", "descripcion": "inventada",
        })
        self.assertEqual(r.status_code, 403)
        self.assertEqual(Incidencia.objects.count(), 0)

    def test_conductor_no_puede_editar_ni_borrar_sus_incidencias(self):
        inc = self._incidencia(self.cond1)
        c = self.cliente(self.u_cond1)
        self.assertEqual(c.get(f"/api/incidencias/{inc.id}/").status_code, 200)  # puede consultarla
        self.assertEqual(c.patch(f"/api/incidencias/{inc.id}/", {"descripcion": "borrada"}).status_code, 403)
        self.assertEqual(c.delete(f"/api/incidencias/{inc.id}/").status_code, 403)
        self.assertTrue(Incidencia.objects.filter(pk=inc.pk).exists())

    def test_conductor_solo_ve_sus_incidencias(self):
        self._incidencia(self.cond1)
        self._incidencia(self.cond2)
        self.assertEqual(len(self.cliente(self.u_cond1).get("/api/incidencias/").data), 1)

    def test_personal_operativo_si_registra_incidencias(self):
        r = self.cliente(self.monitoreo).post("/api/incidencias/", {
            "conductor": self.cond1.id, "unidad": self.unidad.id, "tipo": "retraso",
            "fecha": "2026-09-02", "descripcion": "ok",
        })
        self.assertEqual(r.status_code, 201, r.data)

    # ---- Permisos -------------------------------------------------------
    def _crear_permiso(self, cliente_usuario, **extra):
        datos = {"tipo": "personal", "fecha_inicio": "2026-10-10", "fecha_fin": "2026-10-11", "motivo": "Trámite"}
        datos.update(extra)
        return self.cliente(cliente_usuario).post("/api/permisos/", datos)

    def test_conductor_crea_permiso_siempre_a_su_nombre(self):
        r = self._crear_permiso(self.u_cond1, conductor=self.cond2.id)  # intenta suplantar
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(Permiso.objects.get(pk=r.data["id"]).conductor_id, self.cond1.id)

    def test_conductor_no_puede_autoaprobarse(self):
        r = self._crear_permiso(self.u_cond1, estado="autorizado")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["estado"], "pendiente")
        self.assertEqual(self.cliente(self.u_cond1).post(f"/api/permisos/{r.data['id']}/autorizar/").status_code, 403)

    def test_conductor_edita_o_cancela_solo_mientras_esta_pendiente(self):
        pid = self._crear_permiso(self.u_cond1).data["id"]
        c = self.cliente(self.u_cond1)
        self.assertEqual(c.patch(f"/api/permisos/{pid}/", {"motivo": "Cambio"}).status_code, 200)
        # RH lo autoriza
        self.assertEqual(self.cliente(self.rh).post(f"/api/permisos/{pid}/autorizar/").status_code, 200)
        # Ya autorizado: el conductor no puede modificarlo ni borrarlo
        self.assertEqual(c.patch(f"/api/permisos/{pid}/", {"motivo": "Truco"}).status_code, 403)
        self.assertEqual(c.delete(f"/api/permisos/{pid}/").status_code, 403)
        self.assertTrue(Permiso.objects.filter(pk=pid).exists())

    def test_conductor_no_puede_reasignar_su_permiso_a_otro(self):
        pid = self._crear_permiso(self.u_cond1).data["id"]
        self.cliente(self.u_cond1).patch(f"/api/permisos/{pid}/", {"conductor": self.cond2.id})
        self.assertEqual(Permiso.objects.get(pk=pid).conductor_id, self.cond1.id)

    def test_conductor_no_ve_permisos_ajenos(self):
        pid = self._crear_permiso(self.u_cond1).data["id"]
        self.assertEqual(self.cliente(self.u_cond2).get(f"/api/permisos/{pid}/").status_code, 404)

    def test_rh_autoriza_y_rechaza_y_queda_en_bitacora(self):
        pid = self._crear_permiso(self.u_cond1).data["id"]
        self.assertEqual(self.cliente(self.rh).post(f"/api/permisos/{pid}/rechazar/", {"comentario": "No"}).status_code, 200)
        self.assertEqual(Permiso.objects.get(pk=pid).estado, "rechazado")
        self.assertTrue(BitacoraAuditoria.objects.filter(usuario=self.rh, accion="rechazar").exists())

    def test_staff_debe_indicar_conductor_al_crear_permiso(self):
        r = self._crear_permiso(self.rh)  # sin conductor
        self.assertEqual(r.status_code, 400)

    def test_fechas_invertidas_se_rechazan(self):
        r = self._crear_permiso(self.u_cond1, fecha_inicio="2026-10-12", fecha_fin="2026-10-10")
        self.assertEqual(r.status_code, 400)

    # ---- Aforo y catálogos ---------------------------------------------
    def test_conductor_puede_leer_rutas_y_turnos_pero_no_modificarlos(self):
        c = self.cliente(self.u_cond1)
        self.assertEqual(c.get("/api/rutas/").status_code, 200)
        self.assertEqual(c.get("/api/turnos/").status_code, 200)
        self.assertEqual(c.post("/api/rutas/", {"nombre": "Nueva", "tipo_camino": "normal"}).status_code, 403)
        self.assertEqual(c.delete(f"/api/rutas/{self.ruta.id}/").status_code, 403)
        self.assertEqual(c.patch(f"/api/turnos/{self.turno.id}/", {"nombre": "x"}).status_code, 403)

    def test_rh_no_lee_rutas(self):
        self.assertEqual(self.cliente(self.rh).get("/api/rutas/").status_code, 403)

    def test_conductor_registra_aforo_y_solo_ve_los_suyos(self):
        datos = {"ruta": self.ruta.id, "turno": self.turno.id, "fecha": "2026-10-01",
                 "pasajeros_ida": 30, "pasajeros_vuelta": 28}
        r = self.cliente(self.u_cond1).post("/api/aforos/", datos)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(Aforo.objects.get().registrado_por_id, self.u_cond1.id)
        self.assertEqual(len(self.cliente(self.u_cond1).get("/api/aforos/").data), 1)
        self.assertEqual(len(self.cliente(self.u_cond2).get("/api/aforos/").data), 0)
        self.assertEqual(len(self.cliente(self.monitoreo).get("/api/aforos/").data), 1)

    def test_aforo_duplicado_ruta_turno_fecha_se_rechaza(self):
        datos = {"ruta": self.ruta.id, "turno": self.turno.id, "fecha": "2026-10-01",
                 "pasajeros_ida": 30, "pasajeros_vuelta": 28}
        self.assertEqual(self.cliente(self.u_cond1).post("/api/aforos/", datos).status_code, 201)
        self.assertEqual(self.cliente(self.monitoreo).post("/api/aforos/", datos).status_code, 400)


# --------------------------------------------------------------------------
# 4. Bitácora de auditoría en el servidor
# --------------------------------------------------------------------------
class BitacoraServidorTest(BaseAPITest):
    def test_cambios_en_unidades_quedan_registrados(self):
        c = self.cliente(self.supervisor)
        r = c.post("/api/unidades/", {"eco": "5300", "placas": "XYZ", "tipo": "autobus", "tecnologia": "Diesel"})
        self.assertEqual(r.status_code, 201, r.data)
        uid = r.data["id"]
        c.patch(f"/api/unidades/{uid}/", {"kilometraje": 1000})
        c.delete(f"/api/unidades/{uid}/")
        acciones = list(BitacoraAuditoria.objects.filter(modulo="Unidades", usuario=self.supervisor)
                        .order_by("id").values_list("accion", flat=True))
        self.assertEqual(acciones, ["crear", "actualizar", "eliminar"])

    def test_alta_de_conductor_queda_registrada(self):
        r = self.cliente(self.rh).post("/api/conductores/", {
            "nombre": "Pedro Pérez", "clave": "C-777", "licencia": "L7",
            "vigencia_licencia": "2030-05-05", "domicilio": "Calle 7",
        })
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(BitacoraAuditoria.objects.filter(modulo="Conductores", accion="crear", usuario=self.rh).exists())

    def test_la_bitacora_no_se_puede_modificar_por_la_api(self):
        c = self.cliente(self.admin)
        self.assertEqual(c.post("/api/bitacora/", {"accion": "x"}).status_code, 405)
        ev = BitacoraAuditoria.objects.create(usuario=self.admin, accion="a", modulo="m", entidad_afectada="e")
        self.assertEqual(c.delete(f"/api/bitacora/{ev.id}/").status_code, 405)
        self.assertEqual(c.patch(f"/api/bitacora/{ev.id}/", {"accion": "z"}).status_code, 405)

    def test_detalle_muy_largo_no_rompe_la_operacion(self):
        r = self.cliente(self.supervisor).post("/api/hallazgos-auditoria/", {
            "descripcion": "D" * 500, "fecha_deteccion": "2026-09-01", "fecha_limite": "2026-10-01",
        })
        self.assertEqual(r.status_code, 201, r.data)
        self.assertLessEqual(len(BitacoraAuditoria.objects.latest("id").entidad_afectada), 100)


# --------------------------------------------------------------------------
# 5. Altas de conductores: contraseña temporal
# --------------------------------------------------------------------------
class AltaConductorTest(BaseAPITest):
    def test_no_se_usa_una_contrasena_fija_y_conocida(self):
        r = self.cliente(self.admin).post("/api/conductores/", {
            "nombre": "Ana López", "clave": "C-888", "licencia": "L8",
            "vigencia_licencia": "2030-05-05", "domicilio": "Calle 8",
        })
        self.assertEqual(r.status_code, 201, r.data)
        temporal = r.data["password_temporal"]
        usuario = Usuario.objects.get(username=r.data["usuario_username"])
        self.assertNotEqual(temporal, "servitur123")
        self.assertGreaterEqual(len(temporal), 8)
        self.assertTrue(usuario.check_password(temporal))
        # La contraseña temporal solo se muestra al crear, no al consultar después
        detalle = self.cliente(self.admin).get(f"/api/conductores/{r.data['id']}/")
        self.assertNotIn("password_temporal", detalle.data)

    def test_contrasena_indicada_debe_cumplir_la_politica(self):
        r = self.cliente(self.admin).post("/api/conductores/", {
            "nombre": "Luis Gómez", "clave": "C-999", "licencia": "L9", "password": "123",
            "vigencia_licencia": "2030-05-05", "domicilio": "Calle 9",
        })
        self.assertEqual(r.status_code, 400)


# --------------------------------------------------------------------------
# 6. Registro público y control de intentos
# --------------------------------------------------------------------------
class RegistroTest(BaseAPITest):
    def _datos(self, **extra):
        d = {"first_name": "Nueva", "last_name": "Persona", "email": "nueva@servitur.test",
             "telefono": "7731234567", "password": "Pa55w0rd-Seguro", "rol": "Conductor"}
        d.update(extra)
        return d

    def test_registro_conductor_ok(self):
        r = APIClient().post("/api/registro/", self._datos())
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(BitacoraAuditoria.objects.filter(accion="registrar_cuenta").exists())

    def test_no_se_puede_registrar_como_administrador_ni_rh(self):
        for rol in ("Administrador", "RH", "Otro"):
            self.assertEqual(APIClient().post("/api/registro/", self._datos(rol=rol)).status_code, 400, rol)

    def test_supervisor_y_monitoreo_exigen_codigo_valido(self):
        codigo = ConfiguracionSistema.obtener().codigo_supervisor
        malo = APIClient().post("/api/registro/", self._datos(rol="Supervisor", codigo_autorizacion="SVT-SUP-XXXXXX"))
        self.assertEqual(malo.status_code, 400)
        sin = APIClient().post("/api/registro/", self._datos(rol="Monitoreo"))
        self.assertEqual(sin.status_code, 400)
        bueno = APIClient().post("/api/registro/", self._datos(rol="Monitoreo", codigo_autorizacion=codigo))
        self.assertEqual(bueno.status_code, 201, bueno.data)

    def test_contrasena_debil_y_correo_repetido(self):
        self.assertEqual(APIClient().post("/api/registro/", self._datos(password="12345678")).status_code, 400)
        self.assertEqual(APIClient().post("/api/registro/", self._datos(password="corta")).status_code, 400)
        self.assertEqual(APIClient().post("/api/registro/", self._datos(email="admin1@servitur.test")).status_code, 400)

    def test_telefono_debe_tener_10_digitos(self):
        self.assertEqual(APIClient().post("/api/registro/", self._datos(telefono="123")).status_code, 400)

    def test_limite_de_intentos_en_registro(self):
        from rest_framework.throttling import ScopedRateThrottle
        original = ScopedRateThrottle.THROTTLE_RATES
        ScopedRateThrottle.THROTTLE_RATES = {**original, "registro": "3/hour"}
        try:
            c = APIClient()
            codigos = [c.post("/api/registro/", self._datos(rol="Supervisor", codigo_autorizacion="mal")).status_code
                       for _ in range(5)]
        finally:
            ScopedRateThrottle.THROTTLE_RATES = original
        self.assertEqual(codigos[:3], [400, 400, 400])
        self.assertEqual(codigos[3:], [429, 429])


# --------------------------------------------------------------------------
# 7. Sesiones y tokens JWT
# --------------------------------------------------------------------------
class SesionesTokensTest(BaseAPITest):
    def _login(self, username="cond1", password=CLAVE):
        return APIClient().post("/api/token/", {"username": username, "password": password})

    def test_login_correcto_crea_sesion_y_bitacora(self):
        r = self._login()
        self.assertEqual(r.status_code, 200)
        self.assertEqual(SesionActiva.objects.filter(usuario=self.u_cond1).count(), 1)
        self.assertTrue(BitacoraAuditoria.objects.filter(usuario=self.u_cond1, accion="iniciar_sesion").exists())

    def test_login_incorrecto_no_entra(self):
        self.assertEqual(self._login(password="mala").status_code, 401)
        self.assertEqual(SesionActiva.objects.count(), 0)

    def test_usuario_dado_de_baja_no_puede_entrar(self):
        self.u_cond1.is_active = False
        self.u_cond1.save()
        self.assertEqual(self._login().status_code, 401)

    def test_refresh_rota_el_token_y_sigue_la_misma_sesion(self):
        login = self._login().data
        r = APIClient().post("/api/token/refresh/", {"refresh": login["refresh"]})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertNotEqual(r.data["refresh"], login["refresh"])
        self.assertEqual(SesionActiva.objects.filter(usuario=self.u_cond1).count(), 1)
        # El refresh anterior ya no sirve (se invalida al rotar)
        self.assertEqual(APIClient().post("/api/token/refresh/", {"refresh": login["refresh"]}).status_code, 401)

    def test_cerrar_todas_invalida_tambien_el_token_rotado(self):
        """Antes del arreglo, tras renovar el token la sesión seguía viva aunque se 'cerrara'."""
        login = self._login().data
        rotado = APIClient().post("/api/token/refresh/", {"refresh": login["refresh"]}).data
        cliente = APIClient()
        cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {rotado['access']}")
        self.assertEqual(cliente.post("/api/sesiones/cerrar_todas/").status_code, 200)
        self.assertEqual(SesionActiva.objects.filter(usuario=self.u_cond1).count(), 0)
        # El refresh vigente ya no puede renovar la sesión
        self.assertEqual(APIClient().post("/api/token/refresh/", {"refresh": rotado["refresh"]}).status_code, 401)

    def test_cerrar_una_sesion_invalida_su_refresh(self):
        login = self._login().data
        sesion = SesionActiva.objects.get(usuario=self.u_cond1)
        cliente = APIClient()
        cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {login['access']}")
        self.assertEqual(cliente.post(f"/api/sesiones/{sesion.id}/cerrar/").status_code, 200)
        self.assertEqual(APIClient().post("/api/token/refresh/", {"refresh": login["refresh"]}).status_code, 401)

    def test_no_se_puede_cerrar_la_sesion_de_otro_usuario(self):
        self._login("cond2")
        sesion_ajena = SesionActiva.objects.get(usuario=self.u_cond2)
        r = self.cliente(self.u_cond1).post(f"/api/sesiones/{sesion_ajena.id}/cerrar/")
        self.assertEqual(r.status_code, 404)

    def test_limite_de_intentos_en_login(self):
        from rest_framework.throttling import ScopedRateThrottle
        original = ScopedRateThrottle.THROTTLE_RATES
        ScopedRateThrottle.THROTTLE_RATES = {**original, "login": "3/min"}
        try:
            c = APIClient()
            codigos = [c.post("/api/token/", {"username": "cond1", "password": "mala"}).status_code for _ in range(5)]
        finally:
            ScopedRateThrottle.THROTTLE_RATES = original
        self.assertEqual(codigos[:3], [401, 401, 401])
        self.assertEqual(codigos[3:], [429, 429])


# --------------------------------------------------------------------------
# 8. Restablecer contraseña olvidada (por Administrador / Supervisor / RH)
# --------------------------------------------------------------------------
class RestablecerPasswordTest(BaseAPITest):
    def _url(self, usuario):
        return f"/api/usuarios/{usuario.id}/restablecer_password/"

    def _restablecer(self, quien, objetivo):
        return self.cliente(quien).post(self._url(objetivo))

    def test_administrador_restablece_y_el_usuario_entra_con_la_temporal(self):
        r = self._restablecer(self.admin, self.u_cond1)
        self.assertEqual(r.status_code, 200, r.data)
        temporal = r.data["password_temporal"]
        self.assertEqual(r.data["usuario_username"], "cond1")
        self.assertEqual(r["Cache-Control"], "no-store")
        self.assertNotEqual(temporal, CLAVE)
        # La contraseña vieja ya no sirve y la temporal sí
        self.assertEqual(APIClient().post("/api/token/", {"username": "cond1", "password": CLAVE}).status_code, 401)
        self.assertEqual(APIClient().post("/api/token/", {"username": "cond1", "password": temporal}).status_code, 200)

    def test_cada_restablecimiento_genera_una_contrasena_distinta(self):
        a = self._restablecer(self.admin, self.u_cond1).data["password_temporal"]
        b = self._restablecer(self.admin, self.u_cond1).data["password_temporal"]
        self.assertNotEqual(a, b)

    def test_la_temporal_no_se_guarda_en_claro_ni_en_la_bitacora(self):
        temporal = self._restablecer(self.admin, self.u_cond1).data["password_temporal"]
        self.u_cond1.refresh_from_db()
        self.assertNotEqual(self.u_cond1.password, temporal)
        self.assertTrue(self.u_cond1.password.startswith(("pbkdf2_", "md5$", "argon2", "bcrypt")))
        for ev in BitacoraAuditoria.objects.all():
            self.assertNotIn(temporal, f"{ev.accion} {ev.modulo} {ev.entidad_afectada}")

    def test_queda_en_la_bitacora_con_quien_lo_hizo(self):
        self._restablecer(self.rh, self.u_cond1)
        ev = BitacoraAuditoria.objects.get(accion="restablecer_password")
        self.assertEqual(ev.usuario, self.rh)
        self.assertIn("cond1", ev.entidad_afectada)

    def test_cierra_las_sesiones_abiertas_de_la_cuenta(self):
        login = APIClient().post("/api/token/", {"username": "cond1", "password": CLAVE}).data
        self.assertEqual(SesionActiva.objects.filter(usuario=self.u_cond1).count(), 1)
        self._restablecer(self.admin, self.u_cond1)
        self.assertEqual(SesionActiva.objects.filter(usuario=self.u_cond1).count(), 0)
        self.assertEqual(APIClient().post("/api/token/refresh/", {"refresh": login["refresh"]}).status_code, 401)

    def test_rh_solo_restablece_a_conductores(self):
        self.assertEqual(self._restablecer(self.rh, self.u_cond1).status_code, 200)
        for objetivo in (self.monitoreo, self.supervisor, self.admin):
            self.assertEqual(self._restablecer(self.rh, objetivo).status_code, 403, objetivo.username)

    def test_supervisor_no_toca_administradores_ni_otros_supervisores(self):
        for objetivo in (self.u_cond1, self.monitoreo, self.rh):
            self.assertEqual(self._restablecer(self.supervisor, objetivo).status_code, 200, objetivo.username)
        otro_sup = self._usuario("super2", "Supervisor")
        self.assertEqual(self._restablecer(self.supervisor, self.admin).status_code, 403)
        self.assertEqual(self._restablecer(self.supervisor, otro_sup).status_code, 403)

    def test_administrador_puede_con_cualquier_rol(self):
        for objetivo in (self.supervisor, self.monitoreo, self.rh, self.u_cond2):
            self.assertEqual(self._restablecer(self.admin, objetivo).status_code, 200, objetivo.username)

    def test_monitoreo_y_conductor_no_pueden_restablecer(self):
        for quien in (self.monitoreo, self.u_cond1):
            self.assertEqual(self._restablecer(quien, self.u_cond2).status_code, 403, quien.username)

    def test_sin_autenticar_no_puede(self):
        self.assertEqual(APIClient().post(self._url(self.u_cond1)).status_code, 401)

    def test_nadie_se_restablece_a_si_mismo(self):
        for quien in (self.admin, self.supervisor, self.rh):
            self.assertEqual(self._restablecer(quien, quien).status_code, 403, quien.username)

    def test_cuenta_dada_de_baja_no_se_restablece(self):
        self.u_cond1.is_active = False
        self.u_cond1.save()
        r = self._restablecer(self.admin, self.u_cond1)
        self.assertEqual(r.status_code, 400)

    def test_usuario_inexistente_da_404(self):
        r = self.cliente(self.admin).post("/api/usuarios/99999/restablecer_password/")
        self.assertEqual(r.status_code, 404)

    def test_solo_acepta_post(self):
        self.assertEqual(self.cliente(self.admin).get(self._url(self.u_cond1)).status_code, 405)

    def test_patch_de_password_ajena_sigue_las_mismas_reglas_y_cierra_sesiones(self):
        # Un Supervisor ya no puede cambiar la contraseña de otro Supervisor por PATCH
        otro_sup = self._usuario("super2", "Supervisor")
        r = self.cliente(self.supervisor).patch(f"/api/usuarios/{otro_sup.id}/", {"password": "OtraClave#88"})
        self.assertEqual(r.status_code, 403)
        # Un Administrador sí, y se cierran las sesiones de esa cuenta
        APIClient().post("/api/token/", {"username": "cond1", "password": CLAVE})
        r = self.cliente(self.admin).patch(f"/api/usuarios/{self.u_cond1.id}/", {"password": "OtraClave#88"})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(SesionActiva.objects.filter(usuario=self.u_cond1).count(), 0)
