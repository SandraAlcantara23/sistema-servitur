import { unidades } from './unidadesMock.js'

// Semilla de ejemplo: aforo acumulado por unidad/ruta/turno en distintas fechas recientes.
// En un flujo real, cada registro lo crea el conductor/operador al final de su turno.
const SEMILLA = [
  { diasAtras: 6, aforo: 34, turno: 'Primer turno entrada' },
  { diasAtras: 5, aforo: 41, turno: 'Primer turno salida' },
  { diasAtras: 4, aforo: 29, turno: 'Segundo turno entrada' },
  { diasAtras: 3, aforo: 45, turno: 'Segundo turno salida' },
  { diasAtras: 2, aforo: 38, turno: 'Tercer turno entrada' },
  { diasAtras: 1, aforo: 42, turno: 'Turno mixto entrada' },
]

function fechaHaceNDias(dias) {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString().slice(0, 10)
}

export const registrosAforo = SEMILLA.map((s, i) => {
  const unidad = unidades[i % unidades.length]
  return {
    id: i + 1,
    fecha: fechaHaceNDias(s.diasAtras),
    unidadEco: unidad.eco,
    ruta: unidad.ruta,
    conductor: unidad.conductorActual,
    turno: s.turno,
    aforo: s.aforo,
    fotos: [],
  }
})