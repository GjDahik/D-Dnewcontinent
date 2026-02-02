// ==================== AUTHENTICATION SYSTEM ====================
// Sistema de autenticación custom usando nombre + PIN
// Soporta tanto DM como Personajes

let currentUser = null;
let userType = null; // 'dm' o 'player'

// ==================== DM AUTHENTICATION ====================
async function loginDM(nombre, pin) {
    try {
        // Buscar DM en la colección 'dms'
        const dmsSnapshot = await db.collection('dms')
            .where('nombre', '==', nombre)
            .where('pin', '==', pin)
            .limit(1)
            .get();

        if (dmsSnapshot.empty) {
            showToast('Nombre o PIN incorrecto', true);
            return false;
        }

        const dmDoc = dmsSnapshot.docs[0];
        currentUser = {
            id: dmDoc.id,
            nombre: dmDoc.data().nombre,
            tipo: 'dm'
        };
        userType = 'dm';

        // Guardar en sessionStorage
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        sessionStorage.setItem('userType', 'dm');

        showToast('¡Bienvenido, ' + nombre + '!');
        return true;
    } catch (error) {
        showToast('Error al iniciar sesión: ' + error.message, true);
        return false;
    }
}

// ==================== PLAYER AUTHENTICATION ====================
async function loginPlayer(nombre, pin) {
    try {
        // Buscar personaje en la colección 'players'
        const playersSnapshot = await db.collection('players')
            .where('nombre', '==', nombre)
            .where('pin', '==', pin)
            .limit(1)
            .get();

        if (playersSnapshot.empty) {
            showToast('Nombre o PIN incorrecto', true);
            return false;
        }

        const playerDoc = playersSnapshot.docs[0];
        const playerData = playerDoc.data();
        
        currentUser = {
            id: playerDoc.id,
            nombre: playerData.nombre,
            clase: playerData.clase,
            nivel: playerData.nivel,
            oro: playerData.oro,
            inventario: playerData.inventario || [],
            tipo: 'player'
        };
        userType = 'player';

        // Guardar en sessionStorage
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        sessionStorage.setItem('userType', 'player');

        showToast('¡Bienvenido, ' + nombre + '!');
        return true;
    } catch (error) {
        showToast('Error al iniciar sesión: ' + error.message, true);
        return false;
    }
}

// ==================== LOGOUT ====================
function logout() {
    if (typeof closeAllSubscriptions === 'function') closeAllSubscriptions();
    currentUser = null;
    userType = null;
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('userType');
    showToast('Sesión cerrada');
    showLoginModal();
}

// ==================== CHECK AUTHENTICATION ====================
function checkAuth() {
    const savedUser = sessionStorage.getItem('currentUser');
    const savedType = sessionStorage.getItem('userType');

    if (savedUser && savedType) {
        currentUser = JSON.parse(savedUser);
        userType = savedType;
        return true;
    }
    return false;
}

// ==================== GET CURRENT USER ====================
function getCurrentUser() {
    return currentUser;
}

function getUserType() {
    return userType;
}

function isDM() {
    return userType === 'dm';
}

function isPlayer() {
    return userType === 'player';
}

// ==================== CREATE DM (First Time Setup) ====================
// Esta función crea un nuevo DM en la colección 'dms'
// Si la colección no existe, Firebase la crea automáticamente
async function createDM(nombre, pin) {
    try {
        // Verificar si ya existe un DM con ese nombre
        const existingDM = await db.collection('dms')
            .where('nombre', '==', nombre)
            .limit(1)
            .get();

        if (!existingDM.empty) {
            showToast('Ya existe un DM con ese nombre', true);
            return false;
        }

        // Crear nuevo DM
        // Firebase creará la colección 'dms' automáticamente si no existe
        await db.collection('dms').add({
            nombre: nombre,
            pin: pin,
            fechaCreacion: firebase.firestore.Timestamp.now()
        });

        showToast('DM creado exitosamente');
        return true;
    } catch (error) {
        showToast('Error al crear DM: ' + error.message, true);
        console.error('Error creando DM:', error);
        return false;
    }
}

// ==================== HELPER: Crear DM desde consola ====================
// Esta función está disponible globalmente para crear DMs desde la consola
// Uso: crearDMDesdeConsola("Nombre", "1234")
window.crearDMDesdeConsola = async function(nombre, pin) {
    console.log('Creando DM:', nombre);
    const resultado = await createDM(nombre, pin);
    if (resultado) {
        console.log('✅ DM creado exitosamente');
    } else {
        console.log('❌ Error al crear DM');
    }
    return resultado;
};
