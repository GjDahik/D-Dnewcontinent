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
