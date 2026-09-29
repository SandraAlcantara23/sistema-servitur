export const stats = [
  { key: 'unidades', label: 'Unidades en operación', value: 18, total: 20, delta: '+2 vs. ayer', trend: 'up', color: 'azul' },
  { key: 'conductores', label: 'Conductores activos', value: 16, total: 18, delta: '+1 vs. ayer', trend: 'up', color: 'rojo' },
  { key: 'viajes', label: 'Viajes hoy', value: 24, total: null, delta: '+4 vs. ayer', trend: 'up', color: 'azul' },
  { key: 'alertas', label: 'Alertas / Incidencias', value: 2, total: null, delta: '+1 vs. ayer', trend: 'down', color: 'rojo' },
]

export const proximosViajes = [
  { hora: '06:00', ruta: 'CDMX - Querétaro', unidad: '5201', conductor: 'Martínez López', estado: 'En ruta' },
  { hora: '08:30', ruta: 'CDMX - Toluca', unidad: '5403', conductor: 'García Hernández', estado: 'En ruta' },
  { hora: '10:00', ruta: 'CDMX - Puebla', unidad: '5307', conductor: 'Ramírez Soto', estado: 'En salida' },
  { hora: '12:30', ruta: 'CDMX - León', unidad: '5502', conductor: 'Torres Velázquez', estado: 'Programado' },
  { hora: '15:00', ruta: 'CDMX - Guadalajara', unidad: '5608', conductor: 'Flores Pérez', estado: 'Programado' },
  { hora: '17:30', ruta: 'CDMX - Monterrey', unidad: '5701', conductor: 'Vargas Ruiz', estado: 'Programado' },
]

export const seguimientoResumen = [
  { estado: 'En ruta', cantidad: 15, color: '#16A34A' },
  { estado: 'En salida', cantidad: 3, color: '#173F63' },
  { estado: 'En espera', cantidad: 1, color: '#9CA3AF' },
  { estado: 'Fuera de servicio', cantidad: 1, color: '#C9252D' },
]

export const resumenViajesSemana = [
  { dia: 'Lun 2', realizados: 22, programados: 20 },
  { dia: 'Mar 3', realizados: 25, programados: 23 },
  { dia: 'Mié 4', realizados: 32, programados: 27 },
  { dia: 'Jue 5', realizados: 34, programados: 29 },
  { dia: 'Vie 6', realizados: 30, programados: 26 },
  { dia: 'Sáb 7', realizados: 26, programados: 22 },
  { dia: 'Dom 8', realizados: 20, programados: 18 },
]

export const noticias = [
  {
    tipo: 'alerta',
    titulo: 'Retraso en salida de unidad 5502',
    detalle: 'Por revisión en taller. Salida estimada 13:00 h.',
    hora: '09:15 a.m.',
    paginaRequerida: 'operaciones',
  },
  {
    tipo: 'info',
    titulo: 'Actualización de rutas',
    detalle: 'Se agregan paradas en ruta CDMX - Puebla.',
    hora: '08:40 a.m.',
    paginaRequerida: 'unidades',
  },
  {
    tipo: 'info',
    titulo: 'Solicitud de permiso pendiente',
    detalle: 'Martínez López solicitó permiso personal para el 20/09.',
    hora: '08:20 a.m.',
    paginaRequerida: 'permisos',
  },
]