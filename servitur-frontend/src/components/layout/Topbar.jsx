import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  Bell,
  ChevronDown,
  User,
  Search,
  X,
  AlertTriangle,
  Info,
  Wrench,
  Check,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { paginaPermitida, PAGINAS_POR_ROL } from "../../utils/rolesPermisos.js";
import { api } from "../../services/api.js";

const PAGINAS = [
  { label: "Inicio", to: "/dashboard", pagina: "dashboard" },
  { label: "Unidades", to: "/unidades", pagina: "unidades" },
  { label: "Operaciones", to: "/operaciones", pagina: "operaciones" },
  { label: "Reportes", to: "/reportes", pagina: "reportes" },
  { label: "Permisos", to: "/permisos", pagina: "permisos" },
  { label: "Conductores", to: "/usuarios", pagina: "usuarios" },
  { label: "Configuración", to: "/configuracion", pagina: "configuracion" },
];

const ICONOS_NOTIF = {
  alerta: AlertTriangle,
  info: Info,
  mantenimiento: Wrench,
};
const FONDO_ICONO = {
  alerta: "bg-servitur-rojo",
  info: "bg-servitur-azul",
  mantenimiento: "bg-servitur-texto-secundario",
};

const TIPO_PERMISO_LABELS = {
  personal: "permiso personal",
  oficio: "oficio de comisión",
};
const TIPO_INCIDENCIA_LABELS = {
  retraso: "Retraso",
  falla_mecanica: "Falla mecánica",
  accidente_menor: "Accidente menor",
  queja_cliente: "Queja de cliente",
};

// Notificaciones reales: permisos pendientes de autorizar + incidencias
// registradas en los últimos 7 días. Se usan los mismos endpoints que ya
// consume el Dashboard; si el rol actual no tiene acceso a alguno (403), esa
// parte simplemente se omite en vez de romper el resto.
const DIAS_INCIDENCIA_RECIENTE = 7;

const formatearFechaNotif = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
};

// Las notificaciones descartadas/leídas no tienen un modelo propio en el
// backend — se guardan en este navegador (por usuario) para que una vez que
// las quitas o navegas a ellas no te las vuelva a mostrar, aunque el
// permiso/incidencia siga existiendo en la base de datos.
const claveLeidas = (usuarioId) =>
  `servitur_notif_leidas_${usuarioId ?? "anon"}`;

const leerLeidas = (usuarioId) => {
  try {
    return new Set(
      JSON.parse(localStorage.getItem(claveLeidas(usuarioId))) ?? [],
    );
  } catch {
    return new Set();
  }
};

const guardarLeidas = (usuarioId, set) => {
  try {
    localStorage.setItem(claveLeidas(usuarioId), JSON.stringify([...set]));
  } catch {
    // no es crítico si no se puede guardar
  }
};

export default function Topbar({ onToggleSidebar }) {
  const { sesion, cerrarSesion } = useAuth();
  const userName = sesion?.nombre ?? "Usuario";
  const paginasDelRol = PAGINAS_POR_ROL[sesion?.rol] ?? [];
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaMovilAbierta, setBusquedaMovilAbierta] = useState(false);
  const navigate = useNavigate();

  const [notificaciones, setNotificaciones] = useState([]);
  // Unidades reales (desde la API) para el buscador; solo se piden si el rol
  // tiene acceso a la página de Unidades.
  const [unidades, setUnidades] = useState([]);
  const puedeVerUnidades = paginasDelRol.includes("unidades");

  useEffect(() => {
    if (!sesion || !puedeVerUnidades) return;
    let activo = true;
    api
      .get("/unidades/")
      .then((data) => {
        if (activo && Array.isArray(data)) setUnidades(data);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [sesion?.id, puedeVerUnidades]);
  const [leidas, setLeidas] = useState(() => leerLeidas(sesion?.id));

  const cargarNotificaciones = () => {
    if (!sesion) return;
    Promise.allSettled([api.get("/permisos/"), api.get("/incidencias/")]).then(
      ([permisosRes, incidenciasRes]) => {
        const permisos =
          permisosRes.status === "fulfilled" ? permisosRes.value : [];
        const incidencias =
          incidenciasRes.status === "fulfilled" ? incidenciasRes.value : [];

        const permisosPendientes = permisos
          .filter((p) => p.estado === "pendiente")
          .map((p) => ({
            id: `permiso-${p.id}`,
            tipo: "alerta",
            titulo: "Solicitud de permiso pendiente",
            detalle: `${p.conductor_nombre ?? "Un conductor"} solicitó ${TIPO_PERMISO_LABELS[p.tipo] ?? "un permiso"}${
              p.fecha_inicio
                ? ` para el ${formatearFechaNotif(p.fecha_inicio)}`
                : ""
            }.`,
            fechaOrden: p.fecha_inicio || p.creado || "",
            to: "/permisos",
          }));

        const ahora = Date.now();
        const ventanaMs = DIAS_INCIDENCIA_RECIENTE * 24 * 60 * 60 * 1000;
        const incidenciasRecientes = incidencias
          .filter((inc) => {
            const f = new Date(inc.fecha).getTime();
            return !Number.isNaN(f) && ahora - f <= ventanaMs;
          })
          .map((inc) => ({
            id: `incidencia-${inc.id}`,
            tipo: "mantenimiento",
            titulo: TIPO_INCIDENCIA_LABELS[inc.tipo] ?? "Incidencia registrada",
            detalle: `Unidad ${inc.unidad_eco ?? "—"}${inc.conductor_nombre ? ` · ${inc.conductor_nombre}` : ""}.`,
            fechaOrden: inc.fecha || "",
            to: "/permisos",
          }));

        const combinadas = [...permisosPendientes, ...incidenciasRecientes]
          .sort((a, b) =>
            String(b.fechaOrden).localeCompare(String(a.fechaOrden)),
          )
          .slice(0, 8);

        setNotificaciones(combinadas);
      },
    );
  };

  // Carga inicial al iniciar sesión, y de ahí en adelante se refresca sola
  // cada 30s (además de refrescarse cada vez que se abre el dropdown), para
  // que un permiso o incidencia recién creado no tarde en aparecer.
  useEffect(() => {
    if (!sesion) return;
    setLeidas(leerLeidas(sesion?.id));
    cargarNotificaciones();
    const intervalo = setInterval(cargarNotificaciones, 30000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion?.id]);

  const notificacionesVisibles = notificaciones.filter(
    (n) => !leidas.has(n.id),
  );

  const marcarLeida = (id) => {
    setLeidas((prev) => {
      const siguiente = new Set(prev);
      siguiente.add(id);
      guardarLeidas(sesion?.id, siguiente);
      return siguiente;
    });
  };

  const now = new Date();
  const fecha = now.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hora = now.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    const paginas = PAGINAS.filter(
      (p) =>
        paginasDelRol.includes(p.pagina) && p.label.toLowerCase().includes(q),
    ).map((p) => ({
      tipo: "Sección",
      label: p.label,
      to: p.to,
    }));
    const unidadesMatch = paginasDelRol.includes("unidades")
      ? unidades
          .filter(
            (u) =>
              String(u.eco ?? "").toLowerCase().includes(q) ||
              (u.conductor_actual ?? "").toLowerCase().includes(q),
          )
          .slice(0, 6)
          .map((u) => ({
            tipo: "Unidad",
            label: u.conductor_actual
              ? `${u.eco} — ${u.conductor_actual}`
              : `${u.eco}`,
            to: `/unidades/${u.eco}`,
          }))
      : [];
    return [...paginas, ...unidadesMatch];
  }, [busqueda, paginasDelRol, unidades]);

  const irAResultado = (to) => {
    navigate(to);
    setBusqueda("");
    setBusquedaMovilAbierta(false);
  };

  const abrirNotificaciones = () => {
    setNotifOpen((v) => {
      const siguiente = !v;
      if (siguiente) cargarNotificaciones();
      return siguiente;
    });
    setMenuOpen(false);
  };

  const abrirMenuUsuario = () => {
    setMenuOpen((v) => !v);
    setNotifOpen(false);
  };

  // Vista móvil: el buscador se abre y ocupa toda la barra
  if (busquedaMovilAbierta) {
    return (
      <header className="h-16 bg-servitur-tarjeta border-b border-servitur-texto-secundario/15 flex items-center gap-2 px-4">
        <button
          onClick={() => {
            setBusquedaMovilAbierta(false);
            setBusqueda("");
          }}
          className="text-servitur-texto p-2 -ml-2 rounded-lg hover:bg-servitur-fondo shrink-0"
          aria-label="Cerrar búsqueda"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="relative flex-1">
          <input
            autoFocus
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar unidad, conductor o sección..."
            className="w-full bg-servitur-fondo border border-servitur-texto-secundario/25 rounded-lg px-3 py-2 text-sm outline-none focus:border-servitur-azul"
          />
          {resultados.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-servitur-tarjeta border border-servitur-texto-secundario/15 rounded-lg shadow-lg max-h-72 overflow-y-auto z-30">I was a
              {resultados.map((r, i) => (
                <button
                  key={i}
                  onClick={() => irAResultado(r.to)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-servitur-fondo flex items-center justify-between"
                >
                  <span className="text-servitur-texto">{r.label}</span>
                  <span className="text-xs text-servitur-texto-secundario">
                    {r.tipo}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="h-16 bg-servitur-tarjeta border-b border-servitur-texto-secundario/15 flex items-center gap-2 px-4 md:px-6">
      <button
        onClick={onToggleSidebar}
        className="lg:hidden text-servitur-texto p-2 -ml-2 rounded-lg hover:bg-servitur-fondo shrink-0"
        aria-label="Abrir menú"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Buscador — versión escritorio */}
      <div className="relative hidden sm:block sm:w-64 md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-servitur-texto-secundario" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar unidad, conductor o sección..."
          className="w-full bg-servitur-fondo border border-servitur-texto-secundario/25 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-servitur-azul"
        />
        {resultados.length > 0 && (
          <div className="absolute left-0 right-0 mt-1 bg-servitur-tarjeta border border-servitur-texto-secundario/15 rounded-lg shadow-lg max-h-72 overflow-y-auto z-30">
            {resultados.map((r, i) => (
              <button
                key={i}
                onClick={() => irAResultado(r.to)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-servitur-fondo flex items-center justify-between"
              >
                <span className="text-servitur-texto">{r.label}</span>
                <span className="text-xs text-servitur-texto-secundario">
                  {r.tipo}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Buscador — ícono para abrir en móvil */}
      <button
        onClick={() => setBusquedaMovilAbierta(true)}
        className="sm:hidden text-servitur-texto p-2 rounded-lg hover:bg-servitur-fondo"
        aria-label="Buscar"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Grupo derecho — siempre anclado a la derecha con ml-auto */}
      <div className="flex items-center gap-4 md:gap-6 ml-auto">
        {/* Notificaciones */}
        <div className="relative">
          <button
            onClick={abrirNotificaciones}
            className="relative text-servitur-texto p-2 rounded-lg hover:bg-servitur-fondo"
            aria-label="Notificaciones"
          >
            <Bell className="w-5 h-5" />
            {notificacionesVisibles.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-servitur-rojo text-white text-[10px] leading-none w-4 h-4 rounded-full flex items-center justify-center">
                {notificacionesVisibles.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 max-w-[85vw] bg-servitur-tarjeta rounded-lg shadow-lg border border-servitur-texto-secundario/15 z-30">
              <div className="px-4 py-2.5 border-b border-servitur-texto-secundario/15">
                <p className="text-sm font-semibold text-servitur-texto">
                  Notificaciones
                </p>
              </div>
              <ul className="max-h-80 overflow-y-auto divide-y divide-servitur-texto-secundario/10">
                {notificacionesVisibles.length === 0 && (
                  <li className="px-4 py-6 text-center text-sm text-servitur-texto-secundario">
                    Sin notificaciones por ahora.
                  </li>
                )}
                {notificacionesVisibles.map((n) => {
                  const Icon = ICONOS_NOTIF[n.tipo] ?? Info;
                  return (
                    <li key={n.id} className="group relative">
                      <button
                        onClick={() => {
                          setNotifOpen(false);
                          marcarLeida(n.id);
                          if (n.to) navigate(n.to);
                        }}
                        className="w-full text-left px-4 py-3 pr-9 flex items-start gap-3 hover:bg-servitur-fondo"
                      >
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 ${FONDO_ICONO[n.tipo]}`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-servitur-texto">
                            {n.titulo}
                          </p>
                          <p className="text-xs text-servitur-texto-secundario">
                            {n.detalle}
                          </p>
                          {n.fechaOrden && (
                            <p className="text-[11px] text-servitur-texto-secundario/70 mt-0.5">
                              {formatearFechaNotif(n.fechaOrden)}
                            </p>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          marcarLeida(n.id);
                        }}
                        className="absolute top-2.5 right-2 p-1.5 rounded-md text-servitur-texto-secundario opacity-0 group-hover:opacity-100 hover:bg-servitur-fondo hover:text-servitur-texto transition-opacity"
                        aria-label="Descartar notificación"
                        title="Descartar"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Usuario */}
        <div className="relative">
          <button
            onClick={abrirMenuUsuario}
            className="flex items-center gap-2 text-sm font-medium text-servitur-texto hover:bg-servitur-fondo px-2 py-1.5 rounded-lg"
          >
            <span className="w-8 h-8 rounded-full bg-servitur-azul flex items-center justify-center text-white">
              <User className="w-4 h-4" />
            </span>
            <span className="hidden sm:inline">Hola, {userName}</span>
            <ChevronDown className="w-4 h-4 text-servitur-texto-secundario" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-servitur-tarjeta rounded-lg shadow-lg border border-servitur-texto-secundario/15 py-1 z-30">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/perfil");
                }}
                className="w-full text-left px-4 py-2 text-sm text-servitur-texto hover:bg-servitur-fondo"
              >
                Mi perfil
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  cerrarSesion();
                  navigate("/");
                }}
                className="w-full text-left px-4 py-2 text-sm text-servitur-rojo hover:bg-servitur-fondo"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        <div className="hidden lg:block text-right text-sm text-servitur-texto-secundario leading-tight capitalize">
          <p>{fecha}</p>
          <p>{hora}</p>
        </div>
      </div>
    </header>
  );
}





















