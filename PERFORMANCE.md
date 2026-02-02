# Qué puede estar haciendo lento el programa

Resumen de las causas más probables de lentitud y qué se puede hacer.

---

## 1. **Listeners en tiempo real (Firestore `onSnapshot`)**

Cuando el **jugador** entra, se suscriben varios listeners:

- `cities.onSnapshot` → cada cambio en cualquier ciudad dispara **renderPlayerCities()** (reconstruye toda la lista de ciudades y el dropdown del mapa).
- `shops.onSnapshot` → igual, dispara **renderPlayerCities()**.
- `npcs.onSnapshot` → igual + si estás en una ciudad, vuelve a abrir **openPlayerCityShops()**.

Cada vez que el DM edita una ciudad, tienda o NPC, se ejecutan varias veces esos renders. Si hay muchos cambios seguidos, la app hace mucho trabajo de DOM y puede notarse lento.

**Mejora posible:**  
Solo re-renderizar cuando realmente cambien los datos (comparar snap anterior con el nuevo) o limitar re-renders cuando la pestaña de ciudades no está visible.

---

## 2. **Muchas lecturas del mismo documento de jugador**

En `app.js` hay muchas llamadas a:

- `db.collection('players').doc(user.id).get()`

Cada tienda/modal que necesita oro o inventario hace un `.get()` nuevo. No hay caché: mismo documento, muchas lecturas.

**Mejora posible:**  
Guardar en memoria el documento del jugador (oro, inventario, etc.) y actualizarlo con el `onSnapshot` que ya tienes del jugador, y usar esa copia local en lugar de hacer `.get()` en cada vista.

---

## 3. **Buscadores sin debounce**

Los inputs de búsqueda (posada, batalla, artesanías, emporio, biblioteca, herrería, taberna, pociones, inventario, etc.) hacen:

- `addEventListener('input', () => { ... render... })`

Cada tecla ejecuta el render completo de la lista. Escribir “pociones” = 8 renders seguidos.

**Mejora aplicada:**  
Se añadió una función `debounce` y se usa en los buscadores para esperar ~200–300 ms sin teclear antes de renderizar. Así se reduce mucho el trabajo al escribir.

---

## 4. **Todo el JS se carga al inicio**

En `index.html` se cargan de golpe:

- Firebase, SheetJS (xlsx), auth, app, players, cities, inventory, transactions, notifications, automation, missions.

Aunque solo uses vista jugador, se parsea y ejecuta también la lógica de DM (ciudades, misiones, automatizaciones, etc.). Eso hace la primera carga más pesada.

**Mejora posible:**  
Cargar solo lo necesario según rol (jugador vs DM) o cargar algunos módulos cuando se abra por primera vez la pestaña que los usa (carga diferida).

---

## 5. **Tamaño de archivos**

- `app.js` ~4600 líneas, mucho lógico en un solo archivo.
- `styles.css` ~3160 líneas.
- Varios `innerHTML` y reconstrucción de listas grandes en cada render.

No es el único factor, pero archivos muy grandes y muchos re-renders juntos pueden notarse en dispositivos lentos.

---

## Resumen rápido

| Causa                         | Impacto   | Dificultad |
|------------------------------|-----------|------------|
| onSnapshot re-render todo   | Alto      | Media      |
| Repetir .get() del jugador  | Medio     | Baja       |
| Buscadores sin debounce     | Alto al escribir | Baja (ya aplicado) |
| Cargar todo el JS al inicio | Inicio    | Media      |

Si quieres, el siguiente paso puede ser: (1) reducir re-renders en `onSnapshot`, o (2) cachear el documento del jugador y usar menos `.get()`.

---

## 6. **Medidas aplicadas para no “enviar como locos” a Firebase**

Para reducir lecturas y listeners activos se hizo lo siguiente.

### Límites en todas las queries de colección

- **app.js**: `cities`, `shops`, `npcs` → `limit(300)`; `rutas_conocidas` → `limit(200)`; `players.get()` → `limit(200)`; `bitacora_viajes.where(...)` → `limit(200)`.
- **cities.js**: `cities`, `npcs`, `shops` → `limit(300)`; `cities.get()` → `limit(300)`; `shops.where(ciudadId)` → `limit(50)`.
- **players.js**: `players.onSnapshot` → `limit(200)`; migración inventarios → `limit(500)`.
- **transactions.js**: `transactions` → `limit(200)` (ya estaba).
- **missions.js**: `missions` (DM, badge, jugador) → `limit(200)`; `players.get()` → `limit(200)`; `legend_audio` → `limit(100)`.
- **notifications.js**: `players.get()` → `limit(200)`; notificaciones DM fallback → `limit(500)`; badge unread y player unread/read → `limit(100)`; enviar a todos → `limit(200)`.
- **automation.js**: `automation_rules.get()` → `limit(100)`; reglas por tienda → `limit(50)`.
- **auth.js / player-app.js**: queries de login ya usan `limit(1)`.

Los `.get()` de **un solo documento** (por ejemplo `players.doc(id).get()`) no llevan `limit`; solo las queries a colecciones.

### Desuscripción de listeners

- **Vista jugador**: al volver al dashboard (DM), se llama `_playerWorldUnsubscribes()` y se desuscriben los listeners de `cities`, `shops` y `npcs` de la vista jugador. Así no siguen activos cuando solo se usa la vista DM.
- **Transacciones**: el listener de `transactions` **solo se inicia** cuando el usuario abre la pestaña **Historial**. Al cambiar a otra pestaña se llama `stopTransactionsListener()` y se desuscribe. Al volver a Historial se vuelve a suscribir.

### Resumen de “¿seguimos enviando como locos?”

| Qué | Estado |
|-----|--------|
| Queries de colección sin `limit()` | Corregido: todas tienen `limit` (200–500 según caso). |
| Listener de transacciones siempre activo | Corregido: solo activo en pestaña Historial. |
| Listeners de vista jugador al salir | Corregido: se desuscriben al volver al dashboard. |
| Listeners de notificaciones (badge, unread, read) | Tienen `limit(100)`. |
| `.get()` de un solo documento | No llevan limit (correcto). |
| `deleteAllTransactions` | Hace un `.get()` sin limit para borrar todo; es una acción puntual, aceptable. |

Si en el futuro tenés más de 200–300 ciudades/tiendas/jugadores/misiones, podés subir el `limit()` donde haga falta (por ejemplo a 500). Los listeners que quedan activos (ciudades, tiendas, NPCs, jugadores, misiones, notificaciones en la vista DM) son los necesarios para que el dashboard y la vista jugador se actualicen en tiempo real; con los límites puestos, el volumen de lecturas queda acotado.
