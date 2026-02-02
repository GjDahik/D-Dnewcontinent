# Auditoría: onSnapshot y unsubscribe en Firestore (Vanilla JS)

## 1. Listado de todos los onSnapshot activos

| # | Archivo | Función donde se crea | Colección / query | ¿Guarda unsubscribe? | ¿Puede ejecutarse más de una vez? |
|---|---------|------------------------|-------------------|----------------------|-----------------------------------|
| 1 | cities.js | loadWorld() | cities (limit 300) | ❌ No | Sí, si showDashboard() se llama varias veces (guard _worldSubscribed evita duplicado) |
| 2 | cities.js | loadWorld() | npcs (limit 300) | ❌ No | Idem |
| 3 | cities.js | loadWorld() | shops (limit 300) | ❌ No | Idem |
| 4 | app.js | renderPlayerView() | players.doc(user.id) | ❌ No | **Sí: cada vez que el jugador entra** |
| 5 | app.js | loadPlayerWorld() | cities (limit 300) | ✅ Sí (unsubCities) | No (guard _playerWorldSubscribed) |
| 6 | app.js | loadPlayerWorld() | shops (limit 300) | ✅ Sí (unsubShops) | No |
| 7 | app.js | loadPlayerWorld() | npcs (limit 300) | ✅ Sí (unsubNpcs) | No |
| 8 | app.js | loadRutasConocidas() | rutas_conocidas (limit 200) | ✅ Sí (window._rutasUnsubscribe) | No (guard _rutasSubscribed) |
| 9 | notifications.js | startUnreadMailBadge() | notifications (where playerId, leida; limit 100) | ✅ Sí (_unreadBadgeUnsubscribe) | Sí, si se llama varias veces (desuscribe antes) |
| 10 | notifications.js | loadDMNotifications() | notifications (orderBy fecha; limit 100) | ❌ No | **Sí: showDashboard + tras enviar/borrar** |
| 11 | notifications.js | loadPlayerNotifications() | notifications (where playerId, leida==false; limit 100) | ❌ No | **Sí: cada vez que el jugador entra** |
| 12 | notifications.js | loadPlayerNotifications() | notifications (where playerId, leida==true; limit 100) | ❌ No | **Sí: cada vez que el jugador entra** |
| 13 | missions.js | loadDMMissions() | missions (orderBy createdAt; limit 200) | ❌ No | Sí, si showDashboard() se llama varias veces |
| 14 | missions.js | loadPlayerMissions() (badge) | missions (limit 200) | ✅ Sí (_missionsBadgeUnsubscribe) | Sí: cada vez que se abre Misiones jugador |
| 15 | missions.js | loadPlayerMissions() | missions (limit 200) | ✅ Sí (_playerMissionsUnsubscribe) | **Sí: en .then y en .catch se crean dos; y si se llama de nuevo, no desuscribe antes** |
| 16 | missions.js | loadPlayerMissions() .catch | missions (limit 200) | ✅ Misma variable | Duplica lógica, puede quedar anterior sin cerrar |
| 17 | missions.js | loadLegendTracks() | legend_audio (orderBy; limit 100) | ✅ Sí (_legendUnsubscribe), desuscribe antes | Sí, al cambiar de subtab (correcto: desuscribe antes) |
| 18 | missions.js | loadPlayerLegendTracks() | legend_audio (orderBy; limit 100) | ✅ Sí (_playerLegendUnsubscribe), desuscribe antes | Idem |
| 19 | transactions.js | loadTransactions() | transactions (orderBy fecha; limit 200) | ✅ Sí (_transactionsUnsubscribe) | No (guard + solo al abrir tab Historial) |
| 20 | players.js | loadPlayers() | players (limit 200) | ❌ No | **Sí: se llama al cargar el script (línea 666) y desde showDashboard()** |
| 21 | player-app.js | subscribeToPlayer() | players.doc(currentPlayerId) | ❌ No | **Sí: login + IIFE con sessionStorage; nunca se desuscribe al logout** |

---

## 2. En qué funciones se crean (resumen)

- **loadWorld()** (cities.js): cities, npcs, shops.
- **renderPlayerView()** (app.js): players.doc(user.id).
- **loadPlayerWorld()** (app.js): cities, shops, npcs (con unsubscribe).
- **loadRutasConocidas()** (app.js): rutas_conocidas (con unsubscribe).
- **startUnreadMailBadge()** (notifications.js): notifications (where playerId, leida; con unsubscribe).
- **loadDMNotifications()** (notifications.js): notifications (orderBy fecha).
- **loadPlayerNotifications()** (notifications.js): dos onSnapshot (unread y read).
- **loadDMMissions()** (missions.js): missions.
- **loadPlayerMissions()** (missions.js): missions (badge + lista; en .then y .catch).
- **loadLegendTracks()** (missions.js): legend_audio.
- **loadPlayerLegendTracks()** (missions.js): legend_audio.
- **loadTransactions()** (transactions.js): transactions (con unsubscribe).
- **loadPlayers()** (players.js): players (llamado también al final del script).
- **subscribeToPlayer()** (player-app.js): players.doc(currentPlayerId).

---

## 3. ¿Alguno puede ejecutarse más de una vez sin unsubscribe?

**Sí.**

- **renderPlayerView()**: cada vez que un jugador entra se añade un onSnapshot a `players.doc(user.id)` y no se guarda ni se llama unsubscribe al salir.
- **loadPlayers()**: se ejecuta al cargar `players.js` (línea 666) y de nuevo en `showDashboard()`; no guarda unsubscribe → riesgo de dos listeners para `players`.
- **loadDMNotifications()**: se llama desde showDashboard y desde lógica post-enviar/borrar; no guarda unsubscribe → múltiples listeners de `notifications` (DM).
- **loadPlayerNotifications()**: se llama en setTimeout desde renderPlayerView; crea 2 onSnapshot y no guarda ningún unsubscribe → por cada entrada del jugador se añaden 2 listeners que nunca se cierran.
- **loadDMMissions()**: si showDashboard() se invocara más de una vez, se añadiría otro listener sin cerrar el anterior (no guarda unsubscribe).
- **loadPlayerMissions()**: si se llama varias veces (p. ej. activas y luego historial), se puede asignar otro listener sin desuscribir el anterior (salvo que se reutilice _playerMissionsUnsubscribe y se llame antes; en .catch se crea un segundo listener que puede solaparse).
- **subscribeToPlayer()** (player-app.js): se llama al login y en el IIFE si hay sessionStorage; no guarda unsubscribe y no se desuscribe en playerLogout() → listeners acumulados y nunca cerrados.

---

## 4. Cuáles deberían ser getDocs() en vez de onSnapshot()

Criterio: usar **onSnapshot** solo cuando necesites actualización en tiempo real en la pantalla actual. Usar **getDocs/get** cuando baste con una lectura puntual.

| Listener actual | Propuesta | Motivo |
|-----------------|-----------|--------|
| loadDMNotifications() | **getDocs** (o get) una vez al abrir la pestaña / sección de notificaciones DM | Listado histórico; no es crítico que se actualice en tiempo real en cada cambio. |
| loadPlayerNotifications() (unread + read) | Mantener **onSnapshot** si quieres bandeja “en vivo”; si solo es “al abrir pestaña”, **getDocs** por pestaña | Si la bandeja se abre una vez y no se recarga, getDocs puede ser suficiente. |
| loadDMMissions() | **getDocs** al abrir la pestaña Misiones (o al mostrar dashboard) si no necesitas que la lista se actualice en tiempo real | Reduce listeners permanentes; el DM puede refrescar al cambiar de pestaña. |
| loadLegendTracks() / loadPlayerLegendTracks() | **getDocs** al abrir el subtab Leyenda | Listado de audios; suele bastar con cargar una vez por visita al tab. |
| loadTransactions() | Ya condicionado al tab; podría ser **getDocs** al abrir Historial en lugar de onSnapshot | Historial no suele requerir tiempo real; una carga por visita al tab es suficiente. |
| startUnreadMailBadge() | Mantener **onSnapshot** (o polling con getDocs cada X s) | El badge sí debe reflejar “cuántas no leídas” en tiempo (casi) real. |
| loadPlayers() (DM) | Mantener **onSnapshot** si el listado de jugadores debe actualizarse en vivo; si no, **getDocs** al abrir la pestaña | Si varios DMs editan, onSnapshot tiene sentido; si no, getDocs basta. |
| loadWorld() (cities, npcs, shops) | Mantener **onSnapshot** si el mapa/lista debe actualizarse en vivo al editar; si no, **getDocs** al abrir | Mismo criterio que jugadores. |

Resumen: los que son “listado que se abre y se lee” (notificaciones DM, misiones DM, leyenda, transacciones) son buenos candidatos a **getDocs**; los que son “badge” o “listado compartido en vivo” (badge unread, players, cities/shops/npcs en tiempo real) pueden seguir con **onSnapshot** pero **obligatoriamente con unsubscribe** y, donde aplique, patrón centralizado.

---

## 5. Patrón de unsubscribe centralizado (Vanilla JS)

Objetivo: un solo objeto que guarde todas las funciones de desuscripción y una función “cerrar todo” por contexto (DM, jugador, tab actual), sin cambiar la lógica de negocio (solo registrar y llamar unsubscribes).

### 5.1 Registro central

```javascript
// firestore-subscriptions.js (o al inicio de app.js)
window.__firestoreSubscriptions = {
    dm: [],       // listeners activos cuando la vista es DM (dashboard)
    player: [],   // listeners activos cuando la vista es jugador
    tab: {}       // por tab: { transactions: [], notifications: [], ... }
};

function registerUnsubscribe(scope, key, unsubscribeFn) {
    if (typeof unsubscribeFn !== 'function') return;
    var bag = scope === 'tab' ? (window.__firestoreSubscriptions.tab[key] = window.__firestoreSubscriptions.tab[key] || []) : window.__firestoreSubscriptions[scope];
    bag.push(unsubscribeFn);
}

function closeAll(scope, key) {
    var bag;
    if (scope === 'tab' && key) {
        bag = window.__firestoreSubscriptions.tab[key];
        if (bag) { bag.forEach(function(fn) { try { fn(); } catch (e) {} }); window.__firestoreSubscriptions.tab[key] = []; }
    } else if (scope === 'dm' || scope === 'player') {
        bag = window.__firestoreSubscriptions[scope];
        if (bag) { bag.forEach(function(fn) { try { fn(); } catch (e) {} }); window.__firestoreSubscriptions[scope] = []; }
    }
}

// Opcional: cerrar todo (p. ej. al logout global)
function closeAllSubscriptions() {
    closeAll('dm');
    closeAll('player');
    Object.keys(window.__firestoreSubscriptions.tab || {}).forEach(function(k) { closeAll('tab', k); });
}
```

### 5.2 Uso en el código (sin cambiar lógica)

- Donde crees un onSnapshot, guardas el return (unsubscribe) y lo registras:
  - Vista DM: `registerUnsubscribe('dm', null, unsubFn);`
  - Vista jugador: `registerUnsubscribe('player', null, unsubFn);`
  - Tab concreto: `registerUnsubscribe('tab', 'transactions', unsubFn);`
- Al cambiar de vista (DM → jugador o jugador → DM): llamar `closeAll('dm')` o `closeAll('player')` según corresponda.
- Al salir de un tab que tenga listeners (p. ej. Historial): `closeAll('tab', 'transactions');`.

Así ningún listener queda “colgado” sin posibilidad de cerrarlo y evitas duplicados al re-entrar a una vista o tab.

---

## 6. Señales ROJAS por archivo

### app.js

| Señal | Ubicación | Descripción |
|-------|-----------|-------------|
| 🔴 | renderPlayerView() | onSnapshot(players.doc(user.id)): **unsubscribe no se guarda**; **handler que se puede ejecutar varias veces** (cada vez que el jugador entra). |
| 🔴 | renderPlayerView() | Listener **nunca se cierra** al volver a vista DM. |

### cities.js

| Señal | Ubicación | Descripción |
|-------|-----------|-------------|
| 🔴 | loadWorld() | Tres onSnapshot (cities, npcs, shops): **unsubscribe no se guarda en variable**. |
| 🔴 | loadWorld() | **Listeners creados pero nunca cerrados** (no hay forma de desuscribirse al salir de vista DM). |
| 🟢 | loadWorld() | Tienen limit(300). |
| 🟢 | loadWorld() | No están en window.onload; están dentro de función llamada desde showDashboard(). |

### notifications.js

| Señal | Ubicación | Descripción |
|-------|-----------|-------------|
| 🟢 | startUnreadMailBadge() | Unsubscribe se guarda en _unreadBadgeUnsubscribe y se desuscribe antes de crear otro. |
| 🔴 | loadDMNotifications() | onSnapshot: **unsubscribe no se guarda**; **puede ejecutarse varias veces** (showDashboard + tras enviar/borrar). |
| 🔴 | loadPlayerNotifications() | Dos onSnapshot: **unsubscribe no se guarda**; **handler que se ejecuta varias veces** (cada entrada jugador). |
| 🔴 | loadPlayerNotifications() | **Listeners creados pero nunca cerrados**. |
| 🟢 | Queries | Tienen where/limit. |

### missions.js

| Señal | Ubicación | Descripción |
|-------|-----------|-------------|
| 🔴 | loadDMMissions() | onSnapshot: **unsubscribe no se guarda**; **listener nunca cerrado**. |
| 🟢 | loadPlayerMissions() | _playerMissionsUnsubscribe y _missionsBadgeUnsubscribe se guardan. |
| 🔴 | loadPlayerMissions() | En .catch() se crea **otro** listener; si .then() ya había creado uno y luego falla algo, puede quedar más de uno. |
| 🟢 | loadLegendTracks() / loadPlayerLegendTracks() | Desuscriben antes y guardan _legendUnsubscribe / _playerLegendUnsubscribe. |
| 🟢 | Queries | Tienen orderBy/limit. |

### players.js

| Señal | Ubicación | Descripción |
|-------|-----------|-------------|
| 🔴 | Línea 666 | **loadPlayers()** se llama **al cargar el script** (fuera de función, efecto “on load”). |
| 🔴 | loadPlayers() | onSnapshot(players): **unsubscribe no se guarda**. |
| 🔴 | loadPlayers() | **Listener creado pero nunca cerrado**. |
| 🔴 | loadPlayers() | **Puede ejecutarse dos veces**: una al cargar script, otra en showDashboard(). |
| 🟢 | Query | Tiene limit(200). |

### player-app.js

| Señal | Ubicación | Descripción |
|-------|-----------|-------------|
| 🔴 | subscribeToPlayer() | onSnapshot(players.doc(currentPlayerId)): **unsubscribe no se guarda**. |
| 🔴 | subscribeToPlayer() | **Handler que se puede ejecutar varias veces**: login (línea 57) + IIFE con sessionStorage (línea 280). |
| 🔴 | playerLogout() | **No se llama ningún unsubscribe**; el listener sigue activo tras cerrar sesión. |
| 🔴 | **Listener creado pero nunca cerrado**. |

### transactions.js

| Señal | Ubicación | Descripción |
|-------|-----------|-------------|
| 🟢 | loadTransactions() | Unsubscribe se guarda en _transactionsUnsubscribe y existe stopTransactionsListener(). |
| 🟢 | Solo se suscribe al abrir tab Historial; se desuscribe al cambiar de tab. |
| 🟢 | Query con orderBy y limit(200). |

### app.js (loadPlayerWorld / loadRutasConocidas)

| Señal | Ubicación | Descripción |
|-------|-----------|-------------|
| 🟢 | loadPlayerWorld() | Guarda unsubCities, unsubShops, unsubNpcs y _playerWorldUnsubscribes; se llama al salir a vista DM. |
| 🟢 | loadRutasConocidas() | Guarda window._rutasUnsubscribe. |
| 🟢 | Queries con limit. |

---

## 7. Resumen de acciones recomendadas (sin tocar lógica de negocio)

1. **Centralizar**: introducir el objeto y las funciones de registro/cierre anteriores.
2. **Registrar** cada unsubscribe donde ya exista (loadPlayerWorld, loadRutasConocidas, transactions, startUnreadMailBadge, loadLegendTracks, loadPlayerLegendTracks, misiones badge/player).
3. **Guardar y registrar** unsubscribe donde no se guarda: cities.js loadWorld(), app.js renderPlayerView(), notifications.js loadDMNotifications() y loadPlayerNotifications(), missions.js loadDMMissions(), players.js loadPlayers(), player-app.js subscribeToPlayer().
4. **Llamar closeAll** al cambiar de vista (DM ↔ jugador) y, si aplica, al cambiar de tab (p. ej. al salir de Historial).
5. **Evitar doble ejecución**: quitar la llamada suelta `loadPlayers();` al final de players.js; que solo se llame desde showDashboard() (o desde un único punto de entrada).
6. **player-app.js**: en playerLogout() llamar al cierre de la suscripción del jugador (o closeAll('player') si usas el patrón centralizado).

Con esto se cubren todas las señales rojas detectadas sin modificar la lógica de negocio, solo el ciclo de vida de los listeners.
