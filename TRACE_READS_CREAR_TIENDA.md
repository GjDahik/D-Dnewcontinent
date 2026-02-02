# Trazabilidad: lecturas al crear una tienda

Objetivo: identificar de dónde pueden salir **~112 lecturas** cuando el DM crea una tienda nueva (ej. contador de 282 → 394 reads).

---

## 1. Qué hace el código al crear una tienda

### 1.1 Flujo al guardar

| Paso | Archivo | Qué hace |
|------|--------|----------|
| 1 | `cities.js` | El usuario pulsa guardar en el modal "Nueva Tienda". |
| 2 | `saveShop()` (cities.js ~898) | Construye `data` (nombre, ciudadId, tipo, npcDueno, posadaCuartos si aplica). |
| 3 | Mismo | `id ? db.collection('shops').doc(id).update(data) : db.collection('shops').add(data)` → **1 escritura**. |
| 4 | Mismo | `.then(() => { showToast(...); closeModal('shop-modal'); })` → **no hay llamadas a loadWorld(), fetch*, ni ningún .get()**. |

**Conclusión:** En el flujo actual, **crear una tienda = 1 write**. No hay ninguna lectura disparada explícitamente por `saveShop()`.

---

## 2. Vista DM: ciudades y tiendas

### 2.1 Cómo se cargan cities / npcs / shops (DM)

- **`loadWorld()`** (cities.js ~93) llama a:
  - `fetchCitiesDM()` → `db.collection('cities').limit(300).get()`
  - `fetchNpcsDM()`  → `db.collection('npcs').limit(300).get()`
  - `fetchShopsDM()` → `db.collection('shops').limit(300).get()`
- Son **solo `.get()`**, no `onSnapshot`. No hay listener activo sobre `shops` en la vista DM.

### 2.2 Cuándo se llama `loadWorld()`

- Al mostrar el dashboard: **`showDashboard()`** (app.js) → `loadWorld()` (una vez al entrar como DM).
- Al cerrar el modal de **configuración de batalla** (cities.js ~1109): al cerrar `batalla-config-modal` se llama `loadWorld()` para refrescar. **No** al crear/editar una tienda normal.

Por tanto: **crear una tienda no dispara `loadWorld()` ni ningún refetch en la vista DM**.

---

## 3. Vista jugador: ciudades y tiendas

- **`loadPlayerWorld()`** (app.js) llama a `refreshPlayerWorld()`:
  - `fetchPlayerCities()` → `cities.limit(300).get()`
  - `fetchPlayerShops()` → `shops.limit(300).get()`
  - `fetchPlayerNpcs()`  → `npcs.limit(300).get()`
- También son **solo `.get()`**, no `onSnapshot`. No hay listener sobre `shops` en la vista jugador.

Esas funciones solo se ejecutan:

- Al **entrar como jugador** (`renderPlayerView` → `loadPlayerWorld()`).
- Al **abrir directorio de una ciudad** y cambiar de ciudad (`openPlayerCityShops` → `refreshPlayerWorld()` cuando cambia `cityId`).

**Conclusión:** Crear una tienda como DM **no** dispara por sí solo un refetch en la vista jugador.

---

## 4. Listeners activos (onSnapshot) en la app

Resumen de los únicos `onSnapshot` que hay en el proyecto:

| Archivo      | Colección / documento      | Cuándo se activa / qué dispara lecturas |
|-------------|----------------------------|------------------------------------------|
| app.js      | `players.doc(user.id)`     | Cambios en ese jugador (1 doc).          |
| app.js      | `rutas_conocidas` limit 200| Cambios en rutas (N docs).               |
| players.js  | `players` limit 200        | Cambios en cualquier jugador (N docs).   |
| missions.js | `missions` limit 200       | Cambios en misiones (DM y/o jugador).    |
| missions.js | `legend_audio`             | Cambios en leyenda.                      |
| notifications.js | `notifications` (varios) | Cambios en notificaciones.               |
| transactions.js | `transactions`          | Solo si la pestaña Historial está abierta. |
| player-app.js | `players.doc(currentPlayerId)` | Cambios en ese jugador (1 doc).     |

**Ninguno de estos listeners está sobre `shops`, `cities` ni `npcs`.** En el código actual, añadir un documento a `shops` no debería hacer que ningún listener entregue un nuevo snapshot.

---

## 5. De dónde pueden salir las ~112 lecturas

Dado que:

1. **Crear una tienda** solo hace `shops.add(data)` (1 write) y no llama a `loadWorld()` ni a ningún `.get()`.
2. **Vista DM y vista jugador** cargan cities/shops/npcs con `.get()`, no con `onSnapshot`.
3. **No hay listeners** sobre `shops` en este código.

Las **~112 lecturas** no se explican por el flujo “crear tienda” en la versión actual del código. Posibles orígenes:

### A) Listener sobre `shops` en otra versión u otro cliente

- Si en **otra pestaña**, **otro navegador** o **otro dispositivo** hay una versión antigua (o otra app) que usa **`onSnapshot` sobre `shops`** (o sobre una query que incluye tiendas), al escribir la nueva tienda Firestore entrega el snapshot completo a ese listener.
- En ese caso se cobra **1 lectura por documento** en el resultado. Si tienes **~112 tiendas**, encaja con **~112 lecturas** en un solo disparo.

**Comprobar:** ¿Cuántos documentos hay en la colección `shops`? Si son ~112, es muy coherente con un único listener que recibe todo el conjunto al añadir la tienda.

### B) Otras acciones en la misma ventana de tiempo

- Los números 282 y 394 pueden ser **acumulados** (p. ej. “lecturas hoy” o “últimos X minutos”).
- Las 112 lecturas podrían incluir: abrir otra pestaña (Historial, Misiones, Notificaciones), cambiar de pestaña y que se dispare algún listener o un `.get()` al mostrar una sección, etc.
- En ese caso no serían “solo por crear la tienda”, sino por todo lo que se hizo en ese intervalo.

### C) Consola de Firebase u otro cliente

- Si en la consola de Firebase (o en otra herramienta) tienes abierta la colección `shops` con **tiempo real** (listen), cada actualización puede generar lecturas para todos los documentos que se envían en ese snapshot.

---

## 6. Resumen y qué revisar

| Pregunta | Respuesta en código |
|----------|----------------------|
| ¿`saveShop()` hace algún `.get()` o llama a `loadWorld()`? | **No.** Solo `shops.add(data)` y luego toast + cerrar modal. |
| ¿Hay `onSnapshot` sobre `shops` en la app? | **No** en el código actual (DM y jugador usan `.get()` para cities/shops/npcs). |
| ¿Al cerrar el modal de tienda se refresca el mundo? | **No.** Solo se cierra el modal. |
| ¿De dónde pueden salir ~112 reads? | Principalmente: **(1)** otro cliente/pestaña con listener en `shops` (p. ej. ~112 docs = ~112 reads), **(2)** otras acciones en el mismo periodo, **(3)** consola Firebase u otro listener externo. |

**Recomendación:** Revisar en Firebase cuántos documentos tiene la colección `shops`. Si son ~112, es muy probable que las lecturas vengan de un **listener sobre `shops`** en otra pestaña, otro dispositivo o la consola. Si son muchas menos (p. ej. 20), entonces las 112 lecturas probablemente incluyen otras operaciones (otros listeners o `.get()` al cambiar de pestaña o al cargar secciones).

---

*Documento generado a partir del código en dm-dashboard-modular (cities.js, app.js, players.js, missions.js, notifications.js, transactions.js, player-app.js).*
