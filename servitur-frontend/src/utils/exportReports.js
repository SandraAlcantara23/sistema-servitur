import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import ExcelJS from 'exceljs'
import logoUrl from '../assets/logo.jpeg'

/**
 * Genera un PDF real a partir del contenido de .print-area y lo descarga directo
 * (sin abrir el diálogo de impresión del navegador).
 *
 * TODO: cuando se conecte el backend en Django, lo ideal es reemplazar esto por un
 * PDF generado en el servidor (ej. con WeasyPrint o ReportLab).
 */
export async function exportarComoPDF(nombreArchivo = 'reporte.pdf') {
  const elemento = document.querySelector('.print-area')
  if (!elemento) return

  await new Promise((resolve) => setTimeout(resolve, 50))

  const canvas = await html2canvas(elemento, { scale: 2, useCORS: true })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = pageWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  let alturaRestante = imgHeight
  let posicion = 0

  pdf.addImage(imgData, 'PNG', 0, posicion, imgWidth, imgHeight)
  alturaRestante -= pageHeight

  while (alturaRestante > 0) {
    posicion = alturaRestante - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, posicion, imgWidth, imgHeight)
    alturaRestante -= pageHeight
  }

  pdf.save(nombreArchivo)
}

const AZUL_SERVITUR = 'FF173F63'
const GRIS_ZEBRA = 'FFF4F5F6'
const GRIS_TEXTO = 'FF6B7280'
const NEGRO = 'FF000000'
const BLANCO = 'FFFFFFFF'

const BORDE_NEGRO = {
  top: { style: 'thin', color: { argb: NEGRO } },
  left: { style: 'thin', color: { argb: NEGRO } },
  bottom: { style: 'thin', color: { argb: NEGRO } },
  right: { style: 'thin', color: { argb: NEGRO } },
}

/**
 * Exporta un arreglo de objetos a un archivo .xlsx: logo y título arriba (sin franja
 * de color), encabezado de la tabla en azul con letra blanca, y todos los bordes
 * en negro (sin usar rojo en ninguna parte).
 * data: [{ columna1: valor, columna2: valor }, ...]
 */
export async function exportarAExcel(data, nombreArchivo = 'reporte.xlsx', nombreHoja = 'Reporte') {
  if (!data || data.length === 0) return

  const workbook = new ExcelJS.Workbook()
  const hoja = workbook.addWorksheet(nombreHoja)
  const columnas = Object.keys(data[0])
  const FILA_ENCABEZADO = 6
  const ULTIMA_FILA_DATOS = FILA_ENCABEZADO + data.length
  const FILA_TOTAL = ULTIMA_FILA_DATOS + 1

  try {
    const respuesta = await fetch(logoUrl)
    const blob = await respuesta.blob()
    const base64 = await new Promise((resolve, reject) => {
      const lector = new FileReader()
      lector.onloadend = () => resolve(lector.result)
      lector.onerror = reject
      lector.readAsDataURL(blob)
    })
    const imagenId = workbook.addImage({ base64, extension: 'jpeg' })
    hoja.addImage(imagenId, { tl: { col: 0, row: 0 }, ext: { width: 130, height: 78 } })
  } catch {
    // Si no se puede cargar el logo (ej. sin conexión), se continúa sin él
  }

  hoja.getCell('D2').value = 'Servitur Gran Clas'
  hoja.getCell('D2').font = { name: 'Arial', bold: true, size: 14, color: { argb: AZUL_SERVITUR } }
  hoja.getCell('D3').value = nombreHoja
  hoja.getCell('D3').font = { name: 'Arial', size: 11, color: { argb: GRIS_TEXTO } }
  hoja.getCell('D4').value = `Generado el ${new Date().toLocaleDateString('es-MX')} · ${data.length} registros`
  hoja.getCell('D4').font = { name: 'Arial', size: 10, color: { argb: GRIS_TEXTO } }

  // Fondo blanco explícito en toda la zona del logo/título (para que no se vea
  // ningún color de fondo ahí, sea cual sea el tema del Excel de quien lo abra)
  for (let fila = 1; fila < FILA_ENCABEZADO; fila++) {
    for (let col = 1; col <= columnas.length; col++) {
      hoja.getCell(fila, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLANCO } }
    }
  }

  const filaEncabezado = hoja.getRow(FILA_ENCABEZADO)
  columnas.forEach((col, i) => {
    const celda = filaEncabezado.getCell(i + 1)
    celda.value = col
    celda.font = { name: 'Arial', bold: true, size: 12, color: { argb: BLANCO } }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_SERVITUR } }
    celda.alignment = { vertical: 'middle', horizontal: 'center' }
    celda.border = BORDE_NEGRO
  })
  filaEncabezado.height = 22

  data.forEach((fila, filaIdx) => {
    const filaExcel = hoja.getRow(FILA_ENCABEZADO + 1 + filaIdx)
    filaExcel.height = 18
    columnas.forEach((col, colIdx) => {
      const celda = filaExcel.getCell(colIdx + 1)
      celda.value = fila[col] ?? ''
      celda.font = { name: 'Arial', size: 12 }
      celda.alignment = { vertical: 'middle' }
      celda.border = BORDE_NEGRO
      if (filaIdx % 2 === 1) {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_ZEBRA } }
      }
    })
  })

  hoja.mergeCells(FILA_TOTAL, 1, FILA_TOTAL, columnas.length)
  const celdaTotal = hoja.getCell(FILA_TOTAL, 1)
  celdaTotal.value = `Total de registros: ${data.length}`
  celdaTotal.font = { name: 'Arial', bold: true, size: 12 }
  celdaTotal.alignment = { vertical: 'middle', horizontal: 'right' }
  celdaTotal.border = BORDE_NEGRO
  hoja.getRow(FILA_TOTAL).height = 20

  columnas.forEach((col, i) => {
    const maxLen = Math.max(
      col.length,
      ...data.map((fila) => String(fila[col] ?? '').length),
    )
    hoja.getColumn(i + 1).width = Math.min(Math.max(maxLen + 2, 10), 45)
  })

  hoja.autoFilter = {
    from: { row: FILA_ENCABEZADO, column: 1 },
    to: { row: FILA_ENCABEZADO, column: columnas.length },
  }
  hoja.views = [{ state: 'frozen', ySplit: FILA_ENCABEZADO }]

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  enlace.click()
  URL.revokeObjectURL(url)
}

function leerArchivoComoBase64(file) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onloadend = () => resolve(lector.result)
    lector.onerror = reject
    lector.readAsDataURL(file)
  })
}

/**
 * Exporta el reporte mensual de aforo a Excel, igual de estilizado que
 * exportarAExcel, pero además embebe la foto de evidencia de cada registro
 * (si tiene) directamente en la celda "Foto" (no un link, la imagen real).
 * Los registros vienen del backend, así que la foto es una URL (foto_url)
 * que hay que descargar con fetch(), igual que el logo, no un File local.
 */
export async function exportarAforoAExcel(registros, nombreArchivo = 'aforo.xlsx', mesLabel = '', turnosLabel = '') {
  if (!registros || registros.length === 0) return

  const workbook = new ExcelJS.Workbook()
  const hoja = workbook.addWorksheet('Aforo por ruta')
  const columnas = ['Fecha', 'Turno', 'Ruta', 'Ida', 'Vuelta', 'Total', 'Foto']
  const FILA_ENCABEZADO = 6

  try {
    const respuesta = await fetch(logoUrl)
    const blob = await respuesta.blob()
    const base64 = await leerArchivoComoBase64(blob)
    const imagenId = workbook.addImage({ base64, extension: 'jpeg' })
    hoja.addImage(imagenId, { tl: { col: 0, row: 0 }, ext: { width: 130, height: 78 } })
  } catch {
    // Si no se puede cargar el logo, se continúa sin él
  }

  hoja.getCell('D2').value = 'Servitur Gran Clas'
  hoja.getCell('D2').font = { name: 'Arial', bold: true, size: 14, color: { argb: AZUL_SERVITUR } }
  hoja.getCell('D3').value = `Aforo por ruta — reporte mensual${mesLabel ? ` (${mesLabel})` : ''}`
  hoja.getCell('D3').font = { name: 'Arial', size: 11, color: { argb: GRIS_TEXTO } }
  hoja.getCell('D4').value = `Turnos: ${turnosLabel || 'Todos los turnos'} · Generado el ${new Date().toLocaleDateString('es-MX')} · ${registros.length} registros`
  hoja.getCell('D4').font = { name: 'Arial', size: 10, color: { argb: GRIS_TEXTO } }

  for (let fila = 1; fila < FILA_ENCABEZADO; fila++) {
    for (let col = 1; col <= columnas.length; col++) {
      hoja.getCell(fila, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLANCO } }
    }
  }

  const filaEncabezado = hoja.getRow(FILA_ENCABEZADO)
  columnas.forEach((col, i) => {
    const celda = filaEncabezado.getCell(i + 1)
    celda.value = col
    celda.font = { name: 'Arial', bold: true, size: 12, color: { argb: BLANCO } }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_SERVITUR } }
    celda.alignment = { vertical: 'middle', horizontal: 'center' }
    celda.border = BORDE_NEGRO
  })
  filaEncabezado.height = 22

  let sumaAforo = 0

  for (let i = 0; i < registros.length; i++) {
    const r = registros[i]
    const filaIdx = FILA_ENCABEZADO + 1 + i
    const filaExcel = hoja.getRow(filaIdx)
    const tieneFoto = Boolean(r.foto_url)
    const total = Number(r.pasajeros_ida || 0) + Number(r.pasajeros_vuelta || 0)
    filaExcel.height = tieneFoto ? 58 : 18
    sumaAforo += total

    const valores = [r.fecha, r.turno_nombre, r.ruta_nombre, r.pasajeros_ida, r.pasajeros_vuelta, total, '']
    valores.forEach((valor, colIdx) => {
      const celda = filaExcel.getCell(colIdx + 1)
      celda.value = valor
      celda.font = { name: 'Arial', size: 12 }
      celda.alignment = { vertical: 'middle' }
      celda.border = BORDE_NEGRO
      if (i % 2 === 1) {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_ZEBRA } }
      }
    })

    if (tieneFoto) {
      try {
        const respuesta = await fetch(r.foto_url)
        const blob = await respuesta.blob()
        const base64Foto = await leerArchivoComoBase64(blob)
        const extension = blob.type.includes('png') ? 'png' : 'jpeg'
        const imagenId = workbook.addImage({ base64: base64Foto, extension })
        hoja.addImage(imagenId, { tl: { col: 6, row: filaIdx - 1 }, ext: { width: 68, height: 68 } })
      } catch {
        filaExcel.getCell(7).value = 'Sin foto'
        filaExcel.getCell(7).font = { name: 'Arial', size: 10, italic: true, color: { argb: GRIS_TEXTO } }
      }
    } else {
      filaExcel.getCell(7).value = 'Sin foto'
      filaExcel.getCell(7).font = { name: 'Arial', size: 10, italic: true, color: { argb: GRIS_TEXTO } }
    }
  }

  const FILA_TOTAL = FILA_ENCABEZADO + registros.length + 1
  hoja.mergeCells(FILA_TOTAL, 1, FILA_TOTAL, columnas.length - 1)
  const celdaTotal = hoja.getCell(FILA_TOTAL, 1)
  celdaTotal.value = `Total de registros: ${registros.length}  ·  Aforo acumulado: ${sumaAforo.toLocaleString('es-MX')} pasajeros`
  celdaTotal.font = { name: 'Arial', bold: true, size: 12 }
  celdaTotal.alignment = { vertical: 'middle', horizontal: 'right' }
  celdaTotal.border = BORDE_NEGRO
  hoja.getRow(FILA_TOTAL).height = 20

  hoja.getColumn(1).width = 13
  hoja.getColumn(2).width = 24
  hoja.getColumn(3).width = 22
  hoja.getColumn(4).width = 11
  hoja.getColumn(5).width = 22
  hoja.getColumn(6).width = 9
  hoja.getColumn(7).width = 13

  hoja.autoFilter = {
    from: { row: FILA_ENCABEZADO, column: 1 },
    to: { row: FILA_ENCABEZADO, column: columnas.length },
  }
  hoja.views = [{ state: 'frozen', ySplit: FILA_ENCABEZADO }]

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  enlace.click()
  URL.revokeObjectURL(url)
}

function escribirSeccionResumen(hoja, filaInicio, titulo, encabezados, filas) {
  let fila = filaInicio

  hoja.mergeCells(fila, 1, fila, encabezados.length)
  const celdaTitulo = hoja.getCell(fila, 1)
  celdaTitulo.value = titulo
  celdaTitulo.font = { name: 'Arial', bold: true, size: 12, color: { argb: AZUL_SERVITUR } }
  fila += 1

  encabezados.forEach((texto, i) => {
    const celda = hoja.getCell(fila, i + 1)
    celda.value = texto
    celda.font = { name: 'Arial', bold: true, size: 11, color: { argb: BLANCO } }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_SERVITUR } }
    celda.border = BORDE_NEGRO
    celda.alignment = { horizontal: 'center' }
  })
  fila += 1

  if (filas.length === 0) {
    hoja.mergeCells(fila, 1, fila, encabezados.length)
    const celdaVacia = hoja.getCell(fila, 1)
    celdaVacia.value = 'Sin datos.'
    celdaVacia.font = { name: 'Arial', italic: true, size: 10, color: { argb: GRIS_TEXTO } }
    celdaVacia.alignment = { horizontal: 'center' }
    celdaVacia.border = BORDE_NEGRO
    fila += 1
  } else {
    filas.forEach((filaDatos, i) => {
      filaDatos.forEach((valor, colIdx) => {
        const celda = hoja.getCell(fila, colIdx + 1)
        celda.value = valor
        celda.font = { name: 'Arial', size: 11 }
        celda.border = BORDE_NEGRO
        if (i % 2 === 1) celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_ZEBRA } }
      })
      fila += 1
    })
  }

  return fila + 1 // deja una fila en blanco después de la sección
}

/**
 * Exporta el reporte de incidencias/retrasos a Excel en dos hojas: "Resumen"
 * (desgloses por unidad, semana, mes y día de la semana) y "Detalle" (listado
 * completo), con el mismo estilo visual que el resto de los reportes.
 */
export async function exportarIncidenciasAExcel(datos, nombreArchivo = 'incidencias.xlsx') {
  const {
    incidencias, porUnidad, retrasosPorUnidad, porSemana, porMes, porDiaSemana,
    totalIncidencias, totalRetrasos, alcance,
  } = datos

  if (!incidencias || incidencias.length === 0) return

  const workbook = new ExcelJS.Workbook()
  const resumen = workbook.addWorksheet('Resumen')

  try {
    const respuesta = await fetch(logoUrl)
    const blob = await respuesta.blob()
    const base64 = await leerArchivoComoBase64(blob)
    const imagenId = workbook.addImage({ base64, extension: 'jpeg' })
    resumen.addImage(imagenId, { tl: { col: 0, row: 0 }, ext: { width: 130, height: 78 } })
  } catch {
    // Si no se puede cargar el logo, se continúa sin él
  }

  resumen.getCell('D2').value = 'Servitur Gran Clas'
  resumen.getCell('D2').font = { name: 'Arial', bold: true, size: 14, color: { argb: AZUL_SERVITUR } }
  resumen.getCell('D3').value = 'Reporte de incidencias y retrasos'
  resumen.getCell('D3').font = { name: 'Arial', size: 11, color: { argb: GRIS_TEXTO } }
  resumen.getCell('D4').value =
    `${alcance} · Generado el ${new Date().toLocaleDateString('es-MX')} · Total incidencias: ${totalIncidencias} · Total retrasos: ${totalRetrasos}`
  resumen.getCell('D4').font = { name: 'Arial', size: 10, color: { argb: GRIS_TEXTO } }

  let fila = 7
  fila = escribirSeccionResumen(resumen, fila, 'Incidencias por unidad', ['Unidad', 'Total'], porUnidad.map((r) => [r.nombre, r.cantidad]))
  fila = escribirSeccionResumen(resumen, fila, 'Retrasos por unidad', ['Unidad', 'Total'], retrasosPorUnidad.map((r) => [r.nombre, r.cantidad]))
  fila = escribirSeccionResumen(resumen, fila, 'Incidencias por semana', ['Semana', 'Total'], porSemana.map((r) => [r.etiqueta, r.cantidad]))
  fila = escribirSeccionResumen(resumen, fila, 'Incidencias por mes', ['Mes', 'Total'], porMes.map((r) => [r.etiqueta, r.cantidad]))
  escribirSeccionResumen(resumen, fila, 'Incidencias por día de la semana', ['Día', 'Total'], porDiaSemana.map((r) => [r.diaCompleto, r.cantidad]))

  resumen.getColumn(1).width = 26
  resumen.getColumn(2).width = 14

  const detalle = workbook.addWorksheet('Detalle')
  const columnas = ['Fecha', 'Conductor', 'Unidad', 'Tipo', 'Descripción']
  const FILA_ENCABEZADO = 1
  const filaEncabezado = detalle.getRow(FILA_ENCABEZADO)
  columnas.forEach((col, i) => {
    const celda = filaEncabezado.getCell(i + 1)
    celda.value = col
    celda.font = { name: 'Arial', bold: true, size: 12, color: { argb: BLANCO } }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_SERVITUR } }
    celda.alignment = { vertical: 'middle', horizontal: 'center' }
    celda.border = BORDE_NEGRO
  })
  filaEncabezado.height = 22

  const ordenadas = [...incidencias].sort((a, b) => b.fecha.localeCompare(a.fecha))
  ordenadas.forEach((inc, i) => {
    const filaIdx = FILA_ENCABEZADO + 1 + i
    const filaExcel = detalle.getRow(filaIdx)
    const valores = [inc.fecha, inc.conductor, inc.unidad, inc.tipo, inc.descripcion]
    valores.forEach((valor, colIdx) => {
      const celda = filaExcel.getCell(colIdx + 1)
      celda.value = valor
      celda.font = { name: 'Arial', size: 11 }
      celda.border = BORDE_NEGRO
      celda.alignment = { vertical: 'middle', wrapText: colIdx === 4 }
      if (i % 2 === 1) celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_ZEBRA } }
    })
  })

  detalle.getColumn(1).width = 13
  detalle.getColumn(2).width = 22
  detalle.getColumn(3).width = 11
  detalle.getColumn(4).width = 18
  detalle.getColumn(5).width = 45

  detalle.autoFilter = { from: { row: FILA_ENCABEZADO, column: 1 }, to: { row: FILA_ENCABEZADO, column: columnas.length } }
  detalle.views = [{ state: 'frozen', ySplit: FILA_ENCABEZADO }]

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  enlace.click()
  URL.revokeObjectURL(url)
}