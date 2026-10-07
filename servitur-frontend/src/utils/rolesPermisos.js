// Fuente única de verdad para el control de acceso por rol (RBAC) del frontend.
// TODO: cuando exista backend, esta misma matriz debe replicarse ahí — el
// frontend puede ocultar botones y rutas, pero solo el servidor puede
// garantizar que un rol no autorizado no acceda a los datos o acciones.

export const ROLES = ['Administrador', 'Supervisor', 'Monitoreo', 'RH', 'Conductor']

// Claves de página, usadas por el Sidebar, App.jsx (rutas) y Topbar.
export const PAGINAS_POR_ROL = {
  Administrador: ['dashboard', 'unidades', 'operaciones', 'reportes', 'permisos', 'usuarios', 'configuracion', 'auditoria', 'cumplimiento', 'perfil'],
  Supervisor: ['dashboard', 'unidades', 'operaciones', 'reportes', 'permisos', 'usuarios', 'configuracion', 'cumplimiento', 'perfil'],
  Monitoreo: ['dashboard', 'unidades', 'operaciones', 'reportes', 'usuarios', 'configuracion', 'perfil'],
  RH: ['dashboard', 'permisos', 'usuarios', 'configuracion', 'perfil'],
  Conductor: ['operaciones', 'permisos', 'configuracion', 'perfil'],
}

// A dónde mandar a cada rol justo después de iniciar sesión.
export const RUTA_INICIO_POR_ROL = {
  Administrador: '/dashboard',
  Supervisor: '/dashboard',
  Monitoreo: '/dashboard',
  RH: '/dashboard',
  Conductor: '/operaciones',
}

// Secciones dentro de la pantalla de Configuración.
export const CONFIG_SECCIONES_POR_ROL = {
  Administrador: ['datosUsuario', 'contrasena', 'restablecerPasswords', 'codigoSupervisor', 'notificaciones', 'sesionSeguridad', 'gestionRoles', 'apariencia'],
  Supervisor: ['datosUsuario', 'contrasena', 'restablecerPasswords', 'notificaciones', 'sesionSeguridad', 'apariencia'],
  Monitoreo: ['datosUsuario', 'contrasena', 'notificaciones', 'sesionSeguridad', 'apariencia'],
  RH: ['datosUsuario', 'contrasena', 'restablecerPasswords', 'notificaciones', 'sesionSeguridad', 'apariencia'],
  Conductor: ['datosUsuario', 'contrasena', 'notificaciones', 'apariencia'],
}

// A qué página pertenece cada tipo de notificación/evento, para filtrar lo
// que cada rol ve según lo que tiene permitido (Configuración > Notificaciones,
// y la campanita del Topbar).
export const EVENTO_REQUIERE_PAGINA = {
  permiso: 'permisos',
  incidencia: 'usuarios',
  retraso: 'operaciones',
  reporteConductor: 'usuarios',
}

export function paginaPermitida(rol, pagina) {
  return Boolean(PAGINAS_POR_ROL[rol]?.includes(pagina))
}

export function seccionConfigPermitida(rol, seccion) {
  return Boolean(CONFIG_SECCIONES_POR_ROL[rol]?.includes(seccion))
}