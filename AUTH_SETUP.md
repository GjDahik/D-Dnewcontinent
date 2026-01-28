# 🔐 Sistema de Autenticación - Setup

## Estructura de Datos en Firestore

### Colección: `dms`
Almacena los Dungeon Masters con acceso completo al dashboard.

**Estructura:**
```javascript
{
  nombre: "Master Valdoria",  // Nombre del DM
  pin: "1234",                // PIN de acceso
  fechaCreacion: Timestamp    // Fecha de creación
}
```

### Colección: `players`
Ya existe y almacena los personajes. Los personajes usan `nombre` + `pin` para autenticarse.

**Estructura (ya existente):**
```javascript
{
  nombre: "Big Mamma",
  pin: "1234",              // PIN asignado por el DM
  clase: "Guerrero",
  nivel: 6,
  oro: 1232,
  inventario: [...],
  notas: "Notas del DM"
}
```

## Crear el Primer DM

### Opción 1: Desde la Interfaz (Recomendado)
1. Abre el dashboard
2. En el modal de login, haz clic en "👑 Crear Cuenta DM"
3. Completa el formulario:
   - Nombre del DM
   - PIN (mínimo 4 dígitos)
   - Confirmar PIN
4. Haz clic en "Crear Cuenta"
5. Inicia sesión con las credenciales creadas

### Opción 2: Desde la Consola del Navegador
1. Abre el dashboard en el navegador
2. Abre la consola del desarrollador (F12)
3. Ejecuta:
```javascript
createDM("Tu Nombre", "1234")
```

### Opción 3: Directamente en Firestore
1. Ve a Firebase Console > Firestore
2. Crea una nueva colección llamada `dms`
3. Agrega un documento con estos campos:
   - `nombre`: (string) - Nombre del DM
   - `pin`: (string) - PIN de acceso
   - `fechaCreacion`: (timestamp) - Fecha actual

## Flujo de Autenticación

### Para DM:
1. Usuario selecciona "Dungeon Master" en el login
2. Ingresa nombre y PIN
3. Sistema busca en colección `dms`
4. Si encuentra coincidencia, permite acceso al dashboard completo
5. Si no encuentra, muestra error

### Para Personajes:
1. Usuario selecciona "Personaje" en el login
2. Ingresa nombre y PIN
3. Sistema busca en colección `players`
4. Si encuentra coincidencia, debería redirigir a la app de personajes (aún no creada)
5. Por ahora, muestra mensaje de que deben usar la app de personajes

## Seguridad

⚠️ **Nota Importante:**
- Este sistema usa autenticación custom (nombre + PIN)
- Los PINs se almacenan en texto plano en Firestore
- Para producción, considera:
  - Encriptar los PINs
  - Usar Firebase Authentication con email/password
  - Implementar reglas de seguridad en Firestore

## Reglas de Seguridad Recomendadas (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // DMs solo pueden leer/escribir si están autenticados
    match /dms/{dmId} {
      allow read, write: if request.auth != null;
    }
    
    // Players: DM puede leer/escribir todo, personajes solo su propio documento
    match /players/{playerId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null; // En producción, restringir más
    }
    
    // Otras colecciones
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Próximos Pasos

1. ✅ Sistema de autenticación implementado
2. ⏳ Crear app de personajes (usará las mismas funciones de auth)
3. ⏳ Implementar reglas de seguridad en Firestore
4. ⏳ Considerar encriptación de PINs
