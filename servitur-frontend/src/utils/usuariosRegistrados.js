// TODO: esto es un catálogo de cuentas 100% simulado en localStorage, solo
// para que el Login pueda mostrar el nombre real de quien se registró
// mientras no existe backend. Cuando se conecte Django, el registro y el
// login deben validarse y guardarse en el servidor (con contraseña
// hasheada), nunca solo en el navegador.

const CLAVE = 'servitur_usuarios_registrados'

function obtenerTodos() {
  try {
    const guardados = localStorage.getItem(CLAVE)
    return guardados ? JSON.parse(guardados) : []
  } catch {
    return []
  }
}

export function registrarUsuario({ nombre, correo, rol }) {
  const correoNormalizado = correo.trim().toLowerCase()
  const usuarios = obtenerTodos().filter((u) => u.correo !== correoNormalizado)
  usuarios.push({ nombre: nombre.trim(), correo: correoNormalizado, rol })
  localStorage.setItem(CLAVE, JSON.stringify(usuarios))
}

export function buscarUsuarioPorCorreo(correo) {
  const correoNormalizado = correo.trim().toLowerCase()
  return obtenerTodos().find((u) => u.correo === correoNormalizado) ?? null
}