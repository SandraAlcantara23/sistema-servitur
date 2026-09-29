const NOMBRES_CONDUCTORES = [
  'Martínez López', 'García Hernández', 'Ramírez Soto', 'Torres Velázquez',
  'Flores Pérez', 'Vargas Ruiz', 'Sánchez Morales', 'Reyes Castillo',
  'Jiménez Ortiz', 'Mendoza Cruz',
]

const DOMICILIOS_CONDUCTORES = [
  'Av. Juárez 145, Jilotepec, Edo. Méx.',
  'Calle Morelos 22, Polotitlán, Edo. Méx.',
  'Priv. Hidalgo 8, Chapa de Mota, Edo. Méx.',
  'Av. Insurgentes 310, Ixtlahuaca, Edo. Méx.',
  'Calle Reforma 56, Jilotepec, Edo. Méx.',
  'Av. 5 de Mayo 12, Aculco, Edo. Méx.',
  'Calle Allende 90, Polotitlán, Edo. Méx.',
  'Priv. Zaragoza 4, Jilotepec, Edo. Méx.',
  'Calle Guerrero 33, Chapa de Mota, Edo. Méx.',
  'Av. Constitución 77, Aculco, Edo. Méx.',
]

const RUTAS = [
  'CDMX - Querétaro', 'CDMX - Toluca', 'CDMX - Puebla', 'CDMX - León',
  'CDMX - Guadalajara', 'CDMX - Monterrey', 'CDMX - Morelia',
]

const ESTATUS = ['Activa', 'Activa', 'Activa', 'En taller', 'Fuera de servicio']

function generarHistorialConductores(i) {
  const anterior1 = NOMBRES_CONDUCTORES[(i + 1) % NOMBRES_CONDUCTORES.length]
  const anterior2 = NOMBRES_CONDUCTORES[(i + 2) % NOMBRES_CONDUCTORES.length]
  const actual = NOMBRES_CONDUCTORES[i % NOMBRES_CONDUCTORES.length]
  return [
    { nombre: actual, desde: '01/07/2025', hasta: null },
    { nombre: anterior1, desde: '01/02/2025', hasta: '30/06/2025' },
    { nombre: anterior2, desde: '15/08/2024', hasta: '31/01/2025' },
  ]
}

export const unidades = Array.from({ length: 37 }, (_, i) => {
  const eco = 5200 + i * 3
  return {
    id: eco,
    eco: String(eco),
    estatus: ESTATUS[i % ESTATUS.length],
    conductorActual: NOMBRES_CONDUCTORES[i % NOMBRES_CONDUCTORES.length],
    domicilioConductor: DOMICILIOS_CONDUCTORES[i % DOMICILIOS_CONDUCTORES.length],
    ruta: RUTAS[i % RUTAS.length],
    rendimiento: (2.2 + ((i * 7) % 15) / 10).toFixed(1),
    recorrido: 180 + ((i * 23) % 220),
    kilometraje: 80000 + i * 3120,
    ultimoMantenimiento: `${(i % 28) + 1}/0${(i % 9) + 1}/2025`,
    historialConductores: generarHistorialConductores(i),
    fotos: [],
  }
})