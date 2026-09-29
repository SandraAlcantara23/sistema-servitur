import { Activity } from "lucide-react";

const ACCION_LABELS = {
  crear: "creó",
  actualizar: "actualizó",
  eliminar: "eliminó",
  autorizar: "autorizó",
  rechazar: "rechazó",
  registrar_cuenta: "se registró en",
  cambiar_password: "cambió su contraseña",
  regenerar: "regeneró",
  cerrar_sesiones: "cerró todas sus sesiones",
  cerrar_sesion: "cerró una sesión",
};

function formatearFecha(iso) {
  try {
    return new Date(iso).toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ActividadRecienteCard({ eventos, cargando }) {
  return (
    <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 font-semibold text-servitur-texto">
          <Activity className="w-4 h-4 text-servitur-azul" />
          Actividad reciente
        </h2>
      </div>

      {cargando ? (
        <p className="text-sm text-servitur-texto-secundario">Cargando...</p>
      ) : eventos.length === 0 ? (
        <p className="text-sm text-servitur-texto-secundario">
          Sin actividad registrada todavía.
        </p>
      ) : (
        <ul className="space-y-4">
          {eventos.map((ev) => (
            <li key={ev.id} className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white bg-servitur-azul">
                <Activity className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-servitur-texto">
                  <span className="font-medium">{ev.usuario_nombre}</span>{" "}
                  {ACCION_LABELS[ev.accion] || ev.accion}
                  {ev.entidad_afectada && (
                    <span className="text-servitur-texto-secundario">
                      {" "}
                      — {ev.entidad_afectada}
                    </span>
                  )}
                </p>
                <p className="text-xs text-servitur-texto-secundario/70 mt-0.5">
                  {formatearFecha(ev.fecha)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
