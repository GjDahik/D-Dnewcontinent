# 🏰 Nueva Valdoria

**Dashboard DM** y **App de Personajes** separados.

## 🚀 Entrada única y login compartido

- **`index.html`** — Entrada única. **DM y personajes usan el mismo login**: tipo (DM / Personaje), nombre y PIN.
  - Si entras como **DM** → ves el panel del Dungeon Master.
  - Si entras como **Personaje** → ves tu ficha (oro e inventario).

## 📁 Estructura del Proyecto

```
dm-dashboard-modular/
├── index.html          # App única: login compartido + vista DM o Personaje
├── player.html         # (opcional) Entrada solo personajes, por si se usa enlace aparte
├── css/
│   └── styles.css      # Estilos compartidos
└── js/
    ├── app.js          # DM: app, navegación
    ├── auth.js         # DM: autenticación
    ├── players.js      # DM: jugadores
    ├── cities.js       # DM: ciudades, NPCs, tiendas
    ├── inventory.js    # DM: inventarios de tiendas
    ├── transactions.js # DM: transacciones
    └── player-app.js   # App jugadores: login y vista de personaje
```

## 🚀 Uso

1. Abre `index.html`.
2. En el login elige **Dungeon Master** o **Personaje**, escribe nombre y PIN.
3. Tras entrar verás el panel de DM o tu ficha de personaje según el tipo.
4. Compatible con GitHub Pages (solo archivos estáticos).

## 📝 Funcionalidades

- **Jugadores**: Crear, editar, gestionar oro e inventarios
- **Ciudades**: Crear ciudades con niveles de peligro
- **NPCs**: Gestionar NPCs por ciudad
- **Tiendas**: Crear tiendas con inventarios
- **Importación CSV**: Importar tiendas e items desde archivos CSV
- **Transacciones**: Historial de compras

## 🔧 Tecnologías

- HTML5
- CSS3
- JavaScript (Vanilla)
- Firebase Firestore

## 📤 GitHub Pages

Para desplegar en GitHub Pages:

1. Sube todos los archivos a tu repositorio
2. Configura GitHub Pages para usar la rama `main` o `master`
3. El archivo `index.html` debe estar en la raíz del repositorio

## 📄 Licencia

Proyecto de hobby - Uso personal
