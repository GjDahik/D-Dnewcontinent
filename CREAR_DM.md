# 👑 Cómo Crear el Primer DM

La colección `dms` se creará automáticamente cuando crees el primer DM. Tienes 3 opciones:

## Opción 1: Desde la Interfaz (MÁS FÁCIL) ⭐

1. Abre `index.html` en tu navegador
2. En el modal de login, haz clic en el botón **"👑 Crear Cuenta DM"**
3. Completa el formulario:
   - **Nombre del DM**: Ej: "Master Valdoria"
   - **PIN**: Mínimo 4 dígitos (Ej: "1234")
   - **Confirmar PIN**: Mismo PIN
4. Haz clic en **"👑 Crear Cuenta"**
5. ✅ La colección `dms` se creará automáticamente en Firebase
6. Ahora puedes iniciar sesión con esas credenciales

## Opción 2: Desde la Consola del Navegador

1. Abre `index.html` en tu navegador
2. Abre la consola del desarrollador (F12 o Cmd+Option+I)
3. En la consola, escribe:
```javascript
crearDMDesdeConsola("Master Valdoria", "1234")
```
4. Presiona Enter
5. ✅ El DM se creará y verás un mensaje de confirmación

## Opción 3: Manualmente en Firebase Console

Si prefieres crearlo manualmente:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto "nueva-valdoria"
3. Ve a **Firestore Database**
4. Haz clic en **"Iniciar colección"** o **"Add collection"**
5. **ID de colección**: `dms`
6. Haz clic en **"Siguiente"**
7. Agrega el primer documento:
   - **ID del documento**: Déjalo en "Auto-ID" (se generará automáticamente)
   - **Campos**:
     - `nombre` (string): "Master Valdoria"
     - `pin` (string): "1234"
     - `fechaCreacion` (timestamp): Haz clic en el ícono de reloj y selecciona "now"
8. Haz clic en **"Guardar"**
9. ✅ Listo, ya tienes tu primer DM

## Verificar que se creó

Después de crear el DM (cualquiera de las opciones):

1. Ve a Firebase Console > Firestore
2. Deberías ver la colección `dms`
3. Dentro debería estar tu DM con nombre y PIN

## Iniciar Sesión

Una vez creado el DM:

1. En el modal de login, selecciona **"👑 Dungeon Master"**
2. Ingresa el nombre y PIN que creaste
3. Haz clic en **"🔐 Iniciar Sesión"**
4. ✅ Deberías ver el dashboard completo

## Nota Importante

- La colección `dms` **NO necesita existir antes**
- Firebase la creará automáticamente cuando agregues el primer documento
- Puedes crear múltiples DMs si lo necesitas
- Cada DM debe tener un nombre único
