import { createContext, useContext, useEffect, useState } from 'react'

const CLAVE_TEMA = 'servitur_tema'
const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_TEMA) === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    const raiz = document.documentElement
    if (tema === 'dark') {
      raiz.classList.add('dark')
    } else {
      raiz.classList.remove('dark')
    }
    try {
      localStorage.setItem(CLAVE_TEMA, tema)
    } catch {
      // localStorage puede no estar disponible (modo privado, etc.) — no es crítico,
      // el tema simplemente no se recuerda entre visitas.
    }
  }, [tema])

  return (
    <ThemeContext.Provider value={{ tema, setTema }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const contexto = useContext(ThemeContext)
  if (!contexto) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return contexto
}