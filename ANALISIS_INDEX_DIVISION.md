# Análisis: división del index.html (DragonKeep)

## Situación actual

- **index.html**: ~**3.094 líneas** en un solo archivo.
- **app.js**: cientos de referencias al DOM (`getElementById`, `querySelector`, etc.) que asumen que todo el HTML ya está en la página al cargar.

### Estructura actual del index.html

| Bloque | Líneas aprox. | Contenido |
|--------|----------------|-----------|
| **Head** | 1–16 | `<!DOCTYPE>`, `<head>`, meta, title, favicon, manifest, CSS |
| **Vista DM** | 18–341 | `#main-container`: header DM, nav, secciones Mapa, Jugadores, Ciudades, Notificaciones, Misiones, Historial |
| **Vista Jugador** | 343–675 | `#player-view-container`: header jugador, nav, secciones Mapa, Ciudades, Inventario, CDD/Correo, Hogar, Misiones |
| **Modales** | 677–3057 | ~40+ modales (tiendas, habitantes, usar/vender ítem, notas, santuario, batalla, posada, forja, biblioteca, emporio, ciudad, jugador, misión, crear DM, rutas, etc.) |
| **Login** | ~2919 | Modal de login (DM / Personaje, nombre, PIN) |
| **Toast + Footer** | 3059–3071 | Toast global, footer “powered by” |
| **Scripts** | 3073–3092 | Firebase, SheetJS, auth, app, players, cities, inventory, etc. |

---

## ¿Conviene dividir?

**Sí.** Un solo HTML de 3.000+ líneas:

- Es difícil de mantener y de revisar en diff.
- Hace lento buscar/seleccionar secciones en el editor.
- Mezcla dos roles (DM y Jugador) y muchos modales en un único flujo.

Dividir por bloques lógicos mejora la mantenibilidad y permite que varias personas trabajen en partes distintas sin tantos conflictos.

---

## En cuántos archivos dividir

Recomendación: **5 fragmentos** (o 4 si se agrupa pie y modales).

### Opción recomendada: 5 fragmentos

| # | Archivo | Contenido | Líneas aprox. |
|---|---------|-----------|----------------|
| 1 | **index.html** (shell) | Head completo + apertura `<body>`, contenedores vacíos o comentarios de inclusión, **scripts y cierre** | ~80–120 |
| 2 | **partials/dm-view.html** | Todo el contenido de la vista DM: header, nav, secciones (mapa, jugadores, ciudades, notificaciones, misiones, transacciones) | ~320 |
| 3 | **partials/player-view.html** | Todo el contenido de la vista Jugador: header, nav, secciones (mapa, ciudades, inventario, CDD, hogar, misiones) | ~335 |
| 4 | **partials/modals.html** | Todos los modales (jugador + DM), modal de login, toast, footer | ~2.400 |
| 5 | (opcional) **partials/modals-dm.html** + **partials/modals-player.html** | Si se quiere separar modales DM de modales jugador | variable |

En la práctica, **4 archivos** suele ser suficiente:

1. **index.html** – Shell (head + estructura mínima del body + scripts).
2. **partials/dm-view.html** – Vista DM.
3. **partials/player-view.html** – Vista Jugador.
4. **partials/modals.html** – Todos los modales + login + toast + footer.

El “index.html” que se sirve en producción sería **generado** a partir de estos 4, no editado a mano en las 3.094 líneas.

---

## Cómo ensamblar (sin tocar la lógica de la app)

El JS actual espera que, al cargar la página, **todos** los `id` ya existan en el DOM. Por eso no conviene cargar vistas o modales por **fetch** después del load sin refactorizar la inicialización.

Formas de mantener el mismo comportamiento:

### A) Build step (recomendado)

- Crear **partials/** con los 3–4 fragmentos HTML.
- Un script de build (Node, npm script, etc.) que:
  - Lea `index.shell.html` (o un “index.template.html”).
  - Donde diga `<!--#include partials/dm-view.html -->`, sustituya por el contenido del archivo.
  - Igual para `player-view.html` y `modals.html`.
  - Escriba el resultado en **index.html** (el que se despliega).
- En desarrollo: correr el build al cambiar algún partial; en deploy: el build genera `index.html` una vez.

Ventaja: **cero cambios en app.js**; el HTML final sigue siendo uno solo con todo el DOM.

### B) Inclusión por JavaScript al cargar

- `index.html` solo tiene head, body, dos `<div id="dm-view-root">` y `id="player-view-root">`, un `<div id="modals-root">`, footer y scripts.
- En el primer script (o en `app.js` al inicio):
  - `fetch('partials/dm-view.html')`, `fetch('partials/player-view.html')`, `fetch('partials/modals.html')`.
  - Insertar el HTML en los roots con `innerHTML`.
  - Luego ejecutar la lógica de inicialización que ya tienes (tabs, modales, etc.).

Problema: hay que asegurar que **toda** la inicialización que usa `getElementById` se ejecute **después** de que los fragmentos estén inyectados (por ejemplo un `initApp()` que se llama al final del último `fetch`). Requiere revisar el orden de ejecución en `app.js` y posiblemente pequeños cambios.

### C) Server-Side Includes (SSI)

- Si el servidor (Apache, nginx con ngx_http_ssi, etc.) soporta SSI:
  - En `index.html`: `<!--#include virtual="partials/dm-view.html" -->`, etc.
  - El servidor entrega ya el HTML completo.

Solo aplica si tu hosting soporta SSI; en GitHub Pages no está disponible.

---

## Resumen de recomendación

| Pregunta | Respuesta |
|----------|-----------|
| ¿Dividir el index? | **Sí.** |
| ¿En cuántos? | **4 archivos** (shell + dm-view + player-view + modals). Opcionalmente 5 si separas modales DM y jugador. |
| ¿Cómo? | **Build step** que genere un único `index.html` desde partials, para no cambiar la forma en que el JS usa el DOM. |

Si quieres, el siguiente paso puede ser: (1) definir la estructura exacta de `partials/` y el formato del shell, o (2) proponer un script de build concreto (por ejemplo en Node) que lea los partials y genere `index.html`.
