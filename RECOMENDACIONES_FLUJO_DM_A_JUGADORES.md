# Recomendaciones: flujo de lo que el DM envía a los jugadores

**Enfoque:** Lo importante del juego son **ciudades y tiendas** (y NPCs). El flujo DM → jugadores debe estar optimizado sobre todo ahí. La Leyenda (audios) es secundaria.

---

## 1. Qué envía el DM — prioridad

### Núcleo del juego (ciudades y tiendas)

| Qué envía el DM | Dónde | Qué ve el jugador |
|-----------------|--------|-------------------|
| **Ciudades** (crear, editar, visible/oculta) | `cities` | Lista en Ciudades; solo las con `visibleToPlayers !== false`. |
| **Tiendas** (crear, editar, inventario) | `shops` | Directorio de cada ciudad → Comercios. |
| **NPCs** (crear, editar) | `npcs` | Directorio → Habitantes; dueños de tiendas. |

Aquí es donde el flujo debe ser claro: el DM crea/edita y tanto el DM como el jugador ven los cambios sin confusión.

### Resto (importante pero no el núcleo)

| Qué envía el DM | Dónde | Qué ve el jugador |
|-----------------|--------|-------------------|
| Misiones (crear, visibles, asignar) | `missions` | Pestaña Misiones (listener → se actualiza solo). |
| Notificaciones / correo | `notifications` | CDD & Correo (listener). |
| Cartas del destino | `players` | CDD & Correo (listener). |
| Oro / inventario (edición DM) | `players` | Al instante (listener). |

### Secundario (no prioritario)

| Qué envía el DM | Dónde | Notas |
|-----------------|--------|--------|
| **Leyenda** (audios MP3) | `legend_audio` | No es una parte importante del juego. Se mantiene con caché y get al abrir; sin invertir más esfuerzo aquí. |
| Niveles del mapa | `settings.map` | Se carga al entrar. |

---

## 2. Flujo actual: ciudades y tiendas

| Acción | DM | Jugador |
|--------|-----|---------|
| DM crea/edita ciudad, tienda o NPC | Tras guardar se llama `loadWorld()` → **ve el cambio al momento** en la lista. | Debe usar **«Refrescar mundo»** en Ciudades para ver ciudades/tiendas nuevas o ciudades recién visibles. |
| DM borra tienda o NPC | Se llama `loadWorld()` → lista del DM actualizada. | Igual: **«Refrescar mundo»** para ver el cambio. |
| Jugador pulsa «Refrescar mundo» | — | Se ejecuta `refreshPlayerWorld()` (ciudades + tiendas + NPCs) y toast «Ciudades y tiendas actualizados». |

**Implementado:**  
- DM: refresh tras crear/editar/borrar ciudad, tienda y NPC.  
- Jugador: botón **«Refrescar mundo»** en la sección Ciudades y Pueblos.

---

## 3. Mejoras posibles (solo ciudades y tiendas)

- **Toast al DM** tras crear ciudad/tienda/NPC: *«Creado. Los jugadores verán los cambios al pulsar Refrescar mundo.»* — para que el DM sepa que debe avisar.  
- **Indicador al jugador** tras «Refrescar mundo»: ya existe el toast «Ciudades y tiendas actualizados»; se puede dejar así o acortar/mejorar el texto si hace falta.

No se priorizan cambios en Leyenda; el foco sigue siendo tiendas y ciudades.

---

## 4. Resumen

| Área | Prioridad | Estado |
|------|-----------|--------|
| **Ciudades** | Alta | DM ve cambios al momento; jugador con «Refrescar mundo». |
| **Tiendas** | Alta | Igual que ciudades. |
| **NPCs** | Alta | Igual que ciudades. |
| Misiones, notificaciones, cartas, oro | Media | Ya en tiempo real o con flujo aceptable. |
| **Leyenda** | Baja | No parte importante; mantener como está (caché + get al abrir). |

Enfocarse en **tiendas y ciudades** (y NPCs) está reflejado en el código y en este documento; Leyenda queda como funcionalidad secundaria.
