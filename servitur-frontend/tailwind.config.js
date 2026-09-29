/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta oficial Servitur Gran Clas — cada color apunta a una
        // variable CSS (ver index.css) para poder cambiar de tema claro/
        // oscuro sin tocar ninguna clase de Tailwind en el resto del
        // proyecto. El formato "rgb(var(--x) / <alpha-value>)" es el que
        // recomienda Tailwind para que las variantes de opacidad
        // (bg-servitur-fondo/50, border-servitur-texto-secundario/10, etc.)
        // sigan funcionando igual que antes.
        servitur: {
          rojo: 'rgb(var(--color-rojo) / <alpha-value>)',
          'rojo-hover': 'rgb(var(--color-rojo-hover) / <alpha-value>)',
          azul: 'rgb(var(--color-azul) / <alpha-value>)',
          'azul-oscuro': 'rgb(var(--color-azul-oscuro) / <alpha-value>)',
          fondo: 'rgb(var(--color-fondo) / <alpha-value>)',
          tarjeta: 'rgb(var(--color-tarjeta) / <alpha-value>)',
          texto: 'rgb(var(--color-texto) / <alpha-value>)',
          'texto-secundario': 'rgb(var(--color-texto-secundario) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['"Dancing Script"', 'cursive'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}