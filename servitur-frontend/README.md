# Servitur Gran Clas — Frontend

React + Tailwind CSS + Docker local.

## Levantar con Docker

```bash
docker compose up --build
```

Abre http://localhost:5173

## Levantar sin Docker (opcional)

```bash
npm install
npm run dev
```

## Estructura

```
src/
  pages/
    Login.jsx      -> Pantalla de inicio de sesión (lista)
  components/       -> Aquí irán los componentes reutilizables (botones, inputs, navbar, etc.)
  assets/           -> Coloca aquí tu foto del autobús como bus-hero.jpg
  App.jsx           -> Rutas de la app (react-router-dom)
  index.css         -> Tailwind + estilos base
tailwind.config.js  -> Paleta oficial Servitur ya cargada como clases `servitur-*`
```

## Paleta ya configurada en Tailwind

| Clase Tailwind              | Hex       | Uso                  |
|------------------------------|-----------|-----------------------|
| `servitur-rojo`              | #C9252D   | Rojo principal        |
| `servitur-rojo-hover`        | #A91F27   | Hover de rojo         |
| `servitur-azul`               | #173F63   | Azul marino principal |
| `servitur-azul-oscuro`       | #123451   | Menús / encabezados   |
| `servitur-fondo`             | #F4F5F6   | Fondo general         |
| `servitur-tarjeta`           | #FFFFFF   | Tarjetas              |
| `servitur-texto`             | #252525   | Texto principal        |
| `servitur-texto-secundario`  | #6B7280   | Texto secundario       |

## Pendiente

- Agregar tu foto real del autobús en `src/assets/bus-hero.jpg` (el panel izquierdo ya tiene el fallback y la franja diagonal roja lista, solo falta la imagen).
- Conectar el `handleSubmit` de `Login.jsx` con el endpoint real de autenticación en Django REST Framework.
