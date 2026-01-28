# 🏰 Nueva Valdoria

Sistema completo de gestión para campañas de Dungeons & Dragons. **Dashboard para Dungeon Masters** y **aplicación para jugadores** integrados en una sola plataforma.

## 📋 Descripción

Nueva Valdoria es una aplicación web completa diseñada para facilitar la gestión de campañas de D&D. Permite a los Dungeon Masters gestionar jugadores, ciudades, NPCs, tiendas e inventarios, mientras que los jugadores pueden acceder a sus personajes, explorar ciudades, comprar en tiendas y gestionar sus inventarios.

## 🚀 Características Principales

### Para Dungeon Masters 👑

- **Gestión de Jugadores**: Crear, editar y gestionar personajes con sus estadísticas, oro e inventarios
- **Gestión de Ciudades**: Crear ciudades con niveles de peligro y configurar visibilidad para jugadores
- **NPCs**: Gestionar personajes no jugables por ciudad con roles y actitudes
- **Tiendas**: Crear y gestionar diferentes tipos de tiendas (pociones, tabernas, forjas, artesanías, bibliotecas, emporios)
- **Inventarios de Tiendas**: Gestionar inventarios completos con precios, rarezas y efectos
- **Importación CSV**: Importar tiendas e items desde archivos CSV con plantillas predefinidas
- **Historial de Transacciones**: Ver todas las compras y ventas realizadas por los jugadores
- **Mapa del Mundo**: Configurar y mostrar el mapa de la campaña con URL de imagen
- **Battle Tracker**: Herramienta separada para rastrear combates durante las sesiones
- **Héroes Legendarios**: Sistema especial para gestionar héroes legendarios


### Para Jugadores ⚔️
- **Vista de Personaje**: Acceso a oro, inventario y estadísticas del personaje
- **Exploración de Ciudades**: Navegar por ciudades visibles y ver sus establecimientos
**Directorio de Tiendas**: Ver todas las tiendas disponibles en cada ciudad
- **Compras**: Comprar items de diferentes tiendas con carrito de compras
- **Gestión de Inventario**: Usar y vender items del inventario
- **Sistema de Posada**: Alquilar cuartos especiales con efectos temporales
- **Sistema de Santuario**: Ofrecer donaciones a deidades con efectos aleatorios
- **Habitantes**: Ver NPCs de cada ciudad con sus roles y actitudes


## 🔐 Sistema de Autenticación

El sistema utiliza autenticación personalizada basada en nombre y PIN:

- **Dungeon Masters**: Se autentican con nombre y PIN (almacenados en colección `dms`)
- **Jugadores**: Se autentican con nombre y PIN asignados por el DM (almacenados en colección `players`)

### Crear el Primer DM
Tienes tres opciones para crear el primer DM:

1. **Desde la Interfaz** (Recomendado): Usa el botón "👑 Crear Cuenta DM" en el modal de login
2. **Desde la Consola**: Ejecuta `crearDMDesdeConsola("Nombre", "PIN")` en la consola del navegador
3. **Manual en Firebase**: Crea manualmente la colección `dms` en Firebase ConsolePara más detalles, consulta `CREAR_DM.md` y `AUTH_SETUP.md`.

## 📁 Estructura del Proyecto

dm-dashboard-modular/
├── index.html # App principal: login compartido + vista DM o Personaje
├── player.html # Entrada alternativa solo para personajes
├── battle-tracker.html # Herramienta de seguimiento de combates
├── heroes-legendarios.html # Sistema de héroes legendarios
├── AUTH_SETUP.md # Documentación del sistema de autenticación
├── CREAR_DM.md # Guía para crear el primer DM
├── css/
│ └── styles.css # Estilos compartidos
├── js/
│ ├── app.js # Lógica principal DM: navegación y funciones compartidas
│ ├── auth.js # Sistema de autenticación
│ ├── players.js # Gestión de jugadores (DM)
│ ├── cities.js # Gestión de ciudades, NPCs y tiendas (DM)
│ ├── inventory.js # Gestión de inventarios de tiendas (DM)
│ ├── transactions.js # Historial de transacciones (DM)
│ └── player-app.js # Lógica de la aplicación para jugadores
└── csv-plantillas/ # Plantillas CSV para importar tiendas
├── 01_pociones_emporio_batalla.csv
├── 02_taberna.csv
├── 03_forja_herreria.csv
├── 04_artesanias_arqueria.csv
├── 05_biblioteca.csv
└── 06_emporio_20_ejemplos.csv

## 🚀 Inicio Rápido

### Requisitos Previos
- Proyecto Firebase configurado con Firestore habilitado
- Configuración de Firebase en `js/app.js` y `js/player-app.js`

### Pasos de Instalación
1. **Clona o descarga el proyecto**   git clone [tu-repositorio]   cd dm-dashboard-modular   
Configura Firebase
Edita js/app.js y js/player-app.js
Reemplaza firebaseConfig con tus credenciales de Firebase
Crea el primer DM
Abre index.html en tu navegador
Haz clic en "👑 Crear Cuenta DM"
Completa el formulario con nombre y PIN
Inicia sesión
Selecciona "Dungeon Master" o "Personaje"
Ingresa nombre y PIN

¡Comienza a gestionar tu campaña!

📝 Funcionalidades Detalladas

Tipos de Tiendas

El sistema soporta varios tipos de tiendas especializadas:

🧪 Pociones: Tiendas de pociones y consumibles
🍺 Tabernas: Establecimientos para comida y bebida
⚒️ Forjas: Herrerías con diferentes niveles de calidad
🏹 Artesanías: Tiendas de arquería y artesanías
📚 Bibliotecas: Librerías y conocimiento
🏪 Emporios: Tiendas generales con múltiples categorías
🏨 Posadas: Establecimientos con cuartos especiales
⛪ Santuarios: Lugares sagrados con sistema de donaciones

Sistema de Inventario

Los jugadores pueden ver su inventario completo con cantidades
Agrupa items idénticos automáticamente
Permite usar items individuales
Sistema de venta con 75% del valor de compra
Soporte para venta de múltiples unidades

Importación CSV

El sistema permite importar tiendas completas desde archivos CSV. Las plantillas incluyen:
Columnas: nombre, tipo, precio, rarity, effect, descripcion
Soporte para múltiples items por archivo
Validación automática de datos

🔧 Tecnologías Utilizadas

HTML5: Estructura y marcado semántico
CSS3: Estilos modernos con diseño responsivo
JavaScript (Vanilla): Lógica del cliente sin frameworks
Firebase Firestore: Base de datos en tiempo real
Google Fonts: Tipografías temáticas (Cinzel, Crimson Text)
