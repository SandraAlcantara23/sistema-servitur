import { useEffect, useState } from "react";
import {
  FileBarChart,
  FileDown,
  Save,
  Eye,
  Trash2,
  ClipboardList,
} from "lucide-react";
import AppLayout from "../components/layout/AppLayout.jsx";
import { exportarComoPDF } from "../utils/exportReports.js";
import ReporteConductorPrintable from "../components/reports/ReporteConductorPrintable.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import ConfirmDialog from "../components/common/ConfirmDialog.jsx";
import Toast from "../components/common/Toast.jsx";
import { useToast } from "../hooks/useToast.js";
import { useBitacora } from "../hooks/useBitacora.js";
import { api } from "../services/api.js";

const CATEGORIAS_BASE = [
  "Motor",
  "Tren motriz",
  "Suspensión",
  "Dirección",
  "Frenos",
  "Eléctrico",
  "Audio y video",
  "Radiadores",
  "A/A y calefacción",
  "Llantas y vigía",
  "Lubricación",
  "Carrocería y pintura",
].map((nombre) => ({ nombre, actividad: "", diagnostico: "", firma: "" }));

const FORM_VACIO = {
  tipoServicio: "Preventivo",
  unidad: "",
  kms: "",
  tecnologia: "",
  tipoServicioTexto: "",
  fechaIngreso: "",
  fechaSalida: "",
  conductor: "",
  categorias: CATEGORIAS_BASE,
  conformidadConductor: "",
  firmaJefeMantenimiento: "",
};

// El backend guarda tipo_servicio en minúsculas; el formulario lo maneja
// capitalizado como ya lo hacía el mock.
function normalizarReporte(r) {
  return {
    id: r.id,
    tipoServicio:
      r.tipo_servicio === "correctivo" ? "Correctivo" : "Preventivo",
    unidad: r.unidad_eco,
    kms: r.kms,
    tecnologia: r.tecnologia,
    tipoServicioTexto: r.tipo_servicio_texto,
    fechaIngreso: r.fecha_ingreso,
    fechaSalida: r.fecha_salida,
    conductor: r.conductor,
    categorias: r.categorias,
    conformidadConductor: r.conformidad_conductor,
    firmaJefeMantenimiento: r.firma_jefe_mantenimiento,
    guardadoEl: r.creado,
  };
}

export default function Reportes() {
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState("");
  const [historial, setHistorial] = useState([]);
  const [unidadesOpciones, setUnidadesOpciones] = useState([]);
  const [conductoresOpciones, setConductoresOpciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [reporteParaPDF, setReporteParaPDF] = useState(null);
  const [reporteAEliminar, setReporteAEliminar] = useState(null);
  const { toast, mostrarToast, cerrarToast } = useToast();
  const { registrar } = useBitacora();

  useEffect(() => {
    let activo = true;
    async function cargar() {
      setCargando(true);
      setErrorCarga("");
      try {
        const [unidades, conductores, reportes] = await Promise.all([
          api.get("/unidades/"),
          api.get("/conductores/"),
          api.get("/reportes-conductor/"),
        ]);
        if (!activo) return;
        setUnidadesOpciones(unidades);
        setConductoresOpciones(conductores);
        setHistorial(reportes.map(normalizarReporte));
        setForm((prev) =>
          prev.unidad ? prev : { ...prev, unidad: unidades[0]?.id ?? "" },
        );
      } catch (err) {
        if (activo)
          setErrorCarga(err.message || "No se pudieron cargar los datos.");
      } finally {
        if (activo) setCargando(false);
      }
    }
    cargar();
    return () => {
      activo = false;
    };
  }, []);

  const actualizar = (campo, valor) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const actualizarCategoria = (index, campo, valor) => {
    setForm((prev) => {
      const categorias = [...prev.categorias];
      categorias[index] = { ...categorias[index], [campo]: valor };
      return { ...prev, categorias };
    });
  };

  // Para imprimir el formulario en edición hay que traducir el id de unidad
  // a su ECO (el PDF, igual que antes, solo conoce el ECO).
  const ecoDeUnidad = (idUnidad) =>
    unidadesOpciones.find((u) => u.id === Number(idUnidad))?.eco ?? "";
  const datosParaImprimir = reporteParaPDF ?? {
    ...form,
    unidad: ecoDeUnidad(form.unidad),
  };

  const descargarPDF = () => {
    setReporteParaPDF(null);
    setTimeout(() => exportarComoPDF("reporte-conductor.pdf"), 50);
  };

  const guardarReporte = async () => {
    if (!form.unidad) {
      setError("Selecciona la unidad.");
      return;
    }
    if (!form.conductor.trim()) {
      setError("Selecciona el conductor.");
      return;
    }
    if (!form.fechaIngreso || !form.fechaSalida) {
      setError("Indica la fecha de ingreso y la fecha de salida.");
      return;
    }
    if (form.fechaSalida < form.fechaIngreso) {
      setError(
        "La fecha de salida no puede ser anterior a la fecha de ingreso.",
      );
      return;
    }
    setError("");

    try {
      const guardado = await api.post("/reportes-conductor/", {
        tipo_servicio: form.tipoServicio.toLowerCase(),
        unidad: Number(form.unidad),
        kms: form.kms,
        tecnologia: form.tecnologia,
        tipo_servicio_texto: form.tipoServicioTexto,
        fecha_ingreso: form.fechaIngreso,
        fecha_salida: form.fechaSalida,
        conductor: form.conductor,
        categorias: form.categorias,
        conformidad_conductor: form.conformidadConductor,
        firma_jefe_mantenimiento: form.firmaJefeMantenimiento,
      });
      setHistorial((prev) => [normalizarReporte(guardado), ...prev]);
      mostrarToast("Reporte guardado correctamente.");
      registrar(
        "crear",
        "Reportes",
        `Guardó Reporte del Conductor de ${form.conductor} (unidad ${ecoDeUnidad(form.unidad)}, ${form.fechaIngreso} a ${form.fechaSalida})`,
      );
    } catch (err) {
      mostrarToast(err.message || "No se pudo guardar el reporte.", "error");
    }
  };

  const nuevoReporte = () => {
    setForm({ ...FORM_VACIO, unidad: unidadesOpciones[0]?.id ?? "" });
    setError("");
  };

  const verHistorico = (r) => {
    setReporteParaPDF(r);
    setTimeout(() => {
      exportarComoPDF(
        `reporte-conductor-${r.conductor.replace(/\s+/g, "-")}-${r.fechaIngreso || "sf"}.pdf`,
      );
    }, 100);
  };

  const pedirConfirmacionEliminar = (r) => setReporteAEliminar(r);
  const cancelarEliminar = () => setReporteAEliminar(null);

  const confirmarEliminar = async () => {
    try {
      await api.delete(`/reportes-conductor/${reporteAEliminar.id}/`);
      setHistorial((prev) => prev.filter((x) => x.id !== reporteAEliminar.id));
      registrar(
        "eliminar",
        "Reportes",
        `Eliminó el Reporte del Conductor de ${reporteAEliminar.conductor} (unidad ${reporteAEliminar.unidad})`,
      );
      mostrarToast("Reporte eliminado.");
    } catch (err) {
      mostrarToast(err.message || "No se pudo eliminar el reporte.", "error");
    } finally {
      setReporteAEliminar(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-servitur-texto">
            <FileBarChart className="w-5 h-5 text-servitur-azul" />
            Reporte del Conductor
          </h1>
          <p className="text-sm text-servitur-texto-secundario mt-0.5">
            Concentrado digital de la hoja física "Reporte de Conductor"
            (FOPR-MAN-01-02).
          </p>
        </div>

        {errorCarga && (
          <div className="text-sm text-servitur-rojo bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errorCarga}
          </div>
        )}

        <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 p-4 md:p-6 space-y-6">
          {/* Encabezado del reporte, igual a la hoja física */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">
                Servicio
              </label>
              <div className="flex gap-4 border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5">
                {["Preventivo", "Correctivo"].map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-1.5 text-sm text-servitur-texto cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="tipoServicio"
                      checked={form.tipoServicio === opt}
                      onChange={() => actualizar("tipoServicio", opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">
                Autobús (unidad)
              </label>
              <select
                value={form.unidad}
                onChange={(e) => actualizar("unidad", e.target.value)}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              >
                <option value="">Selecciona una unidad</option>
                {unidadesOpciones.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.eco}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">
                KMS
              </label>
              <input
                type="text"
                value={form.kms}
                onChange={(e) => actualizar("kms", e.target.value)}
                placeholder="Ej. 0179662-4"
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">
                Tecnología
              </label>
              <input
                type="text"
                value={form.tecnologia}
                onChange={(e) => actualizar("tecnologia", e.target.value)}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">
                Tipo de servicio
              </label>
              <input
                type="text"
                value={form.tipoServicioTexto}
                onChange={(e) =>
                  actualizar("tipoServicioTexto", e.target.value)
                }
                placeholder="Ej. Empresarial"
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">
                Fecha de ingreso
              </label>
              <input
                type="date"
                value={form.fechaIngreso}
                onChange={(e) => actualizar("fechaIngreso", e.target.value)}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">
                Fecha de salida
              </label>
              <input
                type="date"
                min={form.fechaIngreso || undefined}
                value={form.fechaSalida}
                onChange={(e) => actualizar("fechaSalida", e.target.value)}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-servitur-texto mb-1">
                Nombre del conductor
              </label>
              <select
                value={form.conductor}
                onChange={(e) => actualizar("conductor", e.target.value)}
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              >
                <option value="">Selecciona un conductor</option>
                {conductoresOpciones.map((c) => (
                  <option key={c.id} value={c.nombre_completo}>
                    {c.nombre_completo}
                    {c.clave ? ` (${c.clave})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Las 12 categorías: actividades del conductor + diagnóstico técnico */}
          <div>
            <h2 className="text-sm font-semibold text-servitur-texto mb-3">
              Actividades reportadas y diagnóstico técnico
            </h2>
            <div className="space-y-3">
              {form.categorias.map((cat, i) => (
                <div
                  key={cat.nombre}
                  className="border border-servitur-texto-secundario/15 rounded-lg overflow-hidden"
                >
                  <p className="bg-servitur-fondo px-3 py-1.5 text-sm font-medium text-servitur-texto">
                    {i + 1}. {cat.nombre}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-servitur-texto-secundario/15">
                    <div className="p-3">
                      <label className="block text-xs text-servitur-texto-secundario mb-1">
                        Actividades reportadas por el conductor
                      </label>
                      <textarea
                        rows={2}
                        value={cat.actividad}
                        onChange={(e) =>
                          actualizarCategoria(i, "actividad", e.target.value)
                        }
                        className="w-full border border-servitur-texto-secundario/30 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-servitur-azul resize-none"
                      />
                    </div>
                    <div className="p-3">
                      <label className="block text-xs text-servitur-texto-secundario mb-1">
                        Diagnóstico técnico (mantenimiento)
                      </label>
                      <textarea
                        rows={2}
                        value={cat.diagnostico}
                        onChange={(e) =>
                          actualizarCategoria(i, "diagnostico", e.target.value)
                        }
                        className="w-full border border-servitur-texto-secundario/30 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-servitur-azul resize-none"
                      />
                      <input
                        type="text"
                        value={cat.firma}
                        onChange={(e) =>
                          actualizarCategoria(i, "firma", e.target.value)
                        }
                        placeholder="Firma / nombre de quien diagnostica"
                        className="w-full border border-servitur-texto-secundario/30 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-servitur-azul mt-2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conformidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">
                Nombre y firma del conductor (conformidad)
              </label>
              <input
                type="text"
                value={form.conformidadConductor}
                onChange={(e) =>
                  actualizar("conformidadConductor", e.target.value)
                }
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-servitur-texto mb-1">
                Firma del jefe de mantenimiento
              </label>
              <input
                type="text"
                value={form.firmaJefeMantenimiento}
                onChange={(e) =>
                  actualizar("firmaJefeMantenimiento", e.target.value)
                }
                className="w-full border border-servitur-texto-secundario/30 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-servitur-azul"
              />
            </div>
          </div>

          {error && <p className="text-sm text-servitur-rojo">{error}</p>}

          <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-servitur-texto-secundario/10">
            <button
              onClick={nuevoReporte}
              className="text-sm text-servitur-texto-secundario hover:underline px-2"
            >
              Nuevo reporte en blanco
            </button>
            <button
              onClick={descargarPDF}
              className="flex items-center gap-1.5 text-sm border border-servitur-azul text-servitur-azul px-4 py-2.5 rounded-lg hover:bg-servitur-azul/5"
            >
              <FileDown className="w-4 h-4" /> Descargar PDF
            </button>
            <button
              onClick={guardarReporte}
              className="flex items-center gap-1.5 bg-servitur-rojo hover:bg-servitur-rojo-hover text-white text-sm font-medium px-5 py-2.5 rounded-lg"
            >
              <Save className="w-4 h-4" /> Guardar reporte
            </button>
          </div>
        </div>

        {/* Historial de reportes guardados */}
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-servitur-texto mb-3">
            <ClipboardList className="w-4 h-4 text-servitur-azul" />
            Reportes guardados
          </h2>

          {cargando ? (
            <p className="text-sm text-servitur-texto-secundario p-6 text-center">
              Cargando reportes...
            </p>
          ) : historial.length === 0 ? (
            <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10">
              <EmptyState
                titulo="Sin reportes guardados"
                descripcion='Los reportes que guardes con el botón "Guardar reporte" aparecerán aquí.'
              />
            </div>
          ) : (
            <div className="bg-servitur-tarjeta rounded-xl shadow-sm border border-servitur-texto-secundario/10 overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="text-left text-servitur-texto-secundario border-b border-servitur-texto-secundario/15">
                    <th className="font-medium py-3 px-4">Guardado el</th>
                    <th className="font-medium py-3 px-2">Unidad</th>
                    <th className="font-medium py-3 px-2">Conductor</th>
                    <th className="font-medium py-3 px-2 hidden sm:table-cell">
                      Servicio
                    </th>
                    <th className="font-medium py-3 px-2 hidden md:table-cell">
                      Periodo
                    </th>
                    <th className="font-medium py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {[...historial]
                    .sort((a, b) => b.guardadoEl.localeCompare(a.guardadoEl))
                    .map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-servitur-texto-secundario/10 last:border-0 hover:bg-servitur-fondo"
                      >
                        <td className="py-2.5 px-4 text-servitur-texto-secundario whitespace-nowrap">
                          {new Date(r.guardadoEl).toLocaleString("es-MX", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-2.5 px-2 font-medium text-servitur-texto">
                          {r.unidad}
                        </td>
                        <td className="py-2.5 px-2 text-servitur-texto">
                          {r.conductor}
                        </td>
                        <td className="py-2.5 px-2 text-servitur-texto-secundario hidden sm:table-cell">
                          {r.tipoServicio}
                        </td>
                        <td className="py-2.5 px-2 text-servitur-texto-secundario hidden md:table-cell">
                          {r.fechaIngreso} — {r.fechaSalida}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => verHistorico(r)}
                              title="Ver / descargar PDF"
                              className="flex items-center gap-1 text-xs text-servitur-azul hover:underline"
                            >
                              <Eye className="w-3.5 h-3.5" /> PDF
                            </button>
                            <button
                              onClick={() => pedirConfirmacionEliminar(r)}
                              title="Eliminar"
                              className="flex items-center gap-1 text-xs text-servitur-rojo hover:underline"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="border-t border-servitur-texto-secundario/10 px-4 py-3 text-sm text-servitur-texto-secundario">
                Total:{" "}
                <span className="font-medium text-servitur-texto">
                  {historial.length} reporte{historial.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="print-area">
        <ReporteConductorPrintable datos={datosParaImprimir} />
      </div>

      <ConfirmDialog
        abierto={Boolean(reporteAEliminar)}
        titulo="Eliminar reporte"
        mensaje={
          reporteAEliminar
            ? `Se eliminará el Reporte del Conductor de ${reporteAEliminar.conductor} (unidad ${reporteAEliminar.unidad}). Esta acción no se puede deshacer.`
            : ""
        }
        textoConfirmar="Sí, eliminar"
        peligro
        onConfirmar={confirmarEliminar}
        onCancelar={cancelarEliminar}
      />

      <Toast toast={toast} onClose={cerrarToast} />
    </AppLayout>
  );
}
