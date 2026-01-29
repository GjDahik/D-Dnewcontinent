// ==================== FIREBASE CONFIGURATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyAfOdbG9zqU4ccC_B-ZCUGPnfBDM2KvB-I",
    authDomain: "nueva-valdoria.firebaseapp.com",
    projectId: "nueva-valdoria",
    storageBucket: "nueva-valdoria.firebasestorage.app",
    messagingSenderId: "29742426810",
    appId: "1:29742426810:web:0cf259ba71b0e5f0d8f083"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==================== GLOBAL DATA ====================
var citiesData = [], npcsData = [], shopsData = [], playersData = [];
var playerCitiesData = [], playerShopsData = [], playerNpcsData = [];

function getCityInfoForShop(shop) {
    if (!shop || !shop.ciudadId) return { cityId: '', cityName: '' };
    const city = playerCitiesData.find(c => c.id === shop.ciudadId);
    return { cityId: shop.ciudadId || '', cityName: city ? (city.nombre || '') : '' };
}

let playerPotionCart = [], playerPotionShopId = null, playerPotionProducts = [], playerPotionFilter = 'all', playerPotionSearchTerm = '';
let lastPlayerViewData = null;
let playerTavernShopId = null, playerTavernCart = [];
let playerForgeShopId = null, playerForgeCart = [], playerForgeLevel = 1, playerForgeTab = 'forge-shop';
let playerArtesaniasShopId = null, playerArtesaniasCart = [], playerArtesaniasTab = 'flechas';
let playerEmporioShopId = null, playerEmporioCart = [], playerEmporioTab = 'materiales';
let playerBibliotecaShopId = null, playerBibliotecaCart = [];
let playerBancoShopId = null;
let playerPosadaShopId = null;
let playerPosadaCart = [];
let playerBatallaShopId = null;
let playerBatallaSelected = [];

/** Cuartos de la Posada de Nebula (tipos fijos, sin inventario). Usado también por posadas de otras ciudades y por mensajes automáticos. */
const POSADA_CUARTOS = [
    { id: 'guerrero', nombre: 'Cuarto del Guerrero Valiente', precio: 50, efecto: 'El aventurero recibe un aumento temporal en su salud. Al siguiente combate, su máximo de puntos de golpe aumenta en 10 durante 1 hora.' },
    { id: 'sabio', nombre: 'Cuarto del Sabio Estelar', precio: 75, efecto: 'El aventurero recibe un bono a sus tiradas de inteligencia en su próxima aventura. Al realizar un chequeo de habilidad que dependa de Inteligencia, el aventurero obtiene un +2 por 1 hora.' },
    { id: 'elementos', nombre: 'Cuarto de los Elementos', precio: 100, efecto: 'El aventurero puede elegir una resistencia elemental para su próxima aventura. Durante 1 hora, el aventurero obtiene ventaja en todas las tiradas de salvación contra un tipo de daño específico (fuego, frío, electricidad, ácido, etc.) que elija al momento de ingresar al cuarto.' },
    { id: 'viento', nombre: 'Cuarto del Enigma del Viento', precio: 120, efecto: 'Aumenta la velocidad de movimiento del aventurero. Durante 1 hora, su velocidad de movimiento se incrementa en 10 pies y obtiene ventaja en las tiradas de salvación contra efectos de control de movimiento (como estar paralizado, atado, etc.).' }
];
if (typeof window !== 'undefined') window.POSADA_CUARTOS = POSADA_CUARTOS;

/** Devuelve el texto de descripción/efecto de un ítem (lo que sube el DM desde el dashboard) */
function getItemDesc(obj) {
    if (!obj) return '';
    const t = (obj.effect || obj.desc || obj.description || obj.descripcion || '');
    return (typeof t === 'string' ? t : String(t)).trim();
}

/** Construye HTML de recibo para cualquier tienda.
 *  opts: {
 *    shopName, logo, subtitle,
 *    items: [{name, line}],
 *    totalLabel, totalValue,
 *    extraLines: [{label, value}],
 *    footerThanks,
 *    modalId,
 *    primaryButton?: { label: string, onclick: string } // si se pasa, reemplaza el botón "Cerrar" del recibo
 *  }
 */
function buildShopReceiptHTML(opts) {
    const { shopName, logo, subtitle, items, totalLabel, totalValue, extraLines, footerThanks, modalId, primaryButton } = opts;
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const esc = s => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const itemRows = (items || []).map(i => `<div class="player-shop-receipt-item"><span class="player-shop-receipt-item-name">${esc(i.name)}</span><span class="player-shop-receipt-item-price">${esc(i.line)}</span></div>`).join('');
    const extraRows = (extraLines || []).map(l => `<div class="player-shop-receipt-item"><span class="player-shop-receipt-item-name">${esc(l.label)}</span><span class="player-shop-receipt-item-price">${esc(l.value)}</span></div>`).join('');
    const primaryBtnHtml = (primaryButton && primaryButton.label && primaryButton.onclick)
        ? `<button type="button" class="btn player-shop-receipt-close" onclick="${String(primaryButton.onclick)}">${esc(primaryButton.label)}</button>`
        : `<button type="button" class="btn player-shop-receipt-close" onclick="closeModal('${String(modalId || '')}')">Cerrar</button>`;
    return `<div class="player-shop-receipt">
        <div class="player-shop-receipt-header">
            <div class="player-shop-receipt-logo">${logo || '🧾'}</div>
            <div class="player-shop-receipt-title">${esc(shopName).toUpperCase()}</div>
            <div class="player-shop-receipt-subtitle">${esc(subtitle)}</div>
        </div>
        <div class="player-shop-receipt-body">${itemRows}${extraRows}</div>
        <div class="player-shop-receipt-total"><span class="player-shop-receipt-total-label">${esc(totalLabel)}</span><span class="player-shop-receipt-value">${esc(totalValue)}</span></div>
        <div class="player-shop-receipt-footer">
            <div class="player-shop-receipt-date">${dateStr} — ${timeStr}</div>
            <div class="player-shop-receipt-thanks">${esc(footerThanks)}</div>
        </div>
        ${primaryBtnHtml}
    </div>`;
}

// ==================== AUTHENTICATION HANDLERS ====================
function toggleLoginFields() {
    const userType = document.getElementById('login-user-type').value;
    const dmGroup = document.getElementById('login-dm-name-group');
    const playerGroup = document.getElementById('login-player-select-group');
    if (userType === 'dm') {
        dmGroup.style.display = 'block';
        playerGroup.style.display = 'none';
        document.getElementById('login-nombre').value = '';
        document.getElementById('login-player-select').value = '';
    } else {
        dmGroup.style.display = 'none';
        playerGroup.style.display = 'block';
        document.getElementById('login-nombre').value = '';
        loadLoginPlayers();
    }
}

async function loadLoginPlayers() {
    const sel = document.getElementById('login-player-select');
    sel.innerHTML = '<option value="">— Cargando… —</option>';
    try {
        const snap = await db.collection('players').get();
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        sel.innerHTML = '<option value="">— Selecciona tu aventurero —</option>';
        list.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.nombre || '';
            opt.textContent = p.nombre || 'Sin nombre';
            opt.dataset.id = p.id;
            sel.appendChild(opt);
        });
    } catch (e) {
        sel.innerHTML = '<option value="">— Error al cargar —</option>';
        console.error(e);
    }
}

async function handleLogin() {
    const userType = document.getElementById('login-user-type').value;
    const pin = document.getElementById('login-pin').value.trim();
    let nombre = '';

    if (userType === 'dm') {
        nombre = document.getElementById('login-nombre').value.trim();
    } else {
        const sel = document.getElementById('login-player-select');
        nombre = (sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].value) || '';
    }

    if (!nombre || !pin) {
        showToast('Por favor completa todos los campos', true);
        return;
    }

    let success = false;
    if (userType === 'dm') {
        success = await loginDM(nombre, pin);
    } else {
        success = await loginPlayer(nombre, pin);
    }

    if (success) {
        closeModal('login-modal');
        if (userType === 'dm') {
            showDashboard();
        } else {
            showPlayerView();
        }
    }
}

async function handleCreateDM() {
    const nombre = document.getElementById('create-dm-nombre').value.trim();
    const pin = document.getElementById('create-dm-pin').value.trim();
    const pinConfirm = document.getElementById('create-dm-pin-confirm').value.trim();

    if (!nombre || !pin || !pinConfirm) {
        showToast('Por favor completa todos los campos', true);
        return;
    }

    if (pin.length < 4) {
        showToast('El PIN debe tener al menos 4 dígitos', true);
        return;
    }

    if (pin !== pinConfirm) {
        showToast('Los PINs no coinciden', true);
        return;
    }

    const success = await createDM(nombre, pin);
    if (success) {
        closeModal('create-dm-modal');
        document.getElementById('login-nombre').value = nombre;
        document.getElementById('login-pin').value = '';
        if (document.getElementById('login-user-type')) document.getElementById('login-user-type').value = 'dm';
        showToast('Cuenta creada. Ahora puedes iniciar sesión');
    }
}

function showCreateDMModal() {
    document.getElementById('create-dm-nombre').value = '';
    document.getElementById('create-dm-pin').value = '';
    document.getElementById('create-dm-pin-confirm').value = '';
    openModal('create-dm-modal');
}

function showLoginModal() {
    document.getElementById('login-nombre').value = '';
    document.getElementById('login-pin').value = '';
    const typeEl = document.getElementById('login-user-type');
    if (typeEl) typeEl.value = 'dm';
    document.getElementById('main-container').style.display = 'none';
    const pv = document.getElementById('player-view-container');
    if (pv) pv.style.display = 'none';
    document.getElementById('login-modal').classList.add('active');
    if (typeof toggleLoginFields === 'function') toggleLoginFields();
}

const DEFAULT_MAP_IMAGE_URL = 'https://i.imgur.com/ppAIykX.png';
const DEFAULT_CONTINENT_NAME = 'Nueva Valdoria';

async function loadMapImage() {
    try {
        const snap = await db.collection('settings').doc('map').get();
        const data = snap.exists ? snap.data() : {};
        const url = (data.imageUrl) ? data.imageUrl.trim() : DEFAULT_MAP_IMAGE_URL;
        const continentName = (data.continentName) ? data.continentName.trim() : DEFAULT_CONTINENT_NAME;
        
        const mapImg = document.getElementById('map-img');
        const playerMapImg = document.getElementById('player-map-img');
        const inputEl = document.getElementById('map-image-url');
        const continentInputEl = document.getElementById('map-continent-name');
        const mapTitleDM = document.getElementById('map-title-dm');
        const mapTitlePlayer = document.getElementById('map-title-player');
        
        if (mapImg) mapImg.src = url;
        if (playerMapImg) playerMapImg.src = url;
        if (inputEl && isDM()) inputEl.value = url;
        if (continentInputEl && isDM()) continentInputEl.value = continentName;
        
        // Actualizar títulos del mapa
        if (mapTitleDM) mapTitleDM.textContent = '🗺️ Mapa de ' + continentName;
        if (mapTitlePlayer) mapTitlePlayer.textContent = '🗺️ Mapa de ' + continentName;
        
        // Actualizar atributos alt de las imágenes
        if (mapImg) mapImg.alt = 'Mapa de ' + continentName;
        if (playerMapImg) playerMapImg.alt = 'Mapa de ' + continentName;
        
        // Actualizar texto de jugadores
        const playersContinentText = document.getElementById('players-continent-text');
        if (playersContinentText) playersContinentText.textContent = 'Los héroes de ' + continentName;
    } catch (e) {
        const mapImg = document.getElementById('map-img');
        const playerMapImg = document.getElementById('player-map-img');
        const mapTitleDM = document.getElementById('map-title-dm');
        const mapTitlePlayer = document.getElementById('map-title-player');
        
        if (mapImg) mapImg.src = DEFAULT_MAP_IMAGE_URL;
        if (playerMapImg) playerMapImg.src = DEFAULT_MAP_IMAGE_URL;
        if (mapTitleDM) mapTitleDM.textContent = '🗺️ Mapa de ' + DEFAULT_CONTINENT_NAME;
        if (mapTitlePlayer) mapTitlePlayer.textContent = '🗺️ Mapa de ' + DEFAULT_CONTINENT_NAME;
        
        // Actualizar texto de jugadores
        const playersContinentText = document.getElementById('players-continent-text');
        if (playersContinentText) playersContinentText.textContent = 'Los héroes de ' + DEFAULT_CONTINENT_NAME;
    }
}

function toggleMapEditMode() {
    if (!isDM()) return;
    const row = document.getElementById('map-config-row');
    const btn = document.getElementById('map-edit-toggle-btn');
    if (!row || !btn) return;
    const isEditing = row.style.display === 'flex';
    if (isEditing) {
        row.style.display = 'none';
        btn.textContent = '✏️ Editar mapa';
        btn.title = 'Mostrar configuración del mapa';
    } else {
        row.style.display = 'flex';
        btn.textContent = '✔️ Ocultar configuración';
        btn.title = 'Volver al modo solo ver';
    }
}

async function saveMapImage() {
    if (!isDM()) return;
    const inputEl = document.getElementById('map-image-url');
    const continentInputEl = document.getElementById('map-continent-name');
    if (!inputEl) return;
    
    const url = (inputEl.value || '').trim();
    const continentName = (continentInputEl && continentInputEl.value) ? continentInputEl.value.trim() : DEFAULT_CONTINENT_NAME;
    
    if (!url) {
        showToast('Escribe la URL de la imagen (ej: https://i.imgur.com/xxxxx.png)', true);
        return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showToast('La URL debe comenzar con https:// (ej: https://i.imgur.com/xxxxx.png)', true);
        return;
    }
    try {
        await db.collection('settings').doc('map').set({ 
            imageUrl: url,
            continentName: continentName || DEFAULT_CONTINENT_NAME
        }, { merge: true });
        
        const mapImg = document.getElementById('map-img');
        const playerMapImg = document.getElementById('player-map-img');
        const mapTitleDM = document.getElementById('map-title-dm');
        const mapTitlePlayer = document.getElementById('map-title-player');
        
        if (mapImg) {
            mapImg.src = url;
            mapImg.alt = 'Mapa de ' + continentName;
        }
        if (playerMapImg) {
            playerMapImg.src = url;
            playerMapImg.alt = 'Mapa de ' + continentName;
        }
        if (mapTitleDM) mapTitleDM.textContent = '🗺️ Mapa de ' + continentName;
        if (mapTitlePlayer) mapTitlePlayer.textContent = '🗺️ Mapa de ' + continentName;
        
        // Actualizar texto de jugadores
        const playersContinentText = document.getElementById('players-continent-text');
        if (playersContinentText) playersContinentText.textContent = 'Los héroes de ' + continentName;
        
        showToast('Mapa actualizado correctamente');
    } catch (e) {
        showToast('Error al guardar: ' + e.message, true);
    }
}

function getTipoLabel(item) {
    const v = (item.tipo || item.type || item.section || item.categoria || item.tier || '').toString().trim().toLowerCase();
    const map = { libro: 'Libro', libros: 'Libro', poción: 'Poción', pocion: 'Poción', pociones: 'Poción', arma: 'Arma', armas: 'Arma', armadura: 'Armadura', armaduras: 'Armadura', bebida: 'Bebida', bebidas: 'Bebida', servir: 'Bebida', drink: 'Bebida', grimorio: 'Libro', grimorios: 'Libro', herrería: 'Arma/Armadura', forja: 'Arma/Armadura', objeto: 'Objeto' };
    if (map[v]) return map[v];
    if (v) return v.charAt(0).toUpperCase() + v.slice(1);
    if ((item.name || '').toLowerCase().includes('poción')) return 'Poción';
    if ((item.name || '').toLowerCase().match(/\b(espada|daga|arco|arma)\b/)) return 'Arma';
    if ((item.name || '').toLowerCase().match(/\b(armadura|capa|anillo|escudo)\b/)) return 'Armadura';
    if ((item.name || '').toLowerCase().includes('libro')) return 'Libro';
    return 'Objeto';
}

function groupInventoryItems(items) {
    const map = {};
    (items || []).forEach((item, i) => {
        const key = (item.name || '') + '|' + (item.effect || '') + '|' + (item.price ?? '') + '|' + (item.rarity || '');
        if (!map[key]) map[key] = { item, indices: [] };
        map[key].indices.push(i);
    });
    return Object.values(map).map(g => ({ item: g.item, count: g.indices.length, indices: g.indices }));
}

function renderPlayerView(data) {
    lastPlayerViewData = data;
    const nombre = data.nombre || '—';
    const classLevel = (data.clase || '—') + ' • Nivel ' + (data.nivel || 1);
    const oro = (data.oro != null ? data.oro : 0).toLocaleString() + ' GP';
    document.getElementById('player-header-name').textContent = nombre;
    document.getElementById('player-header-class-level').textContent = classLevel;
    document.getElementById('player-header-oro').textContent = '💰 ' + oro;
    const list = document.getElementById('player-view-inventory');
    const toolbar = document.getElementById('player-inventory-toolbar');
    const items = data.inventario || [];
    const rarityColors = { común: '#2ecc71', infrecuente: '#3498db', rara: '#9b59b6', legendaria: '#e74c3c' };
    if (items.length === 0) {
        if (toolbar) toolbar.style.display = 'none';
        list.innerHTML = '<p style="color:#8b7355; text-align:center; padding:20px;">Sin items</p>';
        return;
    }
    if (toolbar) toolbar.style.display = 'flex';
    const searchEl = document.getElementById('player-inventory-search');
    const filterEl = document.getElementById('player-inventory-filter-shop');
    const searchTerm = (searchEl && searchEl.value || '').trim().toLowerCase();
    const filterShop = (filterEl && filterEl.value || '').trim();
    const groups = groupInventoryItems(items);
    const filtered = groups.filter(g => {
        const it = g.item;
        const matchText = !searchTerm ||
            (it.name || '').toLowerCase().includes(searchTerm) ||
            (getItemDesc(it) || '').toLowerCase().includes(searchTerm);
        const st = (it.shopTipo || '').toLowerCase();
        const matchShop = !filterShop ||
            (filterShop === 'dm' ? !st : st === filterShop);
        return matchText && matchShop;
    });
    const esc = s => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    let tableHtml = '';
    let cardsHtml = '';
    if (filtered.length === 0) {
        const msg = searchTerm || filterShop
            ? 'No hay items que coincidan con los filtros.'
            : 'Sin items';
        tableHtml = `<div class="inventory-desktop inventory-table-wrap"><table class="inventory-table"><thead><tr><th>Item</th><th>Tipo</th><th>Efecto</th><th>Precio</th><th>Rareza</th><th>Cantidad</th><th>Acciones</th></tr></thead><tbody><tr><td colspan="7" style="color:#8b7355;text-align:center;padding:20px;">${esc(msg)}</td></tr></tbody></table></div>`;
        cardsHtml = `<div class="inventory-cards-wrap"><div class="inventory-card" style="text-align:center;color:#8b7355;padding:24px;">${esc(msg)}</div></div>`;
    } else {
        const rows = filtered.map(g => {
            const it = g.item;
            const idxUse = g.indices[0];
            const idxStr = g.indices.join(',');
            const r = rarityColors[it.rarity] || '#555';
            const tipoLabel = getTipoLabel(it);
            const isMultiple = g.count > 1;
            const sellControl = isMultiple
                ? `<input type="number" min="1" max="${g.count}" value="1" class="inv-sell-qty" data-indices="${idxStr}" data-max="${g.count}" aria-label="Unidades a vender" title="Unidades a vender">`
                : '';
            const sellBtn = isMultiple
                ? `<button type="button" class="btn btn-secondary btn-small" onclick="playerSellItemStack('${idxStr}', this)" title="Vender las unidades indicadas (75% c/u)">Vender</button>`
                : `<button type="button" class="btn btn-secondary btn-small" onclick="playerSellItemStack('${idxStr}', this)" title="Vender (75% del valor)">Vender</button>`;
            return `<tr class="player-inventory-row">
                <td><span style="color:#d4c4a8; font-weight:600;">${esc(it.name || 'Item')}</span></td>
                <td><span class="inv-tipo">${esc(tipoLabel)}</span></td>
                <td><span style="color:#8b7355; font-size:0.9em;">${esc(it.effect || '—')}</span></td>
                <td><span style="color:#f1c40f;">${it.price != null ? esc(it.price + ' GP') : '—'}</span></td>
                <td><span class="rarity-badge" style="background:${r}; color:#fff;">${esc(it.rarity || 'común')}</span></td>
                <td class="inv-qty">${g.count}</td>
                <td class="inv-actions">
                    <button type="button" class="btn btn-small" onclick="playerUseItem(${idxUse})" title="Usar 1">Utilizar</button>
                    ${sellControl}
                    ${sellBtn}
                </td>
            </tr>`;
        }).join('');
        tableHtml = `<div class="inventory-desktop inventory-table-wrap"><table class="inventory-table"><thead><tr><th>Item</th><th>Tipo</th><th>Efecto</th><th>Precio</th><th>Rareza</th><th>Cantidad</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table></div>`;
        cardsHtml = filtered.map(g => {
            const it = g.item;
            const idxUse = g.indices[0];
            const idxStr = g.indices.join(',');
            const r = rarityColors[it.rarity] || '#555';
            const tipoLabel = getTipoLabel(it);
            const isMultiple = g.count > 1;
            const sellControl = isMultiple
                ? `<input type="number" min="1" max="${g.count}" value="1" class="inv-sell-qty" data-indices="${idxStr}" data-max="${g.count}" aria-label="Unidades a vender" title="Unidades a vender">`
                : '';
            const sellBtn = isMultiple
                ? `<button type="button" class="btn btn-secondary btn-small" onclick="playerSellItemStack('${idxStr}', this)" title="Vender las unidades indicadas (75% c/u)">Vender</button>`
                : `<button type="button" class="btn btn-secondary btn-small" onclick="playerSellItemStack('${idxStr}', this)" title="Vender (75% del valor)">Vender</button>`;
            return `<div class="inventory-card">
                <div class="inventory-card-header">
                    <span class="inventory-card-name">${esc(it.name || 'Item')}</span>
                    <span class="rarity-badge" style="background:${r};color:#fff;">${esc(it.rarity || 'común')}</span>
                </div>
                <div class="inventory-card-meta">
                    <span class="inv-tipo">${esc(tipoLabel)}</span>
                    <span style="color:#f1c40f;">${it.price != null ? esc(it.price + ' GP') : '—'}</span>
                    <span>× ${g.count}</span>
                </div>
                <div class="inventory-card-effect">${esc(it.effect || '—')}</div>
                <div class="inventory-card-actions">
                    <button type="button" class="btn btn-small" onclick="playerUseItem(${idxUse})" title="Usar 1">Utilizar</button>
                    ${sellControl}
                    ${sellBtn}
                </div>
            </div>`;
        }).join('');
        cardsHtml = `<div class="inventory-cards-wrap">${cardsHtml}</div>`;
    }
    list.innerHTML = tableHtml + cardsHtml;
}

async function playerUseItem(index) {
    const user = getCurrentUser();
    if (!user || !isPlayer() || index == null) return;
    try {
        const ref = db.collection('players').doc(user.id);
        const snap = await ref.get();
        if (!snap.exists) { showToast('Personaje no encontrado', true); return; }
        const data = snap.data();
        const inventario = (data.inventario || []).slice();
        if (index < 0 || index >= inventario.length) { showToast('Ítem no válido', true); return; }
        const item = inventario[index];
        inventario.splice(index, 1);
        await ref.update({ inventario });
        await db.collection('transactions').add({
            tipo: 'uso',
            itemName: item.name || 'Item',
            playerName: data.nombre || 'Desconocido',
            playerId: user.id,
            shopName: '—',
            precio: 0,
            fecha: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Item usado y eliminado del inventario');
    } catch (e) {
        showToast('Error: ' + e.message, true);
    }
}

async function playerSellItem(index) {
    const user = getCurrentUser();
    if (!user || !isPlayer() || index == null) return;
    try {
        const ref = db.collection('players').doc(user.id);
        const snap = await ref.get();
        if (!snap.exists) { showToast('Personaje no encontrado', true); return; }
        const data = snap.data();
        const inventario = (data.inventario || []).slice();
        if (index < 0 || index >= inventario.length) { showToast('Ítem no válido', true); return; }
        const item = inventario[index];
        const precioCompra = item.price || 0;
        const valorVenta = Math.floor(precioCompra * 0.75);
        const msg = '¿Vender «' + (item.name || 'Item') + '» por ' + valorVenta + ' GP? (75% del valor de compra)';
        if (!confirm(msg)) return;
        const nuevoOro = (data.oro != null ? data.oro : 0) + valorVenta;
        inventario.splice(index, 1);
        await ref.update({ oro: nuevoOro, inventario });
        await db.collection('transactions').add({
            tipo: 'venta',
            itemName: item.name || 'Item',
            playerName: data.nombre || 'Desconocido',
            playerId: user.id,
            shopName: 'Venta',
            precio: valorVenta,
            fecha: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Vendido por ' + valorVenta + ' GP');
    } catch (e) {
        showToast('Error: ' + e.message, true);
    }
}

async function playerSellItemStack(indicesStr, qtyOrButton) {
    const user = getCurrentUser();
    if (!user || !isPlayer() || !indicesStr) return;
    let indices = indicesStr.split(',').map(s => parseInt(s, 10)).filter(n => !isNaN(n));
    if (indices.length === 0) return;
    let qty = indices.length;
    if (typeof qtyOrButton === 'object' && qtyOrButton && qtyOrButton.nodeType === 1) {
        const cell = qtyOrButton.closest('td');
        const input = cell ? cell.querySelector('.inv-sell-qty') : null;
        if (input) {
            const max = parseInt(input.getAttribute('data-max'), 10) || indices.length;
            qty = Math.min(Math.max(1, parseInt(input.value, 10) || 1), max);
        }
        indices = indices.slice(0, qty);
    } else if (typeof qtyOrButton === 'number' && qtyOrButton > 0) {
        qty = Math.min(qtyOrButton, indices.length);
        indices = indices.slice(0, qty);
    }
    if (indices.length === 0) return;
    try {
        const ref = db.collection('players').doc(user.id);
        const snap = await ref.get();
        if (!snap.exists) { showToast('Personaje no encontrado', true); return; }
        const data = snap.data();
        const inventario = (data.inventario || []).slice();
        const set = new Set(indices);
        let totalVenta = 0;
        const firstName = (inventario[indices[0]] || {}).name || 'Item';
        indices.forEach(i => {
            if (i >= 0 && i < inventario.length) totalVenta += Math.floor((inventario[i].price || 0) * 0.75);
        });
        const label = indices.length > 1 ? indices.length + '× ' + firstName : firstName;
        const msg = '¿Vender ' + label + ' por ' + totalVenta + ' GP en total? (75% del valor de compra por unidad)';
        if (!confirm(msg)) return;
        const nuevoInv = inventario.filter((_, i) => !set.has(i));
        const nuevoOro = (data.oro != null ? data.oro : 0) + totalVenta;
        await ref.update({ oro: nuevoOro, inventario: nuevoInv });
        await db.collection('transactions').add({
            tipo: 'venta',
            itemName: indices.length > 1 ? indices.length + '× ' + firstName : firstName,
            playerName: data.nombre || 'Desconocido',
            playerId: user.id,
            shopName: 'Venta',
            precio: totalVenta,
            fecha: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Vendido por ' + totalVenta + ' GP');
    } catch (e) {
        showToast('Error: ' + e.message, true);
    }
}

function showPlayerView() {
    const user = getCurrentUser();
    if (!user || !isPlayer()) {
        showLoginModal();
        return;
    }
    document.getElementById('main-container').style.display = 'none';
    document.getElementById('player-view-container').style.display = 'block';
    document.getElementById('login-modal').classList.remove('active');
    loadMapImage();
    db.collection('players').doc(user.id).get().then(doc => {
        if (doc.exists) renderPlayerView(doc.data());
    });
    db.collection('players').doc(user.id).onSnapshot(doc => {
        if (doc.exists) renderPlayerView(doc.data());
    });
    if (!window._playerInventorySearchListeners) {
        window._playerInventorySearchListeners = true;
        const onInvFilter = () => { if (lastPlayerViewData) renderPlayerView(lastPlayerViewData); };
        const si = document.getElementById('player-inventory-search');
        const sf = document.getElementById('player-inventory-filter-shop');
        if (si) si.addEventListener('input', onInvFilter);
        if (sf) sf.addEventListener('change', onInvFilter);
    }
    loadPlayerWorld();
    // Cargar notificaciones y badge de correos sin leer
    setTimeout(() => {
        if (typeof loadPlayerNotifications === 'function') loadPlayerNotifications();
        if (typeof startUnreadMailBadge === 'function') startUnreadMailBadge();
    }, 500);
}

function loadPlayerWorld() {
    if (window._playerWorldSubscribed) return;
    window._playerWorldSubscribed = true;
    db.collection('cities').onSnapshot(snap => {
        playerCitiesData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderPlayerCities();
    });
    db.collection('shops').onSnapshot(snap => {
        playerShopsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderPlayerCities();
    });
    db.collection('npcs').onSnapshot(snap => {
        playerNpcsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderPlayerCities();
        const wrap = document.getElementById('player-directorio-wrap');
        if (playerDirectorioCityId && wrap && wrap.style.display !== 'none') {
            openPlayerCityShops(playerDirectorioCityId, playerDirectorioCityNombre);
        }
    });
}

function renderPlayerCities() {
    const el = document.getElementById('player-cities-container');
    if (!el) return;
    const visibleCities = playerCitiesData.filter(c => c.visibleToPlayers !== false);
    if (!visibleCities.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏘️</div><p>No hay ciudades visibles. El DM puede activarlas desde el dashboard.</p></div>';
        return;
    }
    el.innerHTML = visibleCities.map(city => {
        const shops = playerShopsData.filter(s => s.ciudadId === city.id);
        const npcs = playerNpcsData.filter(n => n.ciudadId === city.id);
        const cityId = city.id;
        const cityNombre = (city.nombre || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `
            <div class="card" id="player-city-card-${cityId}">
                ${city.imagenUrl ? `<div style="width:100%; height:200px; overflow:hidden; border-radius:8px 8px 0 0; background:#2a231c; display:flex; align-items:center; justify-content:center;"><img src="${city.imagenUrl.replace(/"/g, '&quot;')}" alt="${cityNombre}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'padding:40px; color:#8b7355;\\'>🖼️</div>';"></div>` : ''}
                <div class="card-header">
                    <h3 class="card-title">🏰 ${city.nombre || 'Sin nombre'}</h3>
                </div>
                <div class="card-body">
                    <p style="color:#8b7355; font-size:0.95em; margin-bottom:12px;">${city.descripcion || 'Sin descripción'}</p>
                    <p style="color:#a89878; font-size:0.9em; margin-bottom:12px;">🛒 ${shops.length} tienda${shops.length !== 1 ? 's' : ''} · 🎭 ${npcs.length} personaje${npcs.length !== 1 ? 's' : ''}</p>
                    <button class="btn" onclick="openPlayerCityShops('${cityId}', '${cityNombre}')">Ver directorio</button>
                </div>
            </div>`;
    }).join('');
}

let playerDirectorioCityId = null, playerDirectorioCityNombre = null;

function openPlayerCityShops(cityId, cityNombre) {
    const shops = playerShopsData.filter(s => s.ciudadId === cityId);
    const city = playerCitiesData.find(c => c.id === cityId);
    const recomendadoId = city && city.establecimientoRecomendadoId;
    playerDirectorioCityId = cityId;
    playerDirectorioCityNombre = cityNombre || 'esta ciudad';
    document.getElementById('player-cities-list-wrap').style.display = 'none';
    document.getElementById('player-directorio-habitantes-wrap').style.display = 'none';
    document.getElementById('player-directorio-wrap').style.display = 'block';
    document.getElementById('player-directorio-city-name').textContent = (cityNombre || 'Ciudad').toUpperCase();
    
    // Mostrar imagen de la ciudad si existe
    const imageContainer = document.getElementById('player-directorio-city-image-container');
    if (imageContainer && city && city.imagenUrl) {
        imageContainer.innerHTML = `<div style="width:100%; border-radius:8px; background:#2a231c; display:flex; align-items:center; justify-content:center; padding:10px;"><img src="${city.imagenUrl.replace(/"/g, '&quot;')}" alt="${(cityNombre || '').replace(/"/g, '&quot;')}" style="width:100%; height:auto; max-width:100%; border-radius:8px;" onerror="this.style.display='none'; this.parentElement.innerHTML='';"></div>`;
    } else if (imageContainer) {
        imageContainer.innerHTML = '';
    }
    
    // Cargar y configurar notas del jugador
    const notesInput = document.getElementById('player-directorio-city-notes-input');
    if (notesInput && currentUser && currentUser.type === 'player' && currentUser.id) {
        // Cargar notas existentes
        db.collection('cities').doc(cityId).collection('playerNotes').doc(currentUser.id).get()
            .then(doc => {
                if (doc.exists && doc.data().notes) {
                    notesInput.value = doc.data().notes;
                } else {
                    notesInput.value = '';
                }
            })
            .catch(err => console.error('Error cargando notas:', err));
        
        // Guardar notas automáticamente con debounce (remover listeners anteriores si existen)
        notesInput.removeEventListener('input', window._playerCityNotesHandler);
        window._playerCityNotesHandler = function() {
            clearTimeout(window._playerCityNotesSaveTimeout);
            window._playerCityNotesSaveTimeout = setTimeout(() => {
                const notes = notesInput.value.trim();
                db.collection('cities').doc(cityId).collection('playerNotes').doc(currentUser.id).set({
                    notes: notes,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true })
                .catch(err => console.error('Error guardando notas:', err));
            }, 1000);
        };
        notesInput.addEventListener('input', window._playerCityNotesHandler);
    }

    const tipoEmoji = { herreria: '⚔️', pociones: '🧪', taberna: '🍺', biblioteca: '📚', arqueria: '🏹', emporio: '🛒', batalla: '🥊', santuario: '🪞', banco: '🏦', posada: '🏨' };
    const tipoClass = { herreria: 'herreria', pociones: 'pociones', taberna: 'taberna', biblioteca: 'biblioteca', arqueria: 'arqueria', emporio: 'emporio', batalla: 'batalla', santuario: 'santuario', banco: 'banco', posada: 'posada' };

    const orderedShops = recomendadoId && shops.some(s => s.id === recomendadoId)
        ? [shops.find(s => s.id === recomendadoId), ...shops.filter(s => s.id !== recomendadoId)].filter(Boolean)
        : shops;

    const shopsGrid = document.getElementById('player-directorio-shops-grid');
    
    // Tarjeta "Mi Casa" para el aventurero
    const miCasaCard = currentUser && currentUser.type === 'player' ? `
        <div class="player-mistfall-shop-card player-mistfall-shop-habitantes" style="border:2px solid rgba(139,90,43,0.6);" onclick="openMiCasaModal()" role="button" tabindex="0">
            <span class="player-mistfall-shop-icon">🏠</span>
            <div class="player-mistfall-shop-info">
                <h3 class="player-mistfall-shop-name">Home</h3>
                <p class="player-mistfall-shop-desc">Tu fortaleza personal</p>
                <p class="player-mistfall-shop-enter">— Entrar a Home →</p>
            </div>
        </div>` : '';
    
    const shopCards = miCasaCard + orderedShops.map(s => {
        const t = (s.tipo || '').toLowerCase();
        const isRecomendado = s.id === recomendadoId;
        const cls = 'player-mistfall-shop-card player-mistfall-shop-' + (tipoClass[t] || '') + (isRecomendado ? ' player-mistfall-shop-recomendado' : '');
        const placa = isRecomendado ? '<div class="player-mistfall-recomendado-placa">Establecimiento recomendado</div>' : '';
        return `
        <div class="${cls}" onclick="openPlayerShop('${s.id}')" role="button" tabindex="0">
            ${placa}
            <span class="player-mistfall-shop-icon">${tipoEmoji[s.tipo] || '🏪'}</span>
            <div class="player-mistfall-shop-info">
                <h3 class="player-mistfall-shop-name">${s.nombre || 'Tienda'}</h3>
                <p class="player-mistfall-shop-desc">${s.tipo ? (s.tipo.charAt(0).toUpperCase() + s.tipo.slice(1)) : 'Establecimiento'}</p>
                <p class="player-mistfall-shop-enter">— Entrar al establecimiento →</p>
            </div>
        </div>`;
    }).join('');

    const habitantesCard = `
        <div class="player-mistfall-shop-card player-mistfall-shop-habitantes" onclick="openPlayerHabitantesModal(playerDirectorioCityId, playerDirectorioCityNombre)" role="button" tabindex="0">
            <span class="player-mistfall-shop-icon">🎭</span>
            <div class="player-mistfall-shop-info">
                <h3 class="player-mistfall-shop-name">Habitantes</h3>
                <p class="player-mistfall-shop-desc">Personajes de la ciudad</p>
                <p class="player-mistfall-shop-enter">— Ver habitantes →</p>
            </div>
        </div>`;

    shopsGrid.innerHTML = shopCards + habitantesCard;
}

function playerDirectorioVolver() {
    document.getElementById('player-directorio-wrap').style.display = 'none';
    document.getElementById('player-directorio-habitantes-wrap').style.display = 'none';
    document.getElementById('player-cities-list-wrap').style.display = 'block';
}

// Colores para las cards de NPCs (estilo medieval/fantástico oscuro)
const NPC_CARD_COLORS = [
    { bg: 'linear-gradient(135deg, rgba(42,35,28,0.95), rgba(30,25,20,0.98))', border: '#4a3c31' },
    { bg: 'linear-gradient(135deg, rgba(52,42,32,0.95), rgba(40,32,24,0.98))', border: '#5a4a3a' },
    { bg: 'linear-gradient(135deg, rgba(45,38,30,0.95), rgba(35,28,22,0.98))', border: '#4a3c31' },
    { bg: 'linear-gradient(135deg, rgba(38,32,26,0.95), rgba(28,24,18,0.98))', border: '#3a2e24' },
    { bg: 'linear-gradient(135deg, rgba(50,40,30,0.95), rgba(38,30,22,0.98))', border: '#5a4634' },
    { bg: 'linear-gradient(135deg, rgba(42,36,28,0.95), rgba(32,28,20,0.98))', border: '#4a3e30' },
    { bg: 'linear-gradient(135deg, rgba(46,38,30,0.95), rgba(36,30,22,0.98))', border: '#4a3c2e' },
    { bg: 'linear-gradient(135deg, rgba(40,34,28,0.95), rgba(30,26,20,0.98))', border: '#3a3028' }
];

function getNpcCardColor(index) {
    return NPC_CARD_COLORS[index % NPC_CARD_COLORS.length];
}

async function openPlayerHabitantesModal(cityId, cityNombre) {
    const user = getCurrentUser();
    if (!user || !user.id) return;
    
    const npcs = playerNpcsData.filter(n => n.ciudadId === cityId);
    document.getElementById('player-habitantes-modal-title').textContent = '🎭 Habitantes' + (cityNombre ? ' — ' + cityNombre : '');
    const list = document.getElementById('player-habitantes-modal-list');
    
    // Cargar notas del jugador
    let playerNpcNotes = {};
    try {
        const playerDoc = await db.collection('players').doc(user.id).get();
        if (playerDoc.exists) {
            playerNpcNotes = playerDoc.data().npcNotes || {};
        }
    } catch (e) {
        console.error('Error cargando notas:', e);
    }
    
    if (!npcs.length) {
        list.innerHTML = '<p style="color:#8b7355; text-align:center; padding:40px;">No hay habitantes registrados en esta ciudad.</p>';
    } else {
        list.innerHTML = npcs.map((n, idx) => {
            const color = getNpcCardColor(idx);
            const notes = playerNpcNotes[n.id] || '';
            return `
            <div class="player-mistfall-npc-card-colored" style="background: ${color.bg}; border-color: ${color.border};">
                <div class="player-mistfall-npc-info">
                    <h3 class="player-mistfall-npc-name">${n.nombre || 'NPC'}</h3>
                    <p class="player-mistfall-npc-rol">${n.rol || ''}</p>
                    <div class="player-mistfall-npc-notes-section" style="margin-top: 12px;">
                        <label style="color: #a89878; font-size: 0.85em; display: block; margin-bottom: 6px;">Mis notas:</label>
                        <textarea class="player-mistfall-npc-notes-input" data-npc-id="${n.id}" placeholder="Escribe tus notas sobre este NPC..." style="width: 100%; min-height: 60px; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #d4c4a8; font-family: inherit; font-size: 0.9em; resize: vertical;">${notes}</textarea>
                    </div>
                </div>
            </div>`;
        }).join('');
        
        // Agregar listeners para guardar notas automáticamente
        list.querySelectorAll('.player-mistfall-npc-notes-input').forEach(textarea => {
            let timeout;
            textarea.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    savePlayerNpcNote(textarea.dataset.npcId, textarea.value);
                }, 1000);
            });
        });
    }
    openModal('player-habitantes-modal');
}

async function savePlayerNpcNote(npcId, notes) {
    const user = getCurrentUser();
    if (!user || !user.id || !isPlayer()) return;
    
    try {
        const playerRef = db.collection('players').doc(user.id);
        const playerDoc = await playerRef.get();
        const currentData = playerDoc.exists ? playerDoc.data() : {};
        const npcNotes = currentData.npcNotes || {};
        npcNotes[npcId] = notes.trim();
        
        await playerRef.update({ npcNotes });
    } catch (e) {
        console.error('Error guardando nota:', e);
        showToast('Error al guardar nota', true);
    }
}

async function renderPlayerDirectorioHabitantes(cityId, cityNombre) {
    const user = getCurrentUser();
    if (!user || !user.id) return;
    
    const npcs = playerNpcsData.filter(n => n.ciudadId === cityId);
    document.getElementById('player-directorio-habitantes-city-name').textContent = (cityNombre || 'Ciudad').toUpperCase();
    const grid = document.getElementById('player-directorio-habitantes-npcs-grid');
    
    // Cargar notas del jugador
    let playerNpcNotes = {};
    try {
        const playerDoc = await db.collection('players').doc(user.id).get();
        if (playerDoc.exists) {
            playerNpcNotes = playerDoc.data().npcNotes || {};
        }
    } catch (e) {
        console.error('Error cargando notas:', e);
    }
    
    if (!npcs.length) {
        grid.innerHTML = '<p style="color:#8b7355; text-align:center; padding:40px; grid-column: 1 / -1;">No hay habitantes registrados en esta ciudad.</p>';
    } else {
        grid.innerHTML = npcs.map((n, idx) => {
            const color = getNpcCardColor(idx);
            const notes = playerNpcNotes[n.id] || '';
            return `
            <div class="player-mistfall-npc-card-colored" style="background: ${color.bg}; border-color: ${color.border};">
                <div class="player-mistfall-npc-info">
                    <h3 class="player-mistfall-npc-name">${n.nombre || 'NPC'}</h3>
                    <p class="player-mistfall-npc-rol">${n.rol || ''}</p>
                    <div class="player-mistfall-npc-notes-section">
                        <label style="color: #a89878; font-size: 0.85em; display: block; margin-bottom: 6px;">Mis notas:</label>
                        <textarea class="player-mistfall-npc-notes-input" data-npc-id="${n.id}" placeholder="Escribe tus notas sobre este NPC..." style="width: 100%; min-height: 60px; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #d4c4a8; font-family: inherit; font-size: 0.9em; resize: vertical;">${notes}</textarea>
                    </div>
                </div>
            </div>`;
        }).join('');
        
        // Agregar listeners para guardar notas automáticamente
        grid.querySelectorAll('.player-mistfall-npc-notes-input').forEach(textarea => {
            let timeout;
            textarea.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    savePlayerNpcNote(textarea.dataset.npcId, textarea.value);
                }, 1000);
            });
        });
    }
}

function playerDirectorioHabitantesVolver() {
    document.getElementById('player-directorio-habitantes-wrap').style.display = 'none';
    document.getElementById('player-directorio-wrap').style.display = 'block';
}

// ==================== SANTUARIO (todos son iguales; no se suben items) ====================
const SANCTUARY_STORAGE_KEY = 'shrineAttemptUsed';
const SANCTUARY_DEITIES = {
    tyr: { name: 'Tyr', reflections: ['La justicia no conoce piedad. ¿Estás dispuesto a pagar el precio?', 'El equilibrio exige sacrificio. ¿Qué ofreces a cambio de la verdad?', 'La ley es inmutable. Tu ofrenda será juzgada.', 'Solo los justos encuentran favor. El espejo ve tu alma.'], failures: ['Juicio pendiente: sientes el peso de una falta que no cometiste.', 'Balanza rota: tu próxima decisión moral será más difícil.', 'Cicatriz del justo: una marca de cadenas aparece en tu muñeca.', 'Veredicto sellado: alguien te juzgará injustamente pronto.', 'Ley olvidada: olvidas una regla importante en el peor momento.'] },
    tymora: { name: 'Tymora', reflections: ['¡La fortuna sonríe a los audaces! ¿O no?', 'Tira los dados, querido. El caos es la mejor diversión.', 'La suerte es una amante caprichosa. ¿Te atreves a cortejarla?', '¡Aventura! ¡Riesgo! ¡Gloria! ...o un desastre espectacular.'], failures: ['Mala racha: tu próximo 1 natural será un fracaso espectacular.', 'Moneda trucada: la próxima vez que apuestes, pierdes.', 'Tropiezo cómico: caes en el momento menos oportuno.', 'Suerte invertida: algo bueno se convierte en algo incómodo.', 'Caos menor: un objeto tuyo desaparece y aparece en otro lugar.'] },
    oghma: { name: 'Oghma', reflections: ['El conocimiento tiene un precio. ¿Qué secreto buscas?', 'En el reflejo yace la verdad... o su sombra.', 'Las respuestas existen. La pregunta es: ¿estás listo para ellas?', 'Todo lo escrito perdura. ¿Qué escribirás hoy?'], failures: ['Página en blanco: olvidas un dato importante temporalmente.', 'Tinta corrida: un mensaje que envíes será malinterpretado.', 'Secreto revelado: algo que ocultabas sale a la luz.', 'Conocimiento prohibido: aprendes algo que preferirías no saber.', 'Lengua trabada: no puedes explicar algo que sabes bien.'] },
    kelemvor: { name: 'Kelemvor', reflections: ['La muerte llega para todos. Hoy... quizás no.', 'El juicio final es inevitable. Esta moneda solo lo retrasa.', 'Ni clemencia ni crueldad. Solo el fin, cuando corresponda.', 'El umbral entre la vida y la muerte es delgado. Camínalo con cuidado.'], failures: ['Sombra del más allá: un espíritu te observa con interés.', 'Frío mortal: sientes un escalofrío que no se va por una hora.', 'Visión fúnebre: ves brevemente a alguien cercano como cadáver.', 'Deuda con la muerte: la próxima vez que caigas a 0 HP, fallas una tirada de muerte automáticamente.', 'Eco del vacío: escuchas el silencio absoluto por un instante aterrador.'] }
};
const SANCTUARY_FAIL_EFFECTS = ['Marca: un símbolo aparece en tu piel (narrativo).', 'Vela apagada: -1 a tu próxima interacción social.', 'Eco: escuchás tu voz diciendo algo que no dijiste.', 'Moneda doblada: perdés 1 oro extra.', 'Pista torcida: una frase suena cierta, pero puede ser falsa.', 'Silencio inquietante: no pasa nada… y eso es peor.', 'Sombra errante: tu sombra se mueve sola por un instante.', 'Escalofrío: sentís una mano helada en el hombro, pero no hay nadie.', 'Reflejo tardío: el espejo muestra tu imagen con un segundo de retraso.', 'Olor a ceniza: un aroma a quemado te persigue por una hora.'];
let playerSanctuaryShopId = null;

function getSanctuaryChance(gp) { if (gp >= 75) return 75; if (gp >= 50) return 50; return 30; }
function pickArr(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function openPlayerSanctuaryModal(shopId) {
    const shop = playerShopsData.find(s => s.id === shopId);
    if (!shop) return;
    playerSanctuaryShopId = shopId;
    document.getElementById('player-santuario-title').textContent = '🪞 ' + (shop.nombre || 'Santuario');
    document.getElementById('player-santuario-mirror-text').textContent = 'El espejo aguarda tu ofrenda...';
    document.getElementById('player-santuario-mirror-text').classList.remove('active');
    document.getElementById('player-santuario-results').style.display = 'none';
    document.getElementById('player-santuario-results').style.flexDirection = 'column';
    document.getElementById('player-santuario-dice').className = 'player-santuario-dice';
    document.getElementById('player-santuario-dice-face').textContent = '?';
    const locked = localStorage.getItem(SANCTUARY_STORAGE_KEY) === 'true';
    document.getElementById('player-santuario-offer-btn').disabled = locked;
    document.getElementById('player-santuario-locked').style.display = locked ? 'block' : 'none';
    const user = getCurrentUser();
    if (user && user.id) {
        db.collection('players').doc(user.id).get().then(doc => {
            const oro = (doc.exists && doc.data().oro != null) ? doc.data().oro : 0;
            document.getElementById('player-santuario-oro-display').textContent = oro.toLocaleString();
        });
    }
    const offerBtn = document.getElementById('player-santuario-offer-btn');
    offerBtn.onclick = performPlayerSanctuaryOffering;
    document.getElementById('player-santuario-reset-btn').onclick = resetPlayerSanctuarySession;
    openModal('player-santuario-modal');
}

function resetPlayerSanctuarySession() {
    localStorage.removeItem(SANCTUARY_STORAGE_KEY);
    document.getElementById('player-santuario-offer-btn').disabled = false;
    document.getElementById('player-santuario-locked').style.display = 'none';
    document.getElementById('player-santuario-results').style.display = 'none';
    document.getElementById('player-santuario-mirror-text').textContent = 'El espejo aguarda tu ofrenda...';
    document.getElementById('player-santuario-mirror-text').classList.remove('active');
    document.getElementById('player-santuario-dice').className = 'player-santuario-dice';
    document.getElementById('player-santuario-dice-face').textContent = '?';
    showToast('Sesión de santuario reiniciada. Puedes ofrecer de nuevo.');
}

async function performPlayerSanctuaryOffering() {
    if (localStorage.getItem(SANCTUARY_STORAGE_KEY) === 'true') return;
    const user = getCurrentUser();
    if (!user || !user.id || !isPlayer()) { showToast('Debes estar logueado como personaje', true); return; }
    const gp = parseInt(document.getElementById('player-santuario-donation').value, 10);
    const deityKey = document.getElementById('player-santuario-deity').value;
    const deityData = SANCTUARY_DEITIES[deityKey];
    if (!deityData) return;
    const doc = await db.collection('players').doc(user.id).get();
    if (!doc.exists) { showToast('No se encontró el personaje', true); return; }
    const data = doc.data();
    const oro = (data.oro != null ? data.oro : 0);
    if (oro < gp) { showToast('No tienes suficiente oro. Tienes ' + oro.toLocaleString() + ' GP.', true); return; }
    const chance = getSanctuaryChance(gp);
    const roll = Math.floor(Math.random() * 100) + 1;
    const success = roll <= chance;
    document.getElementById('player-santuario-offer-btn').disabled = true;
    const diceEl = document.getElementById('player-santuario-dice');
    const diceFace = document.getElementById('player-santuario-dice-face');
    diceEl.classList.add('rolling');
    diceFace.textContent = '?';
    const DICE_FACES = ['😰', '😟', '😐', '🙂', '😊', '😁'];
    let count = 0;
    const rollInterval = setInterval(() => { diceFace.textContent = pickArr(DICE_FACES); count++; }, 80);
    setTimeout(async () => {
        clearInterval(rollInterval);
        localStorage.setItem(SANCTUARY_STORAGE_KEY, 'true');
        diceFace.textContent = success ? '😊' : '😢';
        diceEl.classList.remove('rolling');
        diceEl.classList.add(success ? 'success' : 'fail');
        document.getElementById('player-santuario-mirror-text').textContent = pickArr(deityData.reflections);
        document.getElementById('player-santuario-mirror-text').classList.add('active');
        document.getElementById('player-santuario-res-donation').textContent = gp + ' GP';
        document.getElementById('player-santuario-res-roll').textContent = roll;
        const outcomeEl = document.getElementById('player-santuario-outcome');
        const effectEl = document.getElementById('player-santuario-effect');
        if (success) {
            outcomeEl.textContent = '✦ Moneda obtenida ✦';
            outcomeEl.style.background = 'rgba(74, 156, 93, 0.2)';
            outcomeEl.style.border = '1px solid #4a9c5d';
            outcomeEl.style.color = '#4a9c5d';
            effectEl.textContent = 'Obtienes una moneda de Héroe. Puedes usarla para repetir una tirada o estabilizarte si estás a 0 HP.';
        } else {
            outcomeEl.textContent = '✧ Fallo del espejo ✧';
            outcomeEl.style.background = 'rgba(156, 74, 74, 0.2)';
            outcomeEl.style.border = '1px solid #9c4a4a';
            outcomeEl.style.color = '#9c4a4a';
            effectEl.textContent = pickArr(deityData.failures);
        }
        document.getElementById('player-santuario-results').style.display = 'flex';
        document.getElementById('player-santuario-locked').style.display = 'block';
        const newOro = oro - gp;
        const inventario = Array.isArray(data.inventario) ? data.inventario.slice() : [];
        if (success) inventario.push({ name: 'Moneda de Héroe', effect: 'Puedes usarla para repetir una tirada o estabilizarte si estás a 0 HP.', rarity: 'legendaria', shopTipo: 'santuario' });
        await db.collection('players').doc(user.id).update({ oro: newOro, inventario });
        
        // Guardar transacción
        const shop = playerShopsData.find(s => s.id === playerSanctuaryShopId);
        const shopName = shop ? (shop.nombre || 'Santuario') : 'Santuario';
        const cityInfo = getCityInfoForShop(shop);
        await db.collection('transactions').add({
            tipo: 'compra',
            itemName: success ? 'Donación al Santuario (Moneda de Héroe obtenida)' : 'Donación al Santuario',
            playerId: user.id,
            playerName: user.nombre || 'Jugador',
            shopName: shopName,
            precio: gp,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            ...cityInfo
        });
        
        document.getElementById('player-santuario-oro-display').textContent = newOro.toLocaleString();
        showToast(success ? '✦ Moneda de Héroe obtenida' : 'Donación ofrecida. ' + (success ? '' : 'Fallo del espejo.'));
    }, 1500);
}

const BANCO_RETIRO_COMISION_PORCENTAJE = 2;

function openPlayerBancoModal(shopId) {
    const shop = playerShopsData.find(s => s.id === shopId);
    if (!shop) return;
    playerBancoShopId = shopId;
    document.getElementById('player-banco-title').textContent = '🏦 Banco';
    document.getElementById('player-banco-amount').value = '';
    const user = getCurrentUser();
    if (user && user.id) {
        db.collection('players').doc(user.id).get().then(doc => {
            const data = doc.exists ? doc.data() : {};
            const oro = (data.oro != null ? data.oro : 0);
            // Balance global del banco (mismo en todas las ciudades)
            const bal = (data.bancoBalance != null ? data.bancoBalance : 0);
            document.getElementById('player-banco-oro').textContent = oro.toLocaleString() + ' GP';
            document.getElementById('player-banco-balance').textContent = bal.toLocaleString() + ' GP';
        });
    }
    openModal('player-banco-modal');
}

async function doPlayerBancoDeposit() {
    const user = getCurrentUser();
    if (!user || !user.id || !isPlayer()) { showToast('Debes estar logueado como personaje', true); return; }
    const shopId = playerBancoShopId;
    if (!shopId) return;
    const amount = parseInt(document.getElementById('player-banco-amount').value, 10);
    if (!amount || amount < 1) { showToast('Indica una cantidad válida (≥ 1 GP)', true); return; }
    const docRef = db.collection('players').doc(user.id);
    const doc = await docRef.get();
    if (!doc.exists) { showToast('No se encontró el personaje', true); return; }
    const data = doc.data();
    const oro = (data.oro != null ? data.oro : 0);
    if (oro < amount) { showToast('No tienes suficiente oro. Tienes ' + oro.toLocaleString() + ' GP.', true); return; }
    // Balance global del banco (mismo en todas las ciudades)
    const bal = (data.bancoBalance != null ? data.bancoBalance : 0);
    const newOro = oro - amount;
    const newBal = bal + amount;
    await docRef.update({ oro: newOro, bancoBalance: newBal });
    await db.collection('transactions').add({
        tipo: 'deposito',
        itemName: 'Depósito en banco',
        playerId: user.id,
        playerName: user.nombre || 'Jugador',
        shopName: 'Banco',
        precio: amount,
        fecha: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('player-banco-oro').textContent = newOro.toLocaleString() + ' GP';
    document.getElementById('player-banco-balance').textContent = newBal.toLocaleString() + ' GP';
    document.getElementById('player-banco-amount').value = '';
    showToast('Depositados ' + amount.toLocaleString() + ' GP en el banco');
}

async function doPlayerBancoWithdraw() {
    const user = getCurrentUser();
    if (!user || !user.id || !isPlayer()) { showToast('Debes estar logueado como personaje', true); return; }
    const shopId = playerBancoShopId;
    if (!shopId) return;
    const amount = parseInt(document.getElementById('player-banco-amount').value, 10);
    if (!amount || amount < 1) { showToast('Indica una cantidad válida (≥ 1 GP)', true); return; }
    const fee = Math.ceil(amount * (BANCO_RETIRO_COMISION_PORCENTAJE / 100));
    const totalDeducir = amount + fee;
    const docRef = db.collection('players').doc(user.id);
    const doc = await docRef.get();
    if (!doc.exists) { showToast('No se encontró el personaje', true); return; }
    const data = doc.data();
    // Balance global del banco (mismo en todas las ciudades)
    const bal = (data.bancoBalance != null ? data.bancoBalance : 0);
    if (bal < totalDeducir) {
        showToast('Saldo insuficiente. Necesitas ' + totalDeducir.toLocaleString() + ' GP (incl. ' + fee + ' GP de comisión 2%). Tienes ' + bal.toLocaleString() + ' GP.', true);
        return;
    }
    const oro = (data.oro != null ? data.oro : 0);
    const newOro = oro + amount;
    const newBal = bal - totalDeducir;
    await docRef.update({ oro: newOro, bancoBalance: newBal });
    await db.collection('transactions').add({
        tipo: 'retiro',
        itemName: 'Retiro de banco',
        playerId: user.id,
        playerName: user.nombre || 'Jugador',
        shopName: 'Banco',
        precio: amount,
        comision: fee,
        fecha: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('player-banco-oro').textContent = newOro.toLocaleString() + ' GP';
    document.getElementById('player-banco-balance').textContent = newBal.toLocaleString() + ' GP';
    document.getElementById('player-banco-amount').value = '';
    showToast('Retirados ' + amount.toLocaleString() + ' GP (comisión ' + fee + ' GP).');
}

function openPlayerPosadaModal(shopId) {
    const shop = playerShopsData.find(s => s.id === shopId);
    if (!shop) return;
    playerPosadaShopId = shopId;
    playerPosadaCart = []; // Limpiar carrito al abrir
    document.getElementById('player-posada-title').textContent = '🏨 ' + (shop.nombre || 'Posada');
    const bodyEl = document.getElementById('player-posada-body');
    const recEl = document.getElementById('player-posada-receipt');
    const listEl = document.getElementById('player-posada-cuartos-list');
    if (!bodyEl || !recEl || !listEl) return;
    bodyEl.style.display = 'block';
    recEl.style.display = 'none';
    recEl.innerHTML = '';
    updatePosadaCart(); // Inicializar carrito
    const user = getCurrentUser();
    const renderOro = (oro) => {
        const el = document.getElementById('player-posada-oro');
        if (el) el.innerHTML = 'Tu oro: <strong>' + (oro != null ? oro : 0).toLocaleString() + '</strong> GP';
    };
    
    // Usar cuartos de la tienda si existen, sino usar los por defecto
    const cuartos = (shop.posadaCuartos && shop.posadaCuartos.length > 0) ? shop.posadaCuartos : POSADA_CUARTOS;
    
    listEl.innerHTML = cuartos.map((c, idx) => `
        <div class="player-posada-cuarto" data-room-id="${c.id || idx}" style="background:rgba(0,0,0,0.25); border:1px solid #4a3c31; border-radius:10px; padding:16px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
                <div style="flex:1; min-width:180px;">
                    <h4 style="color:#d4af37; font-family:'Cinzel',serif; margin-bottom:6px;">${c.nombre}</h4>
                    <p style="color:#8b7355; font-size:0.9em; line-height:1.4;">${c.efecto}</p>
                </div>
                <div style="flex-shrink:0; text-align:right;">
                    <div class="gold-value" style="margin-bottom:8px;">${c.precio} GP / noche</div>
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <label style="color:#8b7355; font-size:0.85em;">Noches:</label>
                        <input type="number" id="posada-nights-${c.id || idx}" min="1" value="1" style="width:60px; background:#1a1a1a; border:1px solid #4a3c31; color:#d4c4a8; padding:4px 8px; border-radius:4px; text-align:center;">
                    </div>
                    <button type="button" class="btn btn-small" onclick="addToPosadaCart('${c.id || idx}', '${(c.nombre || '').replace(/'/g, "\\'")}', ${c.precio}, '${(c.efecto || '').replace(/'/g, "\\'")}')">➕ Agregar al Carrito</button>
                </div>
            </div>
        </div>
    `).join('');
    if (user && user.id) {
        db.collection('players').doc(user.id).get().then(doc => {
            const oro = (doc.exists && doc.data().oro != null) ? doc.data().oro : 0;
            renderOro(oro);
        });
    } else {
        renderOro(0);
    }
    openModal('player-posada-modal');
}

window.addToPosadaCart = function(roomId, roomNombre, roomPrecio, roomEfecto) {
    const nightsInput = document.getElementById(`posada-nights-${roomId}`);
    const nights = parseInt(nightsInput ? nightsInput.value : 1) || 1;
    
    if (nights < 1) {
        showToast('Debes seleccionar al menos 1 noche', true);
        return;
    }
    
    // Buscar si ya existe en el carrito
    const existingIndex = playerPosadaCart.findIndex(item => item.roomId === roomId);
    
    if (existingIndex >= 0) {
        // Actualizar cantidad
        playerPosadaCart[existingIndex].nights = nights;
        showToast('Cantidad actualizada en el carrito');
    } else {
        // Agregar nuevo item
        playerPosadaCart.push({
            roomId: roomId,
            nombre: roomNombre,
            precio: roomPrecio,
            efecto: roomEfecto || '',
            nights: nights
        });
        showToast('Agregado al carrito');
    }
    
    updatePosadaCart();
}

window.removeFromPosadaCart = function(roomId) {
    playerPosadaCart = playerPosadaCart.filter(item => item.roomId !== roomId);
    updatePosadaCart();
    showToast('Eliminado del carrito');
}

window.clearPosadaCart = function() {
    playerPosadaCart = [];
    updatePosadaCart();
    showToast('Carrito vaciado');
}

function updatePosadaCart() {
    const cartEl = document.getElementById('player-posada-cart');
    const cartItemsEl = document.getElementById('player-posada-cart-items');
    const subtotalEl = document.getElementById('player-posada-cart-subtotal');
    const discountEl = document.getElementById('player-posada-cart-discount');
    const discountAmountEl = document.getElementById('player-posada-cart-discount-amount');
    const totalEl = document.getElementById('player-posada-cart-total');
    
    if (!cartEl || !cartItemsEl) return;
    
    if (playerPosadaCart.length === 0) {
        cartEl.style.display = 'none';
        return;
    }
    
    cartEl.style.display = 'block';
    
    // Calcular subtotal
    let subtotal = 0;
    const totalNights = playerPosadaCart.reduce((sum, item) => sum + item.nights, 0);
    
    cartItemsEl.innerHTML = playerPosadaCart.map(item => {
        const itemTotal = item.precio * item.nights;
        subtotal += itemTotal;
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #4a3c31;">
                <div style="flex:1;">
                    <div style="color:#d4c4a8; font-weight:bold;">${item.nombre}</div>
                    <div style="color:#8b7355; font-size:0.85em;">${item.nights} noche${item.nights !== 1 ? 's' : ''} × ${item.precio} GP</div>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <span class="gold-value">${itemTotal.toLocaleString()} GP</span>
                    <button class="btn btn-small btn-danger" onclick="removeFromPosadaCart('${item.roomId}')" style="padding:4px 8px; font-size:0.8em;">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Calcular descuento (25% si 3+ noches)
    let discount = 0;
    if (totalNights >= 3) {
        discount = subtotal * 0.25;
    }
    
    const total = subtotal - discount;
    
    subtotalEl.textContent = subtotal.toLocaleString() + ' GP';
    
    if (discount > 0) {
        discountEl.style.display = 'flex';
        discountAmountEl.textContent = '-' + discount.toLocaleString() + ' GP';
    } else {
        discountEl.style.display = 'none';
    }
    
    totalEl.textContent = total.toLocaleString() + ' GP';
}

function openPlayerBatallaModal(shopId) {
    const shop = playerShopsData.find(s => s.id === shopId);
    if (!shop) return;
    playerBatallaShopId = shopId;
    playerBatallaSelected = [];
    
    document.getElementById('player-batalla-title').textContent = '🥊 ' + (shop.nombre || 'Arena de Batalla');
    const bodyEl = document.getElementById('player-batalla-body');
    const recEl = document.getElementById('player-batalla-receipt');
    const npcsListEl = document.getElementById('player-batalla-npcs-list');
    const selectedEl = document.getElementById('player-batalla-selected');
    
    if (!bodyEl || !recEl || !npcsListEl || !selectedEl) return;
    
    bodyEl.style.display = 'block';
    recEl.style.display = 'none';
    recEl.innerHTML = '';
    selectedEl.style.display = 'none';
    
    const user = getCurrentUser();
    const renderOro = (oro) => {
        const el = document.getElementById('player-batalla-oro');
        if (el) el.innerHTML = 'Tu oro: <strong>' + (oro != null ? oro : 0).toLocaleString() + '</strong> GP';
    };
    
    // Solo usar oponentes configurados por el DM
    let oponentes = [];
    
    if (shop.batallaOponentes && Array.isArray(shop.batallaOponentes) && shop.batallaOponentes.length > 0) {
        // Usar oponentes configurados por el DM (sin precio individual)
        oponentes = shop.batallaOponentes.map((op, idx) => ({
            id: op.npcId || ('custom-' + idx),
            nombre: op.nombre,
            isCustom: op.isCustom || !op.npcId
        }));
    }
    
    // Si no hay oponentes configurados, mostrar mensaje
    if (oponentes.length === 0) {
        npcsListEl.innerHTML = '<div style="text-align:center; padding:40px; background:rgba(0,0,0,0.3); border-radius:8px; border:2px dashed #4a3c31;"><p style="color:#8b7355; font-size:1.1em; margin-bottom:8px;">🥊</p><p style="color:#8b7355; font-size:1em; margin-bottom:4px;">No hay oponentes disponibles</p><p style="color:#6b5d4a; font-size:0.9em; font-style:italic;">El DM debe configurar los oponentes de batalla desde el dashboard.</p></div>';
        if (user && user.id) {
            db.collection('players').doc(user.id).get().then(doc => {
                const oro = (doc.exists && doc.data().oro != null) ? doc.data().oro : 0;
                renderOro(oro);
            });
        } else {
            renderOro(0);
        }
        openModal('player-batalla-modal');
        return;
    }
    
    const precioFijo = (shop.batallaPrecioFijo != null ? shop.batallaPrecioFijo : 0);

    // Mostrar oponentes configurados
    npcsListEl.innerHTML = oponentes.map((op, idx) => {
        const opId = op.id || ('op-' + idx);
        const isSelected = playerBatallaSelected.some(s => s.opId === opId);
        return `
            <div class="player-batalla-npc-card" data-op-id="${opId}" style="background:rgba(0,0,0,0.25); border:2px solid ${isSelected ? '#8b5a2b' : '#4a3c31'}; border-radius:10px; padding:16px; cursor:pointer; transition:all 0.3s ease;" onclick="toggleBatallaOponente('${opId}', '${(op.nombre || '').replace(/'/g, "\\'")}')">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                    <div style="flex:1; min-width:180px;">
                        <h4 style="color:#d4af37; font-family:'Cinzel',serif; margin-bottom:6px;">${op.nombre || 'Sin nombre'}</h4>
                        <p style="color:#8b7355; font-size:0.9em; line-height:1.4;">${op.isCustom ? 'Bestia/Oponente' : 'NPC'}</p>
                    </div>
                    <div style="flex-shrink:0; text-align:right;">
                        <div class="gold-value" style="margin-bottom:8px;">${precioFijo > 0 ? (precioFijo.toLocaleString() + ' GP / combate') : 'Precio no configurado'}</div>
                        <div style="color:${isSelected ? '#d4af37' : '#8b7355'}; font-size:0.85em;">${isSelected ? '✓ Seleccionado' : 'Clic para seleccionar'}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    if (user && user.id) {
        db.collection('players').doc(user.id).get().then(doc => {
            const oro = (doc.exists && doc.data().oro != null) ? doc.data().oro : 0;
            renderOro(oro);
        });
    } else {
        renderOro(0);
    }
    
    updateBatallaSelected();
    openModal('player-batalla-modal');
}

function toggleBatallaOponente(opId, opNombre) {
    const index = playerBatallaSelected.findIndex(s => s.opId === opId);
    
    if (index >= 0) {
        // Deseleccionar
        playerBatallaSelected.splice(index, 1);
    } else {
        // Seleccionar
        playerBatallaSelected.push({
            opId: opId,
            nombre: opNombre,
            precio: 0
        });
    }
    
    updateBatallaSelected();
    // Actualizar visualmente la tarjeta
    const card = document.querySelector(`[data-op-id="${opId}"]`);
    if (card) {
        const isSelected = playerBatallaSelected.some(s => s.opId === opId);
        card.style.borderColor = isSelected ? '#8b5a2b' : '#4a3c31';
        const statusEl = card.querySelector('div[style*="text-align:right"] div:last-child');
        if (statusEl) {
            statusEl.textContent = isSelected ? '✓ Seleccionado' : 'Clic para seleccionar';
            statusEl.style.color = isSelected ? '#d4af37' : '#8b7355';
        }
    }
}

// Mantener compatibilidad con el nombre anterior
window.toggleBatallaNpc = toggleBatallaOponente;

function updateBatallaSelected() {
    const selectedEl = document.getElementById('player-batalla-selected');
    const selectedListEl = document.getElementById('player-batalla-selected-list');
    const totalEl = document.getElementById('player-batalla-total');
    
    if (!selectedEl || !selectedListEl || !totalEl) return;
    
    if (playerBatallaSelected.length === 0) {
        selectedEl.style.display = 'none';
        return;
    }
    
    selectedEl.style.display = 'block';
    
    const shop = playerShopsData.find(s => s.id === playerBatallaShopId);
    const precioFijo = shop && shop.batallaPrecioFijo != null ? shop.batallaPrecioFijo : 0;

    selectedListEl.innerHTML = playerBatallaSelected.map(item => {
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #4a3c31;">
                <div style="flex:1;">
                    <div style="color:#d4c4a8; font-weight:bold;">${item.nombre}</div>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <button class="btn btn-small btn-danger" onclick="toggleBatallaOponente('${item.opId || item.npcId}', '${(item.nombre || '').replace(/'/g, "\\'")}')" style="padding:4px 8px; font-size:0.8em;">✕</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Calcular total: precio fijo por cada oponente seleccionado
    const total = precioFijo > 0 ? precioFijo * playerBatallaSelected.length : 0;
    totalEl.textContent = total.toLocaleString() + ' GP';
}

async function processBatallaPayment() {
    const user = getCurrentUser();
    if (!user || !user.id || !isPlayer()) {
        showToast('Debes estar logueado como personaje', true);
        return;
    }
    
    if (playerBatallaSelected.length === 0) {
        showToast('Debes seleccionar al menos un oponente', true);
        return;
    }
    
    const shopId = playerBatallaShopId;
    if (!shopId) return;
    
    const shop = playerShopsData.find(s => s.id === shopId);
    const shopName = shop ? (shop.nombre || 'Arena de Batalla') : 'Arena de Batalla';
    
    // Calcular total: precio fijo por cada oponente seleccionado
    const precioFijo = (shop && shop.batallaPrecioFijo != null) ? shop.batallaPrecioFijo : 0;
    const total = precioFijo > 0 ? precioFijo * playerBatallaSelected.length : 0;

    if (total <= 0) {
        showToast('El DM aún no configuró el precio fijo del combate para esta tienda.', true);
        return;
    }
    
    // Verificar oro
    const docRef = db.collection('players').doc(user.id);
    const doc = await docRef.get();
    if (!doc.exists) {
        showToast('No se encontró el personaje', true);
        return;
    }
    
    const data = doc.data();
    const oro = (data.oro != null ? data.oro : 0);
    
    if (oro < total) {
        showToast('No tienes suficiente oro. Necesitas ' + total.toLocaleString() + ' GP. Tienes ' + oro.toLocaleString() + ' GP.', true);
        return;
    }
    
    // Procesar pago
    const newOro = oro - total;
    await docRef.update({ oro: newOro });
    
    // Crear transacción
    const items = playerBatallaSelected.map(item => ({
        name: 'Batalla vs ' + item.nombre,
        line: 'Incluido'
    }));
    
    const cityInfo = getCityInfoForShop(shop);
    await db.collection('transactions').add({
        tipo: 'batalla',
        itemName: 'Batalla contra ' + playerBatallaSelected.map(i => i.nombre).join(', '),
        playerId: user.id,
        playerName: user.nombre || 'Jugador',
        shopName,
        precio: total,
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
        ...cityInfo
    });
    
    // Mostrar recibo
    const bodyEl = document.getElementById('player-batalla-body');
    const recEl = document.getElementById('player-batalla-receipt');
    if (bodyEl) bodyEl.style.display = 'none';
    if (recEl) {
        recEl.innerHTML = buildShopReceiptHTML({
            shopName: shopName,
            logo: '🥊',
            subtitle: 'Recibo de batalla',
            items: items,
            totalLabel: 'TOTAL:',
            totalValue: total.toLocaleString() + ' GP',
            footerThanks: '¡Que la fortuna te acompañe en la batalla!',
            modalId: 'player-batalla-modal',
            primaryButton: {
                label: 'Ir a Battle Tracker',
                onclick: "window.open('battle-tracker.html','_blank')"
            }
        });
        recEl.style.display = 'block';
    }
    
    // Limpiar selección
    playerBatallaSelected = [];
    updateBatallaSelected();
    
    // Actualizar oro mostrado
    const renderOro = (oro) => {
        const el = document.getElementById('player-batalla-oro');
        if (el) el.innerHTML = 'Tu oro: <strong>' + (oro != null ? oro : 0).toLocaleString() + '</strong> GP';
    };
    renderOro(newOro);
    
    showToast('Has pagado ' + total.toLocaleString() + ' GP para la batalla. ¡Buena suerte!');
}

window.openPlayerBatallaModal = openPlayerBatallaModal;
// compatibilidad: antes se llamaba toggleBatallaNpc
window.toggleBatallaNpc = toggleBatallaOponente;
window.toggleBatallaOponente = toggleBatallaOponente;
window.processBatallaPayment = processBatallaPayment;

window.checkoutPosada = async function() {
    const user = getCurrentUser();
    if (!user || !user.id || !isPlayer()) {
        showToast('Debes estar logueado como personaje', true);
        return;
    }
    
    if (playerPosadaCart.length === 0) {
        showToast('El carrito está vacío', true);
        return;
    }
    
    const shopId = playerPosadaShopId;
    if (!shopId) return;
    
    const shop = playerShopsData.find(s => s.id === shopId);
    const shopName = shop ? (shop.nombre || 'Posada') : 'Posada';
    
    // Calcular total
    let subtotal = 0;
    const totalNights = playerPosadaCart.reduce((sum, item) => sum + item.nights, 0);
    playerPosadaCart.forEach(item => {
        subtotal += item.precio * item.nights;
    });
    
    let discount = 0;
    if (totalNights >= 3) {
        discount = subtotal * 0.25;
    }
    
    const total = subtotal - discount;
    
    // Verificar oro
    const docRef = db.collection('players').doc(user.id);
    const doc = await docRef.get();
    if (!doc.exists) {
        showToast('No se encontró el personaje', true);
        return;
    }
    
    const data = doc.data();
    const oro = (data.oro != null ? data.oro : 0);
    
    if (oro < total) {
        showToast('No tienes suficiente oro. Necesitas ' + total.toLocaleString() + ' GP. Tienes ' + oro.toLocaleString() + ' GP.', true);
        return;
    }
    
    // Procesar reservas
    const newOro = oro - total;
    await docRef.update({ oro: newOro });
    
    // Crear transacciones
    const items = [];
    for (const item of playerPosadaCart) {
        const itemTotal = item.precio * item.nights;
        items.push({
            name: item.nombre + (item.nights > 1 ? ` (${item.nights} noches)` : ''),
            line: itemTotal.toLocaleString() + ' GP'
        });
        
        // Crear transacción individual por cada noche
        const cityInfo = getCityInfoForShop(shop);
        for (let i = 0; i < item.nights; i++) {
            await db.collection('transactions').add({
                tipo: 'hospedaje',
                itemName: item.nombre,
                playerId: user.id,
                playerName: user.nombre || 'Jugador',
                shopName,
                precio: item.precio,
                fecha: firebase.firestore.FieldValue.serverTimestamp(),
                ...cityInfo
            });
        }
    }
    const itemsBoughtPosada = playerPosadaCart.map(item => ({
        item: { name: item.nombre, effect: item.efecto || '', price: item.precio },
        qty: item.nights || 1
    }));
    if (itemsBoughtPosada.length && typeof runAutomationRules === 'function') {
        await runAutomationRules(shopId, itemsBoughtPosada, user.id, user.nombre || 'Jugador');
    }
    
    // Agregar descuento si aplica
    if (discount > 0) {
        items.push({
            name: 'Descuento (25% por 3+ noches)',
            line: '-' + discount.toLocaleString() + ' GP'
        });
    }
    
    // Mostrar recibo
    const bodyEl = document.getElementById('player-posada-body');
    const recEl = document.getElementById('player-posada-receipt');
    if (bodyEl) bodyEl.style.display = 'none';
    if (recEl) {
        recEl.innerHTML = buildShopReceiptHTML({
            shopName: shopName,
            logo: '🏨',
            subtitle: 'Recibo de hospedaje',
            items: items,
            totalLabel: 'TOTAL:',
            totalValue: total.toLocaleString() + ' GP',
            footerThanks: '¡Descansa bien, aventurero!',
            modalId: 'player-posada-modal'
        });
        recEl.style.display = 'block';
    }
    
    // Limpiar carrito
    playerPosadaCart = [];
    updatePosadaCart();
    
    // Actualizar oro mostrado
    const renderOro = (oro) => {
        const el = document.getElementById('player-posada-oro');
        if (el) el.innerHTML = 'Tu oro: <strong>' + (oro != null ? oro : 0).toLocaleString() + '</strong> GP';
    };
    renderOro(newOro);
    
    showToast('Has reservado ' + totalNights + ' noche' + (totalNights !== 1 ? 's' : '') + ' por ' + total.toLocaleString() + ' GP.');
}

function openPlayerShop(shopId) {
    const shop = playerShopsData.find(s => s.id === shopId);
    if (!shop) return;
    const t = (shop.tipo || '').toLowerCase();
    if (t === 'pociones') {
        openPlayerPotionShop(shopId);
    } else if (t === 'taberna') {
        openPlayerTavernShop(shopId);
    } else if (t === 'santuario') {
        openPlayerSanctuaryModal(shopId);
    } else if (t === 'herreria') {
        openPlayerForgeModal(shopId);
    } else if (t === 'arqueria') {
        openPlayerArtesaniasModal(shopId);
    } else if (t === 'biblioteca') {
        openPlayerBibliotecaModal(shopId);
    } else if (t === 'emporio') {
        openPlayerEmporioModal(shopId);
    } else if (t === 'banco') {
        openPlayerBancoModal(shopId);
    } else if (t === 'posada') {
        openPlayerPosadaModal(shopId);
    } else if (t === 'batalla') {
        openPlayerBatallaModal(shopId);
    } else {
        openPlayerShopCatalog(shopId);
    }
}

// ==================== ARTESANÍAS (estilo Klicklac: Flechas, Ropa, Servicios) ====================
const ARTESANIAS_TYPE_LABELS = { common: 'Común', magic: 'Mágico ✨', elemental: 'Elemental 🔮', gear: 'Equipo', service: 'Servicio' };

function openPlayerArtesaniasModal(shopId) {
    const shop = playerShopsData.find(s => s.id === shopId);
    if (!shop) return;
    playerArtesaniasShopId = shopId;
    playerArtesaniasCart = [];
    playerArtesaniasTab = 'flechas';
    const bodyEl = document.getElementById('player-artesanias-body');
    const recEl = document.getElementById('player-artesanias-receipt');
    if (bodyEl) bodyEl.style.display = 'block';
    if (recEl) { recEl.style.display = 'none'; recEl.innerHTML = ''; }
    document.getElementById('player-artesanias-title').textContent = '🏹 ' + (shop.nombre || 'Artesanías');
    document.querySelectorAll('.player-artesanias-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === 'flechas');
        b.classList.toggle('btn-secondary', b.dataset.tab !== 'flechas');
    });
    document.getElementById('player-artesanias-flechas-grid').style.display = 'block';
    document.getElementById('player-artesanias-ropa-grid').style.display = 'none';
    document.getElementById('player-artesanias-servicios-grid').style.display = 'none';
    const user = getCurrentUser();
    if (user && user.id) {
        db.collection('players').doc(user.id).get().then(doc => {
            const oro = (doc.exists && doc.data().oro != null) ? doc.data().oro : 0;
            document.getElementById('player-artesanias-oro-display').textContent = oro.toLocaleString();
        });
    }
    renderPlayerArtesaniasGrids();
    renderPlayerArtesaniasCart();
    if (!window._playerArtesaniasListeners) {
        window._playerArtesaniasListeners = true;
        document.querySelectorAll('.player-artesanias-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                playerArtesaniasTab = btn.dataset.tab;
                document.querySelectorAll('.player-artesanias-tab').forEach(b => { b.classList.toggle('active', b.dataset.tab === playerArtesaniasTab); b.classList.toggle('btn-secondary', b.dataset.tab !== playerArtesaniasTab); });
                document.getElementById('player-artesanias-flechas-grid').style.display = playerArtesaniasTab === 'flechas' ? 'block' : 'none';
                document.getElementById('player-artesanias-ropa-grid').style.display = playerArtesaniasTab === 'ropa' ? 'block' : 'none';
                document.getElementById('player-artesanias-servicios-grid').style.display = playerArtesaniasTab === 'servicios' ? 'block' : 'none';
            });
        });
    }
    openModal('player-artesanias-modal');
}

function renderPlayerArtesaniasGrids() {
    const shop = playerShopsData.find(s => s.id === playerArtesaniasShopId);
    if (!shop) return;
    const inv = shop.inventario || [];
    const flechas = inv.filter(it => (it.tab || 'flechas').toLowerCase() === 'flechas');
    const ropa = inv.filter(it => (it.tab || '').toLowerCase() === 'ropa');
    const servicios = inv.filter(it => (it.tab || '').toLowerCase() === 'servicios');
    const typeLabel = (t) => ARTESANIAS_TYPE_LABELS[(t || 'common').toLowerCase()] || t || 'Común';
    const renderCard = (it, invIdx) => {
        const t = (it.type || 'common').toLowerCase();
        const desc = getItemDesc(it) || '—';
        return `<div class="player-artesanias-card player-artesanias-${t}">
            <div class="player-artesanias-card-name">${it.name || 'Item'}</div>
            <span class="player-artesanias-type">${typeLabel(it.type)}</span>
            <div class="player-artesanias-effect-box"><span>✨</span><span>${desc}</span></div>
            <div class="player-artesanias-footer"><span class="player-artesanias-price">${(it.price||0).toLocaleString()} GP</span>
            <button type="button" class="btn btn-small player-artesanias-add-btn" onclick="playerArtesaniasAddToCart(${invIdx})">+ Añadir</button></div>
        </div>`;
    };
    document.getElementById('player-artesanias-flechas-grid').innerHTML = flechas.length ? '<div class="player-artesanias-cat-title">🏹 Flechas</div>' + flechas.map(it => renderCard(it, inv.indexOf(it))).join('') : '<p class="player-artesanias-no-results">No hay flechas en esta tienda</p>';
    document.getElementById('player-artesanias-ropa-grid').innerHTML = ropa.length ? '<div class="player-artesanias-cat-title">👕 Ropa y Equipo</div>' + ropa.map(it => renderCard(it, inv.indexOf(it))).join('') : '<p class="player-artesanias-no-results">No hay ropa ni equipo</p>';
    document.getElementById('player-artesanias-servicios-grid').innerHTML = servicios.length ? '<div class="player-artesanias-cat-title">🔧 Servicios</div>' + servicios.map(it => renderCard(it, inv.indexOf(it))).join('') : '<p class="player-artesanias-no-results">No hay servicios</p>';
}

function playerArtesaniasAddToCart(inventarioIndex) {
    const shop = playerShopsData.find(s => s.id === playerArtesaniasShopId);
    if (!shop || !shop.inventario || inventarioIndex < 0 || inventarioIndex >= shop.inventario.length) return;
    const it = shop.inventario[inventarioIndex];
    const entry = playerArtesaniasCart.find(e => e.inventarioIndex === inventarioIndex);
    if (entry) entry.qty++;
    else playerArtesaniasCart.push({ inventarioIndex, qty: 1, name: it.name, price: it.price || 0 });
    renderPlayerArtesaniasCart();
}

function playerArtesaniasUpdateQty(inventarioIndex, delta) {
    const entry = playerArtesaniasCart.find(e => e.inventarioIndex === inventarioIndex);
    if (!entry) return;
    entry.qty += delta;
    if (entry.qty <= 0) playerArtesaniasCart = playerArtesaniasCart.filter(e => e.inventarioIndex !== inventarioIndex);
    renderPlayerArtesaniasCart();
}

function renderPlayerArtesaniasCart() {
    const el = document.getElementById('player-artesanias-cart-items');
    const totEl = document.getElementById('player-artesanias-cart-total');
    if (!el) return;
    if (!playerArtesaniasCart.length) {
        el.innerHTML = '<div style="text-align:center; color:#81c784; padding:24px;">🏹 ¿Qué necesitas?</div>';
        if (totEl) totEl.innerHTML = '';
        return;
    }
    const shop = playerShopsData.find(s => s.id === playerArtesaniasShopId);
    const inventario = shop && shop.inventario ? shop.inventario : [];
    el.innerHTML = playerArtesaniasCart.map(e => {
        const it = inventario[e.inventarioIndex];
        const price = it ? (it.price || 0) : e.price;
        return `<div class="player-artesanias-cart-item">
            <div><div class="player-artesanias-cart-name">${e.name}</div><div class="player-artesanias-cart-price">${price} GP c/u</div></div>
            <div style="display:flex; align-items:center; gap:8px;">
                <button type="button" class="btn btn-small" style="width:28px; height:28px; padding:0;" onclick="playerArtesaniasUpdateQty(${e.inventarioIndex}, -1)">−</button>
                <span>${e.qty}</span>
                <button type="button" class="btn btn-small" style="width:28px; height:28px; padding:0;" onclick="playerArtesaniasUpdateQty(${e.inventarioIndex}, 1)">+</button>
            </div>
        </div>`;
    }).join('');
    const total = playerArtesaniasCart.reduce((sum, e) => sum + ((inventario[e.inventarioIndex] ? inventario[e.inventarioIndex].price : e.price) || 0) * e.qty, 0);
    totEl.innerHTML = '<div style="margin-top:16px; padding-top:12px; border-top:2px solid #4a7c4a;"><div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:1.2em;"><span style="color:#81c784;">Total:</span><span style="color:#aed581; font-weight:bold;">' + total.toLocaleString() + ' GP</span></div><button type="button" class="btn" style="width:100%; margin-top:12px; background:linear-gradient(135deg,#7cb342,#558b2f); color:#fff;" onclick="playerArtesaniasCheckout()">🏹 Confirmar Pedido</button></div>';
}

async function playerArtesaniasCheckout() {
    const user = getCurrentUser();
    if (!user || !user.id || !isPlayer()) { showToast('Debes estar logueado como personaje', true); return; }
    const shop = playerShopsData.find(s => s.id === playerArtesaniasShopId);
    if (!shop || !playerArtesaniasCart.length) { showToast('Carrito vacío', true); return; }
    const inventario = shop.inventario || [];
    const total = playerArtesaniasCart.reduce((sum, e) => sum + (inventario[e.inventarioIndex] ? (inventario[e.inventarioIndex].price || 0) : 0) * e.qty, 0);
    const doc = await db.collection('players').doc(user.id).get();
    if (!doc.exists) { showToast('No se encontró el personaje', true); return; }
    const data = doc.data();
    const oro = (data.oro != null ? data.oro : 0);
    if (oro < total) { showToast('No tienes suficiente oro. Tienes ' + oro.toLocaleString() + ' GP.', true); return; }
    const newOro = oro - total;
    const receiptItems = playerArtesaniasCart.map(e => {
        const it = inventario[e.inventarioIndex];
        const name = it ? (it.name || 'Item') : 'Item';
        const price = it ? (it.price != null ? it.price : 0) : 0;
        const qty = e.qty || 1;
        const line = qty > 1 ? (price * qty) + ' GP (' + qty + ' × ' + price + ')' : price + ' GP';
        return { name, line };
    });
    const playerInv = Array.isArray(data.inventario) ? data.inventario.slice() : [];
    playerArtesaniasCart.forEach(e => {
        const it = inventario[e.inventarioIndex];
        if (!it) return;
        const entry = { name: it.name, price: it.price, effect: it.effect || it.desc || '', rarity: 'común' };
        if (it.type) entry.type = it.type;
        if (it.tab) entry.tab = it.tab;
        entry.shopTipo = (shop.tipo || 'arqueria').toString().toLowerCase();
        for (let q = 0; q < e.qty; q++) playerInv.push(entry);
    });
    await db.collection('players').doc(user.id).update({ oro: newOro, inventario: playerInv });
    
    // Guardar transacción para cada item comprado
    for (const e of playerArtesaniasCart) {
        const it = inventario[e.inventarioIndex];
        if (!it) continue;
        const itemName = it.name || 'Item';
        const itemPrice = (it.price != null ? it.price : 0) * (e.qty || 1);
        const cityInfo = getCityInfoForShop(shop);
        await db.collection('transactions').add({
            tipo: 'compra',
            itemName: (e.qty > 1 ? e.qty + '× ' : '') + itemName,
            playerId: user.id,
            playerName: user.nombre || 'Jugador',
            shopName: shop.nombre || 'Artesanías',
            precio: itemPrice,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            ...cityInfo
        });
    }
    const itemsBoughtArte = playerArtesaniasCart.map(e => {
        const it = inventario[e.inventarioIndex];
        return it ? { item: { name: it.name, effect: it.effect || it.desc, price: it.price }, qty: e.qty || 1 } : null;
    }).filter(Boolean);
    if (itemsBoughtArte.length && typeof runAutomationRules === 'function') {
        await runAutomationRules(playerArtesaniasShopId, itemsBoughtArte, user.id, user.nombre || 'Jugador');
    }
    playerArtesaniasCart = [];
    renderPlayerArtesaniasCart();
    document.getElementById('player-artesanias-oro-display').textContent = newOro.toLocaleString();
    const bodyEl = document.getElementById('player-artesanias-body');
    const recEl = document.getElementById('player-artesanias-receipt');
    if (bodyEl) bodyEl.style.display = 'none';
    if (recEl) {
        recEl.innerHTML = buildShopReceiptHTML({
            shopName: shop.nombre || 'Artesanías',
            logo: '🏹',
            subtitle: 'Recibo de pedido',
            items: receiptItems,
            totalLabel: 'TOTAL:',
            totalValue: total.toLocaleString() + ' GP',
            footerThanks: 'Buena caza. — Artesanías.',
            modalId: 'player-artesanias-modal'
        });
        recEl.style.display = 'block';
    }
    showToast('Pedido confirmado. ' + total.toLocaleString() + ' GP descontados.');
}

// ==================== EMPORIO (materiales hechizos, objetos raros/importados, mapas, otros) ====================
const EMPORIO_SECTIONS = ['materiales', 'raros', 'mapas', 'otros'];
const EMPORIO_SECTION_LABELS = { materiales: '🧪 Materiales para hechizos', raros: '💎 Objetos raros e importados', mapas: '🗺️ Mapas', otros: '📦 Otros' };

function openPlayerEmporioModal(shopId) {
    const shop = playerShopsData.find(s => s.id === shopId);
    if (!shop) return;
    playerEmporioShopId = shopId;
    playerEmporioCart = [];
    playerEmporioTab = 'materiales';
    const bodyEl = document.getElementById('player-emporio-body');
    const recEl = document.getElementById('player-emporio-receipt');
    if (bodyEl) bodyEl.style.display = 'block';
    if (recEl) { recEl.style.display = 'none'; recEl.innerHTML = ''; }
    document.getElementById('player-emporio-title').textContent = '🛒 ' + (shop.nombre || 'Emporio');
    document.querySelectorAll('.player-emporio-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.section === 'materiales');
        b.classList.toggle('btn-secondary', b.dataset.section !== 'materiales');
    });
    ['materiales', 'raros', 'mapas', 'otros'].forEach(sec => {
        const grid = document.getElementById('player-emporio-grid-' + sec);
        if (grid) grid.style.display = sec === 'materiales' ? 'block' : 'none';
    });
    const user = getCurrentUser();
    if (user && user.id) {
        db.collection('players').doc(user.id).get().then(doc => {
            const oro = (doc.exists && doc.data().oro != null) ? doc.data().oro : 0;
            document.getElementById('player-emporio-oro-display').textContent = oro.toLocaleString();
        });
    }
    renderPlayerEmporioGrids();
    renderPlayerEmporioCart();
    if (!window._playerEmporioListeners) {
        window._playerEmporioListeners = true;
        document.querySelectorAll('.player-emporio-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                playerEmporioTab = btn.dataset.section;
                document.querySelectorAll('.player-emporio-tab').forEach(b => { b.classList.toggle('active', b.dataset.section === playerEmporioTab); b.classList.toggle('btn-secondary', b.dataset.section !== playerEmporioTab); });
                ['materiales', 'raros', 'mapas', 'otros'].forEach(sec => {
                    const grid = document.getElementById('player-emporio-grid-' + sec);
                    if (grid) grid.style.display = sec === playerEmporioTab ? 'block' : 'none';
                });
            });
        });
    }
    openModal('player-emporio-modal');
}

function renderPlayerEmporioGrids() {
    const shop = playerShopsData.find(s => s.id === playerEmporioShopId);
    if (!shop) return;
    const inv = shop.inventario || [];
    const sectionItems = (sec) => inv.filter(it => (it.section || 'otros').toLowerCase() === sec);
    const renderCard = (it, invIdx) => {
        const desc = getItemDesc(it) || '—';
        const rarity = (it.rarity || 'común').toLowerCase();
        const rarityColors = { común: '#2ecc71', infrecuente: '#3498db', rara: '#9b59b6', legendaria: '#e74c3c' };
        return `<div class="player-emporio-card">
            <div class="player-emporio-card-name">${it.name || 'Item'}</div>
            ${rarity ? `<span class="player-emporio-rarity" style="background:${rarityColors[rarity] || '#888'}; padding:2px 8px; border-radius:10px; font-size:0.75em;">${rarity}</span>` : ''}
            <div class="player-emporio-effect-box"><span>✨</span><span>${desc}</span></div>
            <div class="player-emporio-footer"><span class="player-emporio-price">${(it.price || 0).toLocaleString()} GP</span>
            <button type="button" class="btn btn-small player-emporio-add-btn" onclick="playerEmporioAddToCart(${invIdx})">+ Añadir</button></div>
        </div>`;
    };
    EMPORIO_SECTIONS.forEach(sec => {
        const grid = document.getElementById('player-emporio-grid-' + sec);
        if (!grid) return;
        const items = sectionItems(sec);
        const title = EMPORIO_SECTION_LABELS[sec] || sec;
        grid.innerHTML = items.length ? '<div class="player-emporio-cat-title">' + title + '</div>' + items.map(it => renderCard(it, inv.indexOf(it))).join('') : '<p class="player-emporio-no-results">No hay items en esta sección</p>';
    });
}

function playerEmporioAddToCart(inventarioIndex) {
    const shop = playerShopsData.find(s => s.id === playerEmporioShopId);
    if (!shop || !shop.inventario || inventarioIndex < 0 || inventarioIndex >= shop.inventario.length) return;
    const it = shop.inventario[inventarioIndex];
    const entry = playerEmporioCart.find(e => e.inventarioIndex === inventarioIndex);
    if (entry) entry.qty++;
    else playerEmporioCart.push({ inventarioIndex, qty: 1, name: it.name, price: it.price || 0 });
    renderPlayerEmporioCart();
}

function playerEmporioUpdateQty(inventarioIndex, delta) {
    const entry = playerEmporioCart.find(e => e.inventarioIndex === inventarioIndex);
    if (!entry) return;
    entry.qty += delta;
    if (entry.qty <= 0) playerEmporioCart = playerEmporioCart.filter(e => e.inventarioIndex !== inventarioIndex);
    renderPlayerEmporioCart();
}

function renderPlayerEmporioCart() {
    const el = document.getElementById('player-emporio-cart-items');
    const totEl = document.getElementById('player-emporio-cart-total');
    if (!el) return;
    if (!playerEmporioCart.length) {
        el.innerHTML = '<div style="text-align:center; color:#8a9aa8; padding:24px;">🛒 ¿Qué te interesa?</div>';
        if (totEl) totEl.innerHTML = '';
        return;
    }
    const shop = playerShopsData.find(s => s.id === playerEmporioShopId);
    const inventario = shop && shop.inventario ? shop.inventario : [];
    el.innerHTML = playerEmporioCart.map(e => {
        const it = inventario[e.inventarioIndex];
        const price = it ? (it.price || 0) : e.price;
        return `<div class="player-emporio-cart-item">
            <div><div class="player-emporio-cart-name">${e.name}</div><div class="player-emporio-cart-price">${price} GP c/u</div></div>
            <div style="display:flex; align-items:center; gap:8px;">
                <button type="button" class="btn btn-small" style="width:28px; height:28px; padding:0;" onclick="playerEmporioUpdateQty(${e.inventarioIndex}, -1)">−</button>
                <span>${e.qty}</span>
                <button type="button" class="btn btn-small" style="width:28px; height:28px; padding:0;" onclick="playerEmporioUpdateQty(${e.inventarioIndex}, 1)">+</button>
            </div>
        </div>`;
    }).join('');
    const total = playerEmporioCart.reduce((sum, e) => sum + ((inventario[e.inventarioIndex] ? inventario[e.inventarioIndex].price : e.price) || 0) * e.qty, 0);
    totEl.innerHTML = '<div style="margin-top:16px; padding-top:12px; border-top:2px solid #6a7a8a;"><div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:1.2em;"><span style="color:#9ca8b8;">Total:</span><span style="color:#b8c8d8; font-weight:bold;">' + total.toLocaleString() + ' GP</span></div><button type="button" class="btn" style="width:100%; margin-top:12px; background:linear-gradient(135deg,#6a7a8a,#4a5a6a); color:#e8eef4;" onclick="playerEmporioCheckout()">🛒 Confirmar compra</button></div>';
}

async function playerEmporioCheckout() {
    const user = getCurrentUser();
    if (!user || !user.id || !isPlayer()) { showToast('Debes estar logueado como personaje', true); return; }
    const shop = playerShopsData.find(s => s.id === playerEmporioShopId);
    if (!shop || !playerEmporioCart.length) { showToast('Carrito vacío', true); return; }
    const inventario = shop.inventario || [];
    const total = playerEmporioCart.reduce((sum, e) => sum + (inventario[e.inventarioIndex] ? (inventario[e.inventarioIndex].price || 0) : 0) * e.qty, 0);
    const doc = await db.collection('players').doc(user.id).get();
    if (!doc.exists) { showToast('No se encontró el personaje', true); return; }
    const data = doc.data();
    const oro = (data.oro != null ? data.oro : 0);
    if (oro < total) { showToast('No tienes suficiente oro. Tienes ' + oro.toLocaleString() + ' GP.', true); return; }
    const newOro = oro - total;
    const receiptItems = playerEmporioCart.map(e => {
        const it = inventario[e.inventarioIndex];
        const name = it ? (it.name || 'Item') : 'Item';
        const price = it ? (it.price != null ? it.price : 0) : 0;
        const qty = e.qty || 1;
        const line = qty > 1 ? (price * qty) + ' GP (' + qty + ' × ' + price + ')' : price + ' GP';
        return { name, line };
    });
    const playerInv = Array.isArray(data.inventario) ? data.inventario.slice() : [];
    playerEmporioCart.forEach(e => {
        const it = inventario[e.inventarioIndex];
        if (!it) return;
        const entry = { name: it.name, price: it.price, effect: it.effect || it.desc || '', rarity: (it.rarity || 'común') };
        if (it.section) entry.section = it.section;
        entry.shopTipo = (shop.tipo || 'emporio').toString().toLowerCase();
        for (let q = 0; q < e.qty; q++) playerInv.push(entry);
    });
    await db.collection('players').doc(user.id).update({ oro: newOro, inventario: playerInv });
    
    // Guardar transacción para cada item comprado
    for (const e of playerEmporioCart) {
        const it = inventario[e.inventarioIndex];
        if (!it) continue;
        const itemName = it.name || 'Item';
        const itemPrice = (it.price != null ? it.price : 0) * (e.qty || 1);
        const cityInfo = getCityInfoForShop(shop);
        await db.collection('transactions').add({
            tipo: 'compra',
            itemName: (e.qty > 1 ? e.qty + '× ' : '') + itemName,
            playerId: user.id,
            playerName: user.nombre || 'Jugador',
            shopName: shop.nombre || 'Emporio',
            precio: itemPrice,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            ...cityInfo
        });
    }
    const itemsBoughtEmporio = playerEmporioCart.map(e => {
        const it = inventario[e.inventarioIndex];
        return it ? { item: { name: it.name, effect: it.effect || it.desc, price: it.price }, qty: e.qty || 1 } : null;
    }).filter(Boolean);
    if (itemsBoughtEmporio.length && typeof runAutomationRules === 'function') {
        await runAutomationRules(playerEmporioShopId, itemsBoughtEmporio, user.id, user.nombre || 'Jugador');
    }
    playerEmporioCart = [];
    renderPlayerEmporioCart();
    document.getElementById('player-emporio-oro-display').textContent = newOro.toLocaleString();
    const bodyEl = document.getElementById('player-emporio-body');
    const recEl = document.getElementById('player-emporio-receipt');
    if (bodyEl) bodyEl.style.display = 'none';
    if (recEl) {
        recEl.innerHTML = buildShopReceiptHTML({
            shopName: shop.nombre || 'Emporio',
            logo: '🛒',
            subtitle: 'Recibo de compra',
            items: receiptItems,
            totalLabel: 'TOTAL:',
            totalValue: total.toLocaleString() + ' GP',
            footerThanks: 'Gracias por tu compra. Que encuentres lo que buscas.',
            modalId: 'player-emporio-modal'
        });
        recEl.style.display = 'block';
    }
    showToast('Compra confirmada. ' + total.toLocaleString() + ' GP descontados.');
}

// ==================== BIBLIOTECA (tabs por sección, carrito, recibo, inventario) ====================
const BIBLIOTECA_SECTIONS = ['magia', 'fabricacion', 'cocina', 'trampas', 'alquimia', 'mapas', 'restringida'];
const BIBLIOTECA_SECTION_LABELS = { magia: '✨ Magia', fabricacion: '⚔️ Fabricación', cocina: '🍲 Cocina', trampas: '⚙️ Trampas', alquimia: '🧪 Alquimia', mapas: '🗺️ Mapas', restringida: '🔒 Restringida' };

function openPlayerBibliotecaModal(shopId) {
    const shop = playerShopsData.find(s => s.id === shopId);
    if (!shop) return;
    playerBibliotecaShopId = shopId;
    playerBibliotecaCart = [];
    document.getElementById('player-biblioteca-title').textContent = '📚 ' + (shop.nombre || 'Biblioteca');
    const body = document.getElementById('player-biblioteca-body');
    const receipt = document.getElementById('player-biblioteca-receipt');
    if (body) body.style.display = 'block';
    if (receipt) receipt.style.display = 'none';
    const user = getCurrentUser();
    if (user && user.id) {
        db.collection('players').doc(user.id).get().then(doc => {
            const oro = (doc.exists && doc.data().oro != null) ? doc.data().oro : 0;
            const el = document.getElementById('player-biblioteca-oro-display');
            if (el) el.textContent = oro.toLocaleString();
        });
    }
    renderPlayerBibliotecaTabsAndGrids();
    renderPlayerBibliotecaCart();
    if (!window._playerBibliotecaListeners) {
        window._playerBibliotecaListeners = true;
        document.querySelectorAll('.player-biblioteca-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const sec = btn.dataset.section;
                document.querySelectorAll('.player-biblioteca-tab').forEach(b => { b.classList.toggle('active', b.dataset.section === sec); b.classList.toggle('btn-secondary', b.dataset.section !== sec); });
                document.querySelectorAll('.player-biblioteca-section').forEach(s => { s.style.display = s.id === 'player-biblio-grid-' + sec ? 'block' : 'none'; });
            });
        });
    }
    openModal('player-biblioteca-modal');
}

function renderPlayerBibliotecaTabsAndGrids() {
    const shop = playerShopsData.find(s => s.id === playerBibliotecaShopId);
    if (!shop) return;
    const inv = shop.inventario || [];
    BIBLIOTECA_SECTIONS.forEach(sec => {
        const grid = document.getElementById('player-biblio-grid-' + sec);
        if (!grid) return;
        const items = inv.filter(it => (it.section || '').toLowerCase() === sec);
        const cssMap = { magia: 'magic', fabricacion: 'craft', cocina: 'cooking', trampas: 'traps', alquimia: 'alchemy', mapas: 'maps', restringida: 'restricted' };
        const bookCss = cssMap[sec] || 'magic';
        const inCart = (idx) => playerBibliotecaCart.some(e => e.inventarioIndex === idx);
        grid.innerHTML = items.length ? items.map((it, i) => {
            const invIdx = inv.indexOf(it);
            const added = inCart(invIdx);
            const price = it.price != null ? it.price : 0;
            const biblioDesc = getItemDesc(it) || '—';
            return `<div class="player-biblio-card player-biblio-${bookCss}">
                <div class="player-biblio-title">${it.name || it.title || 'Libro'}</div>
                <div class="player-biblio-details">
                    ${it.nivel != null ? `<div class="player-biblio-row"><span class="player-biblio-label">Nivel</span><span class="player-biblio-value">${it.nivel}</span></div>` : ''}
                    ${price ? `<div class="player-biblio-row"><span class="player-biblio-label">Depósito</span><span class="player-biblio-value">${price} PO</span></div>` : ''}
                    ${it.tiempo ? `<div class="player-biblio-row"><span class="player-biblio-label">Tiempo</span><span class="player-biblio-value">${it.tiempo}</span></div>` : ''}
                </div>
                <div class="player-biblio-effect"><div class="player-biblio-ef-label">${it.efLabel || 'Efecto'}</div><div class="player-biblio-ef-text">${biblioDesc}</div></div>
                ${price ? `<button type="button" class="btn btn-small player-biblio-add-btn ${added ? 'added' : ''}" onclick="playerBibliotecaToggleCart(${invIdx})">${added ? '✓ En el carrito' : '+ Agregar al carrito'}</button>` : ''}
            </div>`;
        }).join('') : '<p class="player-biblio-no-results">No hay libros en esta sección</p>';
    });
}

function playerBibliotecaToggleCart(inventarioIndex) {
    const shop = playerShopsData.find(s => s.id === playerBibliotecaShopId);
    if (!shop || !shop.inventario || inventarioIndex < 0 || inventarioIndex >= shop.inventario.length) return;
    const it = shop.inventario[inventarioIndex];
    const price = it.price != null ? it.price : 0;
    if (!price) return;
    const idx = playerBibliotecaCart.findIndex(e => e.inventarioIndex === inventarioIndex);
    if (idx >= 0) playerBibliotecaCart.splice(idx, 1);
    else playerBibliotecaCart.push({ inventarioIndex, name: it.name || it.title || 'Libro', price });
    renderPlayerBibliotecaCart();
    renderPlayerBibliotecaTabsAndGrids();
}

function renderPlayerBibliotecaCart() {
    const el = document.getElementById('player-biblioteca-cart-items');
    const totEl = document.getElementById('player-biblioteca-cart-total');
    if (!el) return;
    if (!playerBibliotecaCart.length) {
        el.innerHTML = '<div style="text-align:center; color:#8a7a9a; padding:24px;">📚 Sin libros en el carrito</div>';
        if (totEl) totEl.innerHTML = '';
        return;
    }
    const shop = playerShopsData.find(s => s.id === playerBibliotecaShopId);
    const inventario = shop && shop.inventario ? shop.inventario : [];
    el.innerHTML = playerBibliotecaCart.map(e => {
        const it = inventario[e.inventarioIndex];
        const price = it ? (it.price != null ? it.price : 0) : e.price;
        return `<div class="player-biblio-cart-item">
            <div><div class="player-biblio-cart-name">${e.name}</div><div class="player-biblio-cart-price">${price} PO</div></div>
            <button type="button" class="btn btn-small btn-danger" style="width:28px; height:28px; padding:0;" onclick="playerBibliotecaToggleCart(${e.inventarioIndex})">✕</button>
        </div>`;
    }).join('');
    const total = playerBibliotecaCart.reduce((sum, e) => sum + (inventario[e.inventarioIndex] ? (inventario[e.inventarioIndex].price != null ? inventario[e.inventarioIndex].price : 0) : e.price), 0);
    totEl.innerHTML = '<div style="margin-top:16px; padding-top:12px; border-top:2px solid #5a4a6a;"><div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:1.2em;"><span style="color:#a090b0;">Depósito Total:</span><span style="color:#daa520; font-weight:bold;">' + total.toLocaleString() + ' PO</span></div><button type="button" class="btn" style="width:100%; margin-top:12px; background:linear-gradient(135deg,#6a4a8a,#4a2a6a); color:#e0d0f0; border:2px solid #8a6aaa;" onclick="playerBibliotecaCheckout()">📜 Confirmar Alquiler</button></div>';
}

async function playerBibliotecaCheckout() {
    const user = getCurrentUser();
    if (!user || !user.id || !isPlayer()) { showToast('Debes estar logueado como personaje', true); return; }
    const shop = playerShopsData.find(s => s.id === playerBibliotecaShopId);
    if (!shop || !playerBibliotecaCart.length) { showToast('Carrito vacío', true); return; }
    const inventario = shop.inventario || [];
    const total = playerBibliotecaCart.reduce((sum, e) => sum + (inventario[e.inventarioIndex] ? (inventario[e.inventarioIndex].price != null ? inventario[e.inventarioIndex].price : 0) : e.price), 0);
    const doc = await db.collection('players').doc(user.id).get();
    if (!doc.exists) { showToast('No se encontró el personaje', true); return; }
    const data = doc.data();
    const oro = (data.oro != null ? data.oro : 0);
    if (oro < total) { showToast('No tienes suficiente oro. Depósito total: ' + total.toLocaleString() + ' PO. Tienes ' + oro.toLocaleString() + ' GP.', true); return; }
    const newOro = oro - total;
    const playerInv = Array.isArray(data.inventario) ? data.inventario.slice() : [];
    playerBibliotecaCart.forEach(e => {
        const it = inventario[e.inventarioIndex];
        if (!it) return;
        const entry = { name: it.name || it.title || 'Libro', price: it.price, effect: it.effect || '', rarity: 'común' };
        if (it.section) entry.section = it.section;
        if (it.tiempo) entry.tiempo = it.tiempo;
        if (it.nivel != null) entry.nivel = it.nivel;
        if (it.efLabel) entry.efLabel = it.efLabel;
        entry.shopTipo = (shop.tipo || 'biblioteca').toString().toLowerCase();
        playerInv.push(entry);
    });
    await db.collection('players').doc(user.id).update({ oro: newOro, inventario: playerInv });
    
    // Guardar transacción para cada libro alquilado
    for (const e of playerBibliotecaCart) {
        const it = inventario[e.inventarioIndex];
        if (!it) continue;
        const itemName = it.name || it.title || 'Libro';
        const itemPrice = it.price != null ? it.price : 0;
        const cityInfo = getCityInfoForShop(shop);
        await db.collection('transactions').add({
            tipo: 'compra',
            itemName: itemName,
            playerId: user.id,
            playerName: user.nombre || 'Jugador',
            shopName: shop.nombre || 'Biblioteca',
            precio: itemPrice,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            ...cityInfo
        });
    }
    const itemsBoughtBiblio = playerBibliotecaCart.map(e => {
        const it = inventario[e.inventarioIndex];
        return it ? { item: { name: it.name || it.title, effect: it.effect || it.desc, price: it.price }, qty: 1 } : null;
    }).filter(Boolean);
    if (itemsBoughtBiblio.length && typeof runAutomationRules === 'function') {
        await runAutomationRules(playerBibliotecaShopId, itemsBoughtBiblio, user.id, user.nombre || 'Jugador');
    }
    const receiptItems = playerBibliotecaCart.map(e => {
        const it = inventario[e.inventarioIndex];
        return { title: it.name || it.title || 'Libro', deposito: it.price != null ? it.price : 0 };
    });
    const receiptTotal = total;
    playerBibliotecaCart = [];
    const body = document.getElementById('player-biblioteca-body');
    const receipt = document.getElementById('player-biblioteca-receipt');
    if (body) body.style.display = 'none';
    if (receipt) {
        const shopName = (shop && shop.nombre) ? shop.nombre.toUpperCase() : 'BIBLIOTECA';
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        receipt.innerHTML = `
            <div class="player-biblio-receipt">
                <div class="player-biblio-receipt-header">
                    <div class="player-biblio-receipt-logo">📚</div>
                    <div class="player-biblio-receipt-title">${shopName}</div>
                    <div class="player-biblio-receipt-subtitle">Recibo de Depósito</div>
                </div>
                <div class="player-biblio-receipt-body">
                    ${receiptItems.map(item => `<div class="player-biblio-receipt-item"><span class="player-biblio-receipt-item-name">${item.title}</span><span class="player-biblio-receipt-item-price">${item.deposito} PO</span></div>`).join('')}
                </div>
                <div class="player-biblio-receipt-total"><span class="player-biblio-receipt-total-label">DEPÓSITO TOTAL:</span><span class="player-biblio-receipt-total-value">${receiptTotal} PO</span></div>
                <div class="player-biblio-receipt-footer">
                    <div class="player-biblio-receipt-warning"><span class="player-biblio-receipt-warning-icon">⚠️</span><span class="player-biblio-receipt-warning-text">CONSERVE ESTE RECIBO. Preséntelo para recuperar su depósito cuando devuelva los libros en buen estado.</span></div>
                    <div class="player-biblio-receipt-date">${dateStr} — ${timeStr}</div>
                    <div class="player-biblio-receipt-thanks">¡Que el conocimiento ilumine tu camino!</div>
                </div>
                <button type="button" class="btn player-biblio-receipt-close" onclick="closeModal('player-biblioteca-modal')">Cerrar</button>
            </div>`;
        receipt.style.display = 'block';
    }
    const oroEl = document.getElementById('player-biblioteca-oro-display');
    if (oroEl) oroEl.textContent = newOro.toLocaleString();
    showToast('Alquiler confirmado. ' + receiptTotal + ' PO descontados. Los libros se han añadido a tu inventario.');
}

// ==================== FORJA (estilo Grimm) ====================
const FORGE_TIER_NAMES = { 1: 'Nv. 1-5', 6: 'Nv. 6-10', 11: 'Nv. 11-15', 16: 'Nv. 16-20' };
const FORGE_TIER_CLASS = { 1: 'tier-1', 6: 'tier-6', 11: 'tier-11', 16: 'tier-16' };

function openPlayerForgeModal(shopId) {
    const shop = playerShopsData.find(s => s.id === shopId);
    if (!shop) return;
    playerForgeShopId = shopId;
    playerForgeCart = [];
    playerForgeLevel = 1;
    playerForgeTab = 'forge-shop';
    const bodyEl = document.getElementById('player-forge-body');
    const recEl = document.getElementById('player-forge-receipt');
    if (bodyEl) bodyEl.style.display = 'block';
    if (recEl) { recEl.style.display = 'none'; recEl.innerHTML = ''; }
    document.getElementById('player-forge-title').textContent = '⚔️ ' + (shop.nombre || 'Forja');
    document.querySelectorAll('.player-forge-level').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.level) === 1);
        b.classList.toggle('btn-secondary', parseInt(b.dataset.level) !== 1);
    });
    document.querySelectorAll('.player-forge-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === 'forge-shop');
        b.classList.toggle('btn-secondary', b.dataset.tab !== 'forge-shop');
    });
    document.getElementById('player-forge-shop-grid').style.display = 'block';
    document.getElementById('player-forge-services-grid').style.display = 'none';
    const user = getCurrentUser();
    if (user && user.id) {
        db.collection('players').doc(user.id).get().then(doc => {
            const oro = (doc.exists && doc.data().oro != null) ? doc.data().oro : 0;
            document.getElementById('player-forge-oro-display').textContent = oro.toLocaleString();
        });
    }
    renderPlayerForgeGrids();
    renderPlayerForgeCart();
    if (!window._playerForgeListeners) {
        window._playerForgeListeners = true;
        document.querySelectorAll('.player-forge-level').forEach(btn => {
            btn.addEventListener('click', () => {
                playerForgeLevel = parseInt(btn.dataset.level);
                document.querySelectorAll('.player-forge-level').forEach(b => { b.classList.remove('active'); b.classList.add('btn-secondary'); if (parseInt(b.dataset.level) === playerForgeLevel) { b.classList.add('active'); b.classList.remove('btn-secondary'); } });
                renderPlayerForgeGrids();
            });
        });
        document.querySelectorAll('.player-forge-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                playerForgeTab = btn.dataset.tab;
                document.querySelectorAll('.player-forge-tab').forEach(b => { b.classList.toggle('active', b.dataset.tab === playerForgeTab); b.classList.toggle('btn-secondary', b.dataset.tab !== playerForgeTab); });
                document.getElementById('player-forge-shop-grid').style.display = playerForgeTab === 'forge-shop' ? 'block' : 'none';
                document.getElementById('player-forge-services-grid').style.display = playerForgeTab === 'forge-services' ? 'block' : 'none';
            });
        });
    }
    openModal('player-forge-modal');
}

function renderPlayerForgeGrids() {
    const shop = playerShopsData.find(s => s.id === playerForgeShopId);
    if (!shop) return;
    const inv = shop.inventario || [];
    const tier = playerForgeLevel;
    const allTienda = inv.filter(it => (it.tipo || 'arma').toLowerCase() !== 'servicio' && (it.tier === tier || it.tier === parseInt(tier, 10)));
    const allServ = inv.filter(it => (it.tipo || '').toLowerCase() === 'servicio' && (it.tier === tier || it.tier === parseInt(tier, 10)));
    const shopGrid = document.getElementById('player-forge-shop-grid');
    const servGrid = document.getElementById('player-forge-services-grid');
    const tierClass = FORGE_TIER_CLASS[tier] || '';
    const tierName = FORGE_TIER_NAMES[tier] || '';
    const tipoLabel = (t) => {
        const tipo = (t || 'arma').toLowerCase();
        return tipo === 'armadura' ? '🛡️ Armadura' : (tipo === 'servicio' ? '🔧 Servicio' : '⚔️ Arma');
    };
    const renderCard = (it, invIdx) => {
        const isArmor = (it.tipo || '').toLowerCase() === 'armadura' || it.isArmor;
        const dmgHtml = isArmor && it.ac ? `<div class="player-forge-damage-info">🛡️ CA: ${it.ac}</div>` : (it.damage ? `<div class="player-forge-damage-info">⚔️ ${it.damage} ${it.damageType ? it.damageType : ''}</div>` : '');
        return `<div class="player-forge-card ${tierClass}">
            <div class="player-forge-card-name">${it.name || 'Item'}</div>
            <div class="player-forge-tipo-tier">${tipoLabel(it.tipo)} · ${tierName}</div>
            ${dmgHtml}
            <div class="player-forge-desc">${getItemDesc(it) || '—'}</div>
            <div class="player-forge-footer"><span class="player-forge-price">${(it.price||0).toLocaleString()} GP</span>
            <button type="button" class="btn btn-small" onclick="playerForgeAddToCart(${invIdx})">+ Añadir</button></div>
        </div>`;
    };
    const renderServiceCard = (it, invIdx) => {
        return `<div class="player-forge-card ${tierClass}">
            <div class="player-forge-card-name">${it.name || 'Item'}</div>
            <div class="player-forge-tipo-tier">${tipoLabel(it.tipo)} · ${tierName}</div>
            <div class="player-forge-desc">${getItemDesc(it) || '—'}</div>
            <div class="player-forge-footer"><span class="player-forge-price">${(it.price||0).toLocaleString()} GP</span>
            <button type="button" class="btn btn-small" onclick="playerForgeAddToCart(${invIdx})">+ Añadir</button></div>
        </div>`;
    };
    shopGrid.innerHTML = allTienda.length ? '<div class="player-forge-cat-title">⚔️ Armas / Armaduras</div>' + allTienda.map(it => renderCard(it, inv.indexOf(it))).join('') : '<p class="player-forge-no-results">No hay items de tienda para este nivel</p>';
    servGrid.innerHTML = allServ.length ? '<div class="player-forge-cat-title">🔧 Servicios</div>' + allServ.map(it => renderServiceCard(it, inv.indexOf(it))).join('') : '<p class="player-forge-no-results">No hay servicios para este nivel</p>';
}

function playerForgeAddToCart(inventarioIndex) {
    const shop = playerShopsData.find(s => s.id === playerForgeShopId);
    if (!shop || !shop.inventario || inventarioIndex < 0 || inventarioIndex >= shop.inventario.length) return;
    const it = shop.inventario[inventarioIndex];
    const entry = playerForgeCart.find(e => e.inventarioIndex === inventarioIndex);
    if (entry) entry.qty++;
    else playerForgeCart.push({ inventarioIndex, qty: 1, name: it.name, price: it.price || 0 });
    renderPlayerForgeCart();
}

function playerForgeUpdateQty(inventarioIndex, delta) {
    const entry = playerForgeCart.find(e => e.inventarioIndex === inventarioIndex);
    if (!entry) return;
    entry.qty += delta;
    if (entry.qty <= 0) playerForgeCart = playerForgeCart.filter(e => e.inventarioIndex !== inventarioIndex);
    renderPlayerForgeCart();
}

function renderPlayerForgeCart() {
    const el = document.getElementById('player-forge-cart-items');
    const totEl = document.getElementById('player-forge-cart-total');
    if (!el) return;
    if (!playerForgeCart.length) {
        el.innerHTML = '<div style="text-align:center; color:#8b7355; padding:24px;">⚔️ Sin pedidos aún</div>';
        if (totEl) totEl.innerHTML = '';
        return;
    }
    const shop = playerShopsData.find(s => s.id === playerForgeShopId);
    const inventario = shop && shop.inventario ? shop.inventario : [];
    el.innerHTML = playerForgeCart.map(e => {
        const it = inventario[e.inventarioIndex];
        const price = it ? (it.price || 0) : e.price;
        return `<div class="player-forge-cart-item">
            <div><div class="player-forge-cart-name">${e.name}</div><div class="player-forge-cart-price">${price} GP c/u</div></div>
            <div style="display:flex; align-items:center; gap:8px;">
                <button type="button" class="btn btn-small" style="width:28px; height:28px; padding:0;" onclick="playerForgeUpdateQty(${e.inventarioIndex}, -1)">−</button>
                <span>${e.qty}</span>
                <button type="button" class="btn btn-small" style="width:28px; height:28px; padding:0;" onclick="playerForgeUpdateQty(${e.inventarioIndex}, 1)">+</button>
            </div>
        </div>`;
    }).join('');
    const subtotal = playerForgeCart.reduce((sum, e) => {
        const it = inventario[e.inventarioIndex];
        return sum + (it ? (it.price || 0) : e.price) * e.qty;
    }, 0);
    const totalItems = playerForgeCart.reduce((s, e) => s + e.qty, 0);
    const discount = totalItems >= 4 ? Math.floor(subtotal * 0.1) : 0;
    const total = subtotal - discount;
    const advance = Math.floor(total * 0.5);
    totEl.innerHTML = '<div style="margin-top:16px; padding-top:12px; border-top:2px solid #8b4513;">' +
        '<div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span style="color:#8b7355;">Subtotal:</span><span style="color:#ffcc00;">' + subtotal.toLocaleString() + ' GP</span></div>' +
        (discount ? '<div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span style="color:#8b7355;">Desc. Grupo (4+):</span><span style="color:#2ecc71;">-' + discount.toLocaleString() + ' GP</span></div>' : '') +
        '<div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:1.2em;"><span style="color:#8b7355;">Total:</span><span style="color:#ffcc00; font-weight:bold;">' + total.toLocaleString() + ' GP</span></div>' +
        '<div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span style="color:#8b7355;">Anticipo (50%):</span><span style="color:#ff8c5a;">' + advance.toLocaleString() + ' GP</span></div>' +
        '<button type="button" class="btn" style="width:100%; margin-top:12px; background:linear-gradient(135deg,#ff6b35,#f7931e); color:#1a0a0a;" onclick="playerForgeCheckout()">⚔️ Confirmar Pedido</button></div>';
}

async function playerForgeCheckout() {
    const user = getCurrentUser();
    if (!user || !user.id || !isPlayer()) { showToast('Debes estar logueado como personaje', true); return; }
    const shop = playerShopsData.find(s => s.id === playerForgeShopId);
    if (!shop || !playerForgeCart.length) { showToast('Carrito vacío', true); return; }
    const inventario = shop.inventario || [];
    const subtotal = playerForgeCart.reduce((sum, e) => sum + (inventario[e.inventarioIndex] ? (inventario[e.inventarioIndex].price || 0) * e.qty : 0), 0);
    const totalItems = playerForgeCart.reduce((s, e) => s + e.qty, 0);
    const discount = totalItems >= 4 ? Math.floor(subtotal * 0.1) : 0;
    const total = subtotal - discount;
    const doc = await db.collection('players').doc(user.id).get();
    if (!doc.exists) { showToast('No se encontró el personaje', true); return; }
    const data = doc.data();
    const oro = (data.oro != null ? data.oro : 0);
    if (oro < total) { showToast('No tienes suficiente oro. Tienes ' + oro.toLocaleString() + ' GP. Total: ' + total.toLocaleString() + ' GP.', true); return; }
    const newOro = oro - total;
    const receiptItems = playerForgeCart.map(e => {
        const it = inventario[e.inventarioIndex];
        const name = it ? (it.name || 'Item') : 'Item';
        const price = it ? (it.price != null ? it.price : 0) : 0;
        const qty = e.qty || 1;
        const line = qty > 1 ? (price * qty) + ' GP (' + qty + ' × ' + price + ')' : price + ' GP';
        return { name, line };
    });
    const extraLines = [];
    if (subtotal !== total) extraLines.push({ label: 'Subtotal:', value: subtotal.toLocaleString() + ' GP' });
    if (discount > 0) extraLines.push({ label: 'Descuento grupo (4+ ítems):', value: '-' + discount.toLocaleString() + ' GP' });
    const playerInv = Array.isArray(data.inventario) ? data.inventario.slice() : [];
    playerForgeCart.forEach(e => {
        const it = inventario[e.inventarioIndex];
        if (!it) return;
        const entry = { name: it.name, price: it.price, effect: it.effect || it.desc || '', rarity: 'común' };
        if (it.tier) entry.tier = it.tier;
        if (it.damage) entry.damage = it.damage;
        if (it.damageType) entry.damageType = it.damageType;
        if (it.ac) entry.ac = it.ac;
        if (it.tipo) entry.tipo = it.tipo;
        entry.shopTipo = (shop.tipo || 'herreria').toString().toLowerCase();
        for (let q = 0; q < e.qty; q++) playerInv.push(entry);
    });
    await db.collection('players').doc(user.id).update({ oro: newOro, inventario: playerInv });
    
    // Guardar transacción para cada item comprado
    for (const e of playerForgeCart) {
        const it = inventario[e.inventarioIndex];
        if (!it) continue;
        const itemName = it.name || 'Item';
        const itemPrice = (it.price != null ? it.price : 0) * (e.qty || 1);
        const cityInfo = getCityInfoForShop(shop);
        await db.collection('transactions').add({
            tipo: 'compra',
            itemName: (e.qty > 1 ? e.qty + '× ' : '') + itemName,
            playerId: user.id,
            playerName: user.nombre || 'Jugador',
            shopName: shop.nombre || 'Forja',
            precio: itemPrice,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            ...cityInfo
        });
    }
    const itemsBoughtForge = playerForgeCart.map(e => {
        const it = inventario[e.inventarioIndex];
        return it ? { item: { name: it.name, effect: it.effect || it.desc, price: it.price }, qty: e.qty || 1 } : null;
    }).filter(Boolean);
    if (itemsBoughtForge.length && typeof runAutomationRules === 'function') {
        await runAutomationRules(playerForgeShopId, itemsBoughtForge, user.id, user.nombre || 'Jugador');
    }
    playerForgeCart = [];
    renderPlayerForgeCart();
    document.getElementById('player-forge-oro-display').textContent = newOro.toLocaleString();
    const bodyEl = document.getElementById('player-forge-body');
    const recEl = document.getElementById('player-forge-receipt');
    if (bodyEl) bodyEl.style.display = 'none';
    if (recEl) {
        recEl.innerHTML = buildShopReceiptHTML({
            shopName: shop.nombre || 'Forja',
            logo: '⚔️',
            subtitle: 'Recibo de pedido',
            items: receiptItems,
            extraLines,
            totalLabel: 'TOTAL:',
            totalValue: total.toLocaleString() + ' GP',
            footerThanks: 'Que el metal sirva a tu causa.',
            modalId: 'player-forge-modal'
        });
        recEl.style.display = 'block';
    }
    showToast('Pedido confirmado. ' + total.toLocaleString() + ' GP descontados.');
}

function openPlayerShopCatalog(shopId) {
    const shop = playerShopsData.find(s => s.id === shopId);
    if (!shop) return;
    document.getElementById('player-shop-catalog-title').textContent = '📦 ' + (shop.nombre || 'Catálogo');
    const list = document.getElementById('player-shop-catalog-list');
    const items = shop.inventario || [];
    const rarityColors = { común: '#2ecc71', infrecuente: '#3498db', rara: '#9b59b6', legendaria: '#e74c3c' };
    if (!items.length) {
        list.innerHTML = '<p style="color:#8b7355; text-align:center; padding:30px;">No hay items en esta tienda.</p>';
    } else {
        list.innerHTML = items.map(item => {
            const desc = getItemDesc(item) || '—';
            return `
            <div class="mini-card" style="margin-bottom:12px;">
                <div class="mini-card-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <span>${item.name || 'Item'}</span>
                    <span style="background:${rarityColors[item.rarity] || '#555'}; padding:2px 8px; border-radius:10px; font-size:0.75em; text-transform:uppercase;">${item.rarity || 'común'}</span>
                </div>
                <div class="mini-card-info" style="min-height:1.2em; color:#d4c4a8;">${desc}</div>
                <div style="color:#f1c40f; font-weight:600;">${item.price != null ? item.price + ' GP' : '—'}</div>
            </div>`;
        }).join('');
    }
    openModal('player-shop-catalog-modal');
}

function openPlayerPotionShop(shopId) {
    const shop = playerShopsData.find(s => s.id === shopId);
    if (!shop) return;
    playerPotionShopId = shopId;
    playerPotionProducts = (shop.inventario || []).map((it, i) => ({ ...it, index: i }));
    playerPotionCart = [];
    playerPotionFilter = 'all';
    playerPotionSearchTerm = '';
    const bodyEl = document.getElementById('player-potion-body');
    const recEl = document.getElementById('player-potion-receipt');
    if (bodyEl) bodyEl.style.display = 'block';
    if (recEl) { recEl.style.display = 'none'; recEl.innerHTML = ''; }
    document.getElementById('player-potion-shop-title').textContent = '🧪 ' + (shop.nombre || 'Tienda de Pociones');
    document.getElementById('player-potion-search').value = '';
    document.querySelectorAll('.player-potion-filter').forEach(b => { b.classList.toggle('active', b.dataset.rarity === 'all'); });
    const user = getCurrentUser();
    if (user && user.id) {
        db.collection('players').doc(user.id).get().then(doc => {
            const oro = (doc.exists && doc.data().oro != null) ? doc.data().oro : 0;
            document.getElementById('player-potion-shop-oro-display').textContent = oro.toLocaleString();
        });
    }
    renderPlayerPotionProducts();
    renderPlayerPotionCart();
    if (!window._playerPotionListeners) {
        window._playerPotionListeners = true;
        document.getElementById('player-potion-search').addEventListener('input', () => {
            playerPotionSearchTerm = document.getElementById('player-potion-search').value.toLowerCase();
            renderPlayerPotionProducts();
        });
        document.querySelectorAll('.player-potion-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                playerPotionFilter = btn.dataset.rarity;
                document.querySelectorAll('.player-potion-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderPlayerPotionProducts();
            });
        });
    }
    openModal('player-potion-shop-modal');
}

function renderPlayerPotionProducts() {
    const el = document.getElementById('player-potion-products');
    if (!el) return;
    const filtered = playerPotionProducts.filter(p => {
        const r = (p.rarity || 'común').toLowerCase();
        const matchR = playerPotionFilter === 'all' || r === playerPotionFilter;
        const matchSearch = !playerPotionSearchTerm || (p.name || '').toLowerCase().includes(playerPotionSearchTerm) || (getItemDesc(p) || '').toLowerCase().includes(playerPotionSearchTerm);
        return matchR && matchSearch;
    });
    const rarityColors = { común: '#2ecc71', infrecuente: '#3498db', rara: '#9b59b6', legendaria: '#e74c3c' };
    if (!filtered.length) {
        el.innerHTML = '<p style="color:#8b7355; text-align:center; padding:24px;">No hay pociones con esos filtros.</p>';
        return;
    }
    el.innerHTML = filtered.map(p => {
        const r = (p.rarity || 'común').toLowerCase();
        return `
        <div class="player-potion-product-card ${r}">
            <div class="player-potion-product-name">${p.name || 'Item'}</div>
            <span class="player-potion-product-rarity" style="background:${rarityColors[r] || '#555'}">${r}</span>
            <div class="player-potion-product-effect">${getItemDesc(p) || '—'}</div>
            ${(p.avg && p.avg.trim()) ? '<div style="color:#f1c40f; font-size:0.85em; margin-bottom:8px;">⚡ ' + p.avg + '</div>' : ''}
            <div class="player-potion-product-footer">
                <span style="color:#f1c40f; font-weight:bold;">${(p.price != null ? p.price : 0).toLocaleString()} GP</span>
                <button type="button" class="btn btn-small" onclick="addToPotionCart(${p.index})">+ Añadir</button>
            </div>
        </div>`;
    }).join('');
}

function addToPotionCart(index) {
    const existing = playerPotionCart.find(i => i.index === index);
    if (existing) existing.qty++; else playerPotionCart.push({ index, qty: 1 });
    renderPlayerPotionCart();
}

function updatePotionQty(index, delta) {
    const item = playerPotionCart.find(i => i.index === index);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) playerPotionCart = playerPotionCart.filter(i => i.index !== index);
    renderPlayerPotionCart();
}

function renderPlayerPotionCart() {
    const itemsEl = document.getElementById('player-potion-cart-items');
    const totalEl = document.getElementById('player-potion-cart-total');
    if (!itemsEl || !totalEl) return;
    if (!playerPotionCart.length) {
        itemsEl.innerHTML = '<div style="color:#8b7355; text-align:center; padding:20px;">🧪 Carrito vacío</div>';
        totalEl.innerHTML = '';
        return;
    }
    const products = (playerShopsData.find(s => s.id === playerPotionShopId) || {}).inventario || [];
    itemsEl.innerHTML = playerPotionCart.map(item => {
        const p = products[item.index];
        const name = (p && p.name) ? p.name : 'Item';
        const price = (p && p.price != null) ? p.price : 0;
        return `
        <div class="player-potion-cart-item">
            <div>
                <div class="player-potion-cart-item-name">${name}</div>
                <div class="player-potion-cart-item-price">${price} GP c/u</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <button type="button" class="btn btn-small btn-secondary" style="width:28px; height:28px; padding:0; line-height:26px;" onclick="updatePotionQty(${item.index}, -1)">−</button>
                <span style="min-width:22px; text-align:center;">${item.qty}</span>
                <button type="button" class="btn btn-small btn-secondary" style="width:28px; height:28px; padding:0; line-height:26px;" onclick="updatePotionQty(${item.index}, 1)">+</button>
            </div>
        </div>`;
    }).join('');
    const subtotal = playerPotionCart.reduce((sum, item) => {
        const p = products[item.index];
        return sum + (p && p.price != null ? p.price : 0) * item.qty;
    }, 0);
    const commonQty = playerPotionCart.reduce((s, item) => {
        const p = products[item.index];
        return s + ((p && (p.rarity || '').toLowerCase() === 'común') ? item.qty : 0);
    }, 0);
    const discount = commonQty >= 3 ? Math.floor(subtotal * 0.1) : 0;
    const total = subtotal - discount;
    totalEl.innerHTML = `
        <div class="player-potion-cart-total-row">
            <span style="color:#a89878;">Subtotal:</span>
            <span style="color:#f1c40f;">${subtotal.toLocaleString()} GP</span>
        </div>
        ${discount > 0 ? `<div class="player-potion-cart-total-row"><span style="color:#a89878;">Descuento (3+ comunes):</span><span style="color:#2ecc71;">-${discount.toLocaleString()} GP</span></div>` : ''}
        <div class="player-potion-cart-total-row" style="font-weight:bold; margin-top:8px;">
            <span style="color:#d4af37;">Total:</span>
            <span style="color:#f1c40f;">${total.toLocaleString()} GP</span>
        </div>
        <button type="button" class="btn player-potion-checkout-btn" onclick="playerPotionCheckout()">💰 Completar Compra</button>
    `;
}

async function playerPotionCheckout() {
    const user = getCurrentUser();
    if (!user || !user.id || !isPlayer()) {
        showToast('Debes estar logueado como personaje', true);
        return;
    }
    const shop = playerShopsData.find(s => s.id === playerPotionShopId);
    const products = (shop && shop.inventario) ? shop.inventario : [];
    const subtotal = playerPotionCart.reduce((sum, item) => {
        const p = products[item.index];
        return sum + (p && p.price != null ? p.price : 0) * item.qty;
    }, 0);
    const commonQty = playerPotionCart.reduce((s, item) => {
        const p = products[item.index];
        return s + ((p && (p.rarity || '').toLowerCase() === 'común') ? item.qty : 0);
    }, 0);
    const discount = commonQty >= 3 ? Math.floor(subtotal * 0.1) : 0;
    const total = subtotal - discount;
    if (!playerPotionCart.length || total <= 0) {
        showToast('El carrito está vacío', true);
        return;
    }
    const doc = await db.collection('players').doc(user.id).get();
    if (!doc.exists) {
        showToast('No se encontró el personaje', true);
        return;
    }
    const data = doc.data();
    const oro = (data.oro != null ? data.oro : 0);
    if (oro < total) {
        showToast('No tienes suficiente oro. Tienes ' + oro.toLocaleString() + ' GP.', true);
        return;
    }
    const newOro = oro - total;
    const receiptItems = playerPotionCart.map(item => {
        const p = products[item.index];
        const name = p ? (p.name || 'Item') : 'Item';
        const price = p && p.price != null ? p.price : 0;
        const qty = item.qty || 1;
        const line = qty > 1 ? (price * qty) + ' GP (' + qty + ' × ' + price + ')' : price + ' GP';
        return { name, line };
    });
    const extraLines = [];
    if (subtotal !== total) extraLines.push({ label: 'Subtotal:', value: subtotal.toLocaleString() + ' GP' });
    if (discount > 0) extraLines.push({ label: 'Descuento (3+ comunes):', value: '-' + discount.toLocaleString() + ' GP' });
    const inventario = Array.isArray(data.inventario) ? data.inventario.slice() : [];
    for (const item of playerPotionCart) {
        const p = products[item.index];
        if (!p) continue;
        const entry = { name: p.name || 'Item', price: p.price, effect: p.effect || '', rarity: (p.rarity || 'común') };
        entry.shopTipo = (shop && shop.tipo ? shop.tipo : 'pociones').toString().toLowerCase();
        for (let q = 0; q < item.qty; q++) inventario.push(entry);
    }
    await db.collection('players').doc(user.id).update({ oro: newOro, inventario });
    
    // Guardar transacción para cada poción comprada
    for (const item of playerPotionCart) {
        const p = products[item.index];
        if (!p) continue;
        const itemName = p.name || 'Item';
        const itemPrice = (p.price != null ? p.price : 0) * (item.qty || 1);
        const cityInfo = getCityInfoForShop(shop);
        await db.collection('transactions').add({
            tipo: 'compra',
            itemName: (item.qty > 1 ? item.qty + '× ' : '') + itemName,
            playerId: user.id,
            playerName: user.nombre || 'Jugador',
            shopName: shop.nombre || 'Tienda de Pociones',
            precio: itemPrice,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            ...cityInfo
        });
    }
    const itemsBoughtPotion = playerPotionCart.map(item => {
        const p = products[item.index];
        return p ? { item: { name: p.name, effect: p.effect, price: p.price }, qty: item.qty || 1 } : null;
    }).filter(Boolean);
    if (itemsBoughtPotion.length && typeof runAutomationRules === 'function') {
        await runAutomationRules(playerPotionShopId, itemsBoughtPotion, user.id, user.nombre || 'Jugador');
    }
    playerPotionCart = [];
    renderPlayerPotionCart();
    document.getElementById('player-potion-shop-oro-display').textContent = newOro.toLocaleString();
    const bodyEl = document.getElementById('player-potion-body');
    const recEl = document.getElementById('player-potion-receipt');
    if (bodyEl) bodyEl.style.display = 'none';
    if (recEl) {
        recEl.innerHTML = buildShopReceiptHTML({
            shopName: (shop && shop.nombre) ? shop.nombre : 'Tienda de Pociones',
            logo: '🧪',
            subtitle: 'Recibo de compra',
            items: receiptItems,
            extraLines,
            totalLabel: 'TOTAL:',
            totalValue: total.toLocaleString() + ' GP',
            footerThanks: '¡Gracias por tu compra! Que los elixires te protejan.',
            modalId: 'player-potion-shop-modal'
        });
        recEl.style.display = 'block';
    }
    showToast('Compra realizada. ' + total.toLocaleString() + ' GP descontados.');
}

// ==================== TABERNA (estilo Búho Sabio) ====================
function openPlayerTavernShop(shopId) {
    const shop = playerShopsData.find(s => s.id === shopId);
    if (!shop) return;
    playerTavernShopId = shopId;
    playerTavernCart = [];
    const bodyEl = document.getElementById('player-tavern-body');
    const recEl = document.getElementById('player-tavern-receipt');
    if (bodyEl) bodyEl.style.display = 'block';
    if (recEl) { recEl.style.display = 'none'; recEl.innerHTML = ''; }
    const vipPrice = (shop.entradaVipPrecio != null ? shop.entradaVipPrecio : 10);
    document.getElementById('player-tavern-title').textContent = '🍺 ' + (shop.nombre || 'Taberna');
    document.getElementById('player-tavern-vip-price').textContent = vipPrice + ' GP';
    document.querySelectorAll('.player-tavern-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === 'tavern-entrada');
        b.classList.toggle('btn-secondary', b.dataset.tab !== 'tavern-entrada');
    });
    document.querySelectorAll('.player-tavern-tab-content').forEach(el => { el.style.display = 'none'; });
    document.getElementById('tavern-entrada').style.display = 'block';
    const user = getCurrentUser();
    if (user && user.id) {
        db.collection('players').doc(user.id).get().then(doc => {
            const oro = (doc.exists && doc.data().oro != null) ? doc.data().oro : 0;
            document.getElementById('player-tavern-oro-display').textContent = oro.toLocaleString();
        });
    }
    renderTavernBebidas();
    renderTavernCocina();
    renderTavernCart();
    if (!window._playerTavernTabListeners) {
        window._playerTavernTabListeners = true;
        document.querySelectorAll('.player-tavern-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                document.querySelectorAll('.player-tavern-tab').forEach(b => {
                    b.classList.toggle('active', b.dataset.tab === tabId);
                    b.classList.toggle('btn-secondary', b.dataset.tab !== tabId);
                });
                document.querySelectorAll('.player-tavern-tab-content').forEach(el => { el.style.display = 'none'; });
                const content = document.getElementById(tabId);
                if (content) content.style.display = 'block';
            });
        });
    }
    openModal('player-tavern-modal');
}

function playerTavernEnter(kind) {
    const shop = playerShopsData.find(s => s.id === playerTavernShopId);
    const vipPrice = (shop && shop.entradaVipPrecio != null) ? shop.entradaVipPrecio : 10;
    const name = kind === 'vip' ? 'Entrada VIP' : 'Entrada Normal';
    const price = kind === 'vip' ? vipPrice : 0;
    const id = kind === 'vip' ? 'entry-vip' : 'entry-free';
    const existing = playerTavernCart.find(i => i.id === id || (i.type === 'entry' && (kind === 'vip' ? i.price > 0 : i.price === 0)));
    if (existing) return;
    playerTavernCart = playerTavernCart.filter(i => i.type !== 'entry');
    playerTavernCart.unshift({ id, name, price, qty: 1, type: 'entry' });
    renderTavernCart();
    document.querySelectorAll('.player-tavern-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === 'tavern-bebidas');
        b.classList.toggle('btn-secondary', b.dataset.tab !== 'tavern-bebidas');
    });
    document.querySelectorAll('.player-tavern-tab-content').forEach(el => { el.style.display = 'none'; });
    document.getElementById('tavern-bebidas').style.display = 'block';
}

function getTavernItems() {
    const shop = playerShopsData.find(s => s.id === playerTavernShopId);
    const inv = (shop && shop.inventario) ? shop.inventario : [];
    const items = inv.map((it, i) => ({
        id: String(i), name: it.name || 'Item', price: it.price != null ? it.price : 0,
        type: (it.type || 'drink').toLowerCase(), categoria: (it.categoria || 'servir').toLowerCase(),
        effect: it.effect || '', desc: it.desc || it.effect || ''
    }));
    return items;
}

function renderTavernBebidas() {
    const items = getTavernItems().filter(it => it.type === 'drink');
    const serve = items.filter(it => it.categoria !== 'llevar');
    const takeaway = items.filter(it => it.categoria === 'llevar');
    const grid = document.getElementById('player-tavern-bebidas-grid');
    const card = (it) => {
        const isLlevar = (it.categoria || 'servir').toLowerCase() === 'llevar';
        const typeLabel = isLlevar ? 'Para Llevar ✨' : 'Para Servir';
        const texto = getItemDesc(it) || '—';
        return `<div class="player-tavern-product-card ${isLlevar ? 'special' : 'drink'}">
            <div class="player-tavern-product-name">${it.name}</div>
            <span class="player-tavern-product-type">${typeLabel}</span>
            <div class="player-tavern-effect"><span>✨</span><span>${texto}</span></div>
            <div class="player-tavern-product-footer">
                <span class="player-tavern-product-price">${it.price} GP</span>
                <button type="button" class="btn btn-small" onclick="addToTavernCart('${it.id}')">+ Añadir</button>
            </div>
        </div>`;
    };
    let html = '<div class="player-tavern-category-title">🍺 Bebidas para Servir</div>';
    html += (serve.length ? serve.map(card).join('') : '<p style="color:#8b7355; padding:10px;">Sin bebidas para servir.</p>');
    html += '<div class="player-tavern-category-title">📦 Bebidas para Llevar (Con Efectos)</div>';
    html += (takeaway.length ? takeaway.map(card).join('') : '<p style="color:#8b7355; padding:10px;">Sin bebidas para llevar.</p>');
    grid.innerHTML = html;
}

function renderTavernCocina() {
    const items = getTavernItems().filter(it => it.type === 'food');
    const serve = items.filter(it => it.categoria !== 'llevar');
    const takeaway = items.filter(it => it.categoria === 'llevar');
    const grid = document.getElementById('player-tavern-cocina-grid');
    const card = (it) => {
        const isLlevar = (it.categoria || 'servir').toLowerCase() === 'llevar';
        const typeLabel = isLlevar ? 'Para Llevar ✨' : 'Para Servir';
        const texto = getItemDesc(it) || '—';
        return `<div class="player-tavern-product-card ${isLlevar ? 'special' : 'food'}">
            <div class="player-tavern-product-name">${it.name}</div>
            <span class="player-tavern-product-type">${typeLabel}</span>
            <div class="player-tavern-effect"><span>✨</span><span>${texto}</span></div>
            <div class="player-tavern-product-footer">
                <span class="player-tavern-product-price">${it.price} GP</span>
                <button type="button" class="btn btn-small" onclick="addToTavernCart('${it.id}')">+ Añadir</button>
            </div>
        </div>`;
    };
    let html = '<div class="player-tavern-category-title">🍖 Comidas para Servir</div>';
    html += (serve.length ? serve.map(card).join('') : '<p style="color:#8b7355; padding:10px;">Sin comidas para servir.</p>');
    html += '<div class="player-tavern-category-title">📦 Comidas para Llevar (Con Efectos)</div>';
    html += (takeaway.length ? takeaway.map(card).join('') : '<p style="color:#8b7355; padding:10px;">Sin comidas para llevar.</p>');
    grid.innerHTML = html;
}

function addToTavernCart(id) {
    if (id === 'entry-free' || id === 'entry-vip') return;
    const items = getTavernItems();
    const it = items.find(i => i.id === id);
    if (!it) return;
    const existing = playerTavernCart.find(i => i.id === id);
    if (existing) existing.qty++; else playerTavernCart.push({ id, name: it.name, price: it.price, qty: 1 });
    renderTavernCart();
}

function updateTavernQty(id, delta) {
    const item = playerTavernCart.find(i => i.id === id);
    if (!item) return;
    if (item.type === 'entry') {
        if (delta < 0) playerTavernCart = playerTavernCart.filter(i => i.id !== id);
    } else {
        item.qty += delta;
        if (item.qty <= 0) playerTavernCart = playerTavernCart.filter(i => i.id !== id);
    }
    renderTavernCart();
}

function renderTavernCart() {
    const html = playerTavernCart.length ? playerTavernCart.map(item => {
        const isEntry = item.type === 'entry';
        const priceStr = item.price === 0 ? 'GRATIS' : item.price + ' GP';
        return `<div class="player-tavern-cart-item" ${isEntry ? 'style="background:rgba(244,208,63,0.15);border-color:#f4d03f;"' : ''}>
            <div><div class="player-tavern-cart-name">${item.name}</div><div class="player-tavern-cart-price">${priceStr}${item.qty > 1 ? ' × ' + item.qty : ''}</div></div>
            <div style="display:flex;align-items:center;gap:8px;">
                ${isEntry ? `<button type="button" class="btn btn-small btn-secondary" style="width:28px;height:28px;padding:0;" onclick="updateTavernQty('${item.id}', -1)">✕</button>` :
                `<button type="button" class="btn btn-small btn-secondary" style="width:28px;height:28px;padding:0;" onclick="updateTavernQty('${item.id}', -1)">−</button><span style="min-width:22px;text-align:center;">${item.qty}</span><button type="button" class="btn btn-small btn-secondary" style="width:28px;height:28px;padding:0;" onclick="updateTavernQty('${item.id}', 1)">+</button>`}
            </div>
        </div>`;
    }).join('') : '<div style="color:#8b7355;text-align:center;padding:24px;">🍺 ¿Qué te sirvo?</div>';
    document.getElementById('player-tavern-cart-items').innerHTML = html;
    const cocinaEl = document.getElementById('player-tavern-cart-items-cocina');
    if (cocinaEl) cocinaEl.innerHTML = html;
    const total = playerTavernCart.reduce((s, i) => s + i.price * i.qty, 0);
    const totalHtml = playerTavernCart.length ? `
        <div class="player-tavern-cart-total">
            <div class="player-tavern-cart-total-row"><span style="color:#a89878;">Total:</span><span style="color:#f4d03f;font-weight:bold;">${total} GP</span></div>
            <button type="button" class="btn" style="width:100%;margin-top:12px;background:linear-gradient(135deg,#f4d03f,#d4a574);color:#1a1a1a;" onclick="playerTavernCheckout()">🍺 Pagar Cuenta</button>
        </div>` : '';
    document.getElementById('player-tavern-cart-total').innerHTML = totalHtml;
    if (document.getElementById('player-tavern-cart-total-cocina')) document.getElementById('player-tavern-cart-total-cocina').innerHTML = totalHtml;
}

async function playerTavernCheckout() {
    const user = getCurrentUser();
    if (!user || !user.id || !isPlayer()) {
        showToast('Debes estar logueado como personaje', true);
        return;
    }
    const total = playerTavernCart.reduce((s, i) => s + i.price * i.qty, 0);
    if (!playerTavernCart.length) {
        showToast('La cuenta está vacía', true);
        return;
    }
    const shop = playerShopsData.find(s => s.id === playerTavernShopId);
    const doc = await db.collection('players').doc(user.id).get();
    if (!doc.exists) {
        showToast('No se encontró el personaje', true);
        return;
    }
    const data = doc.data();
    const oro = (data.oro != null ? data.oro : 0);
    if (oro < total) {
        showToast('No tienes suficiente oro. Tienes ' + oro.toLocaleString() + ' GP.', true);
        return;
    }
    const receiptItems = playerTavernCart.map(row => {
        const name = row.name || 'Item';
        const line = row.qty > 1 ? (row.price * row.qty) + ' GP (' + row.qty + ' × ' + row.price + ')' : row.price + ' GP';
        return { name, line };
    });
    const inventario = Array.isArray(data.inventario) ? data.inventario.slice() : [];
    const items = getTavernItems();
    const shopTipo = (shop && shop.tipo ? shop.tipo : 'taberna').toString().toLowerCase();
    for (const row of playerTavernCart) {
        if (row.type === 'entry') {
            // Las entradas no se agregan al inventario
            continue;
        }
        const it = items.find(i => i.id === row.id);
        if (!it) continue;
        for (let q = 0; q < row.qty; q++) inventario.push({ name: it.name, price: it.price, effect: it.effect || '', rarity: 'común', shopTipo });
    }
    const newOro = oro - total;
    await db.collection('players').doc(user.id).update({ oro: newOro, inventario });
    
    // Guardar transacción para cada item comprado en la taberna
    for (const row of playerTavernCart) {
        const it = items.find(i => i.id === row.id);
        if (!it) continue;
        const itemName = it.name || 'Item';
        const itemPrice = (it.price != null ? it.price : 0) * (row.qty || 1);
        const cityInfo = getCityInfoForShop(shop);
        await db.collection('transactions').add({
            tipo: 'compra',
            itemName: (row.qty > 1 ? row.qty + '× ' : '') + itemName,
            playerId: user.id,
            playerName: user.nombre || 'Jugador',
            shopName: shop.nombre || 'Taberna',
            precio: itemPrice,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            ...cityInfo
        });
    }
    
    playerTavernCart = [];
    renderTavernCart();
    document.getElementById('player-tavern-oro-display').textContent = newOro.toLocaleString();
    const bodyEl = document.getElementById('player-tavern-body');
    const recEl = document.getElementById('player-tavern-receipt');
    if (bodyEl) bodyEl.style.display = 'none';
    if (recEl) {
        recEl.innerHTML = buildShopReceiptHTML({
            shopName: (shop && shop.nombre) ? shop.nombre : 'Taberna',
            logo: '🍺',
            subtitle: 'Recibo de cuenta',
            items: receiptItems,
            totalLabel: 'TOTAL:',
            totalValue: total.toLocaleString() + ' GP',
            footerThanks: '¡Gracias! Que la taberna te acoja de nuevo.',
            modalId: 'player-tavern-modal'
        });
        recEl.style.display = 'block';
    }
    showToast('Cuenta pagada. ' + total + ' GP descontados.');
}

async function showDashboard() {
    const user = getCurrentUser();
    if (user && isDM()) {
        document.getElementById('player-view-container').style.display = 'none';
        document.getElementById('main-container').style.display = 'block';
        document.getElementById('login-modal').classList.remove('active');
        const dmNameEl = document.getElementById('dm-header-name');
        if (dmNameEl) dmNameEl.textContent = user.nombre || '—';
        if (typeof loadPlayers === 'function') loadPlayers();
        if (typeof loadWorld === 'function') {
            console.log('Llamando loadWorld desde showDashboard');
            loadWorld();
            // También intentar renderizar después de un delay por si acaso
            setTimeout(function() {
                if (typeof renderCities === 'function') {
                    console.log('Renderizando ciudades después del delay');
                    renderCities();
                }
            }, 1000);
        } else {
            console.error('loadWorld no está definido');
        }
        if (typeof loadTransactions === 'function') loadTransactions();
        if (typeof loadNotificationRecipients === 'function') loadNotificationRecipients();
        if (typeof loadDMNotifications === 'function') loadDMNotifications();
        loadMapImage();
    } else {
        showLoginModal();
    }
}


// ==================== INITIALIZE ====================
document.addEventListener('DOMContentLoaded', function() {
    if (checkAuth()) {
        if (isDM()) showDashboard();
        else if (isPlayer()) showPlayerView();
        else showLoginModal();
    } else {
        showLoginModal();
    }
});

// ==================== MENÚ HAMBURGUESA (MÓVIL) ====================
function toggleMobileNav(view) {
    const prefix = view === 'dm' ? 'dm' : 'player';
    const overlay = document.getElementById(prefix + '-nav-overlay');
    const wrapper = document.getElementById(prefix + '-nav-wrapper');
    if (!overlay || !wrapper) return;
    const isOpen = wrapper.classList.contains('open');
    if (isOpen) {
        closeMobileNav(view);
    } else {
        overlay.classList.add('open');
        wrapper.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        if (window.innerWidth <= 768) document.body.style.overflow = 'hidden';
    }
}

function closeMobileNav(view) {
    const prefix = view === 'dm' ? 'dm' : 'player';
    const overlay = document.getElementById(prefix + '-nav-overlay');
    const wrapper = document.getElementById(prefix + '-nav-wrapper');
    if (overlay) {
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
    }
    if (wrapper) wrapper.classList.remove('open');
    document.body.style.overflow = '';
}

// ==================== SUB-TABS CARTAS (JUGADOR) ====================
function switchPlayerNotificationsSubtab(subtabId) {
    const section = document.getElementById('player-notifications');
    if (!section) return;
    const subtabs = section.querySelectorAll('.player-notifications-subtab');
    const cartasDestinoPanel = document.getElementById('player-notifications-cartas-destino-panel');
    const cartasPanel = document.getElementById('player-notifications-cartas-panel');
    const historialPanel = document.getElementById('player-notifications-historial-panel');
    if (!subtabs.length) return;
    subtabs.forEach(t => {
        t.classList.toggle('active', t.getAttribute('data-subtab') === subtabId);
    });
    if (cartasDestinoPanel) cartasDestinoPanel.style.display = subtabId === 'cartas-destino' ? 'block' : 'none';
    if (cartasPanel) cartasPanel.style.display = subtabId === 'cartas' ? 'block' : 'none';
    if (historialPanel) historialPanel.style.display = subtabId === 'historial' ? 'block' : 'none';
    if (subtabId === 'cartas-destino' && typeof loadPlayerCartasDestino === 'function') loadPlayerCartasDestino();
    if (subtabId === 'cartas' && typeof loadPlayerNotifications === 'function') loadPlayerNotifications();
}

// Sub-tabs de Notificaciones (DM): Enviar | Historial | Mensajes automáticos
function switchDMNotificationsSubtab(subtabId) {
    const section = document.getElementById('notifications');
    if (!section) return;
    const subtabs = section.querySelectorAll('.dm-notifications-subtab');
    const enviarPanel = document.getElementById('dm-notifications-enviar-panel');
    const historialPanel = document.getElementById('dm-notifications-historial-panel');
    const automationPanel = document.getElementById('dm-notifications-automation-panel');
    if (!subtabs.length || !enviarPanel || !historialPanel || !automationPanel) return;
    subtabs.forEach(t => {
        t.classList.toggle('active', t.getAttribute('data-dm-subtab') === subtabId);
    });
    enviarPanel.style.display = subtabId === 'enviar' ? 'block' : 'none';
    historialPanel.style.display = subtabId === 'historial' ? 'block' : 'none';
    automationPanel.style.display = subtabId === 'automation' ? 'block' : 'none';
    if (subtabId === 'automation' && typeof loadAutomationRulesList === 'function') loadAutomationRulesList();
}

// ==================== NAVIGATION ====================
// Tabs por contenedor: solo se activan los del mismo panel (DM o Personaje)
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        const container = tab.closest('#main-container') || tab.closest('#player-view-container');
        // En móvil, cerrar menú hamburguesa al tocar cualquier opción
        if (window.innerWidth <= 768 && container) {
            closeMobileNav(container.id === 'main-container' ? 'dm' : 'player');
        }
        // Si se hace clic en el tab de ciudades, forzar renderizado
        const tabName = tab.getAttribute('data-tab');
        if (tabName === 'cities' && typeof renderCities === 'function') {
            console.log('Tab de ciudades clickeado, forzando renderizado...');
            setTimeout(function() {
                renderCities();
            }, 100);
        }
        if (!tab.dataset.tab) return; // ej. botón "+ DM", Home, Battle Tracker
        if (!container) return;
        const nav = container.querySelector('.nav-tabs');
        const targetSection = document.getElementById(tab.dataset.tab);
        if (!nav || !targetSection || !container.contains(targetSection)) return;
        nav.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        targetSection.classList.add('active');
        
        // Si se hace clic en el tab de ciudades, forzar renderizado
        if (tab.dataset.tab === 'cities' && typeof renderCities === 'function') {
            console.log('Tab de ciudades activado, forzando renderizado...');
            setTimeout(function() {
                renderCities();
            }, 200);
        }
        
        // Si se hace clic en el tab CDD & Correo, cargar Cartas del destino (panel por defecto) y notificaciones
        if (tab.dataset.tab === 'player-notifications') {
            if (typeof loadPlayerCartasDestino === 'function') loadPlayerCartasDestino();
            if (typeof loadPlayerNotifications === 'function') loadPlayerNotifications();
        }
        // Si se hace clic en el tab Home, cargar contenido de Mi Casa
        if (tab.dataset.tab === 'player-home' && typeof loadMiCasaContent === 'function') {
            loadMiCasaContent();
        }
        
        // Si se hace clic en el tab de notificaciones del DM, cargar destinatarios y historial
        if (tab.dataset.tab === 'notifications') {
            if (typeof loadNotificationRecipients === 'function') loadNotificationRecipients();
            if (typeof loadDMNotifications === 'function') loadDMNotifications();
        }
    });
});

// ==================== UTILITIES ====================
function showToast(msg, err = false) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show' + (err ? ' error' : '');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function openModal(id) { 
    document.getElementById(id).classList.add('active'); 
}

function closeModal(id) { 
    document.getElementById(id).classList.remove('active');
    
    // Limpiar campos específicos del modal de importación de tiendas
    if (id === 'import-shops-modal') {
        var cityIdEl = document.getElementById('import-shops-city-id');
        var fileInput = document.querySelector('#import-shops-modal input[type="file"]');
        if (cityIdEl) cityIdEl.value = '';
        if (fileInput) fileInput.value = '';
    }
}

// Cargar Cartas del destino del jugador (cartas que el DM le asignó) y mensaje general
function loadPlayerCartasDestino() {
    const user = getCurrentUser();
    if (!user || !user.id || !isPlayer()) return;
    const list = document.getElementById('player-cartas-destino-list');
    const mensajeEl = document.getElementById('player-cartas-destino-mensaje');
    if (!list) return;
    list.innerHTML = '<p style="color:#8b7355; text-align:center; padding:20px;">Cargando cartas...</p>';
    if (mensajeEl) mensajeEl.innerHTML = '';
    db.collection('players').doc(user.id).get().then(doc => {
        const data = doc.exists ? doc.data() : {};
        const cartas = Array.isArray(data.cartasDestino) ? data.cartasDestino : [];
        const mensaje = (data.mensajeGeneralCartasDestino || '').trim();
        if (mensajeEl) {
            if (mensaje) {
                const escaped = mensaje.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                mensajeEl.innerHTML = '<div class="player-cartas-destino-mensaje-general-content">' + escaped.replace(/\n/g, '<br>') + '</div>';
                mensajeEl.style.display = 'block';
            } else {
                mensajeEl.innerHTML = '';
                mensajeEl.style.display = 'none';
            }
        }
        if (!cartas.length) {
            list.innerHTML = '<p style="color:#8b7355; text-align:center; padding:40px 20px; font-style:italic;">El DM aún no te ha asignado cartas del destino.</p>';
            return;
        }
        list.innerHTML = cartas.map((c, i) => {
            const titulo = c.titulo || ('Carta ' + (i + 1));
            let imgHtml;
            if (c.imagenUrl) {
                const q = c.imagenUrl.replace(/"/g, '&quot;');
                imgHtml = `<img src="${q}" alt="" class="player-carta-destino-img" onerror="this.style.display='none'; var ph=this.parentElement.querySelector('.player-carta-destino-placeholder'); if(ph) ph.style.display='flex';"><div class="player-carta-destino-placeholder" style="display:none;">🃏</div>`;
            } else {
                imgHtml = '<div class="player-carta-destino-placeholder">🃏</div>';
            }
            return `<div class="player-carta-destino-card">
                <div class="player-carta-destino-img-wrap">${imgHtml}</div>
                <div class="player-carta-destino-info">
                    <h4 class="player-carta-destino-titulo">${titulo.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h4>
                </div>
            </div>`;
        }).join('');
    }).catch(() => {
        list.innerHTML = '<p style="color:#8b7355; text-align:center; padding:20px;">Error al cargar cartas.</p>';
        if (mensajeEl) mensajeEl.innerHTML = '';
    });
}

// Carga el contenido de Mi Casa (usado al abrir la pestaña Home o desde el directorio)
function loadMiCasaContent() {
    const user = getCurrentUser();
    if (!user || !user.id || !isPlayer()) {
        showToast('Debes estar logueado como aventurero', true);
        return Promise.reject();
    }
    return db.collection('players').doc(user.id).get().then(doc => {
        const playerData = doc.exists ? doc.data() : {};
        const casaInfo = playerData.casa || {};
        const imagenContainer = document.getElementById('mi-casa-imagen-container');
        if (!imagenContainer) return;
        if (casaInfo.imagenUrl) {
            imagenContainer.innerHTML = `<img src="${casaInfo.imagenUrl.replace(/"/g, '&quot;')}" alt="${(casaInfo.nombre || 'Home').replace(/"/g, '&quot;')}" style="width:100%; height:auto; max-height:600px; object-fit:cover; display:block;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div id=\\'mi-casa-imagen-placeholder\\' style=\\'padding:80px; color:#8b7355; font-size:4em; text-align:center;\\'><div style=\\'font-size:0.3em; margin-top:20px; color:#6b5d4a;\\'>Error al cargar la imagen</div></div>';"><div id="mi-casa-imagen-placeholder" style="display:none;"></div>`;
        } else {
            imagenContainer.innerHTML = '<div id="mi-casa-imagen-placeholder" style="padding:80px; color:#8b7355; font-size:4em; text-align:center;"><div style="font-size:0.3em; margin-top:20px; color:#6b5d4a;">El DM aún no ha agregado una imagen</div></div>';
        }
        const nombreEl = document.getElementById('mi-casa-nombre-display');
        if (nombreEl) nombreEl.textContent = casaInfo.nombre || 'Home';
        const descEl = document.getElementById('mi-casa-descripcion-display');
        if (descEl) descEl.textContent = casaInfo.descripcion || 'El DM aún no ha agregado una descripción para tu casa.';
        const ubicacionEl = document.getElementById('mi-casa-ubicacion-display');
        if (ubicacionEl) ubicacionEl.textContent = casaInfo.ubicacion || 'No especificada';
        const notasDmEl = document.getElementById('mi-casa-notas-dm-display');
        if (notasDmEl) notasDmEl.textContent = casaInfo.notas || 'No hay notas del DM.';
        const notasPersonalesEl = document.getElementById('mi-casa-notas-personales');
        if (notasPersonalesEl) notasPersonalesEl.value = casaInfo.notasPersonales || '';
    }).catch(err => {
        console.error('Error cargando información de la casa:', err);
        showToast('Error al cargar información de tu casa', true);
    });
}

// Ir a la pestaña Home y cargar contenido (desde directorio u otro lugar)
window.openMiCasaModal = function() {
    if (!getCurrentUser() || !isPlayer()) {
        showToast('Debes estar logueado como aventurero', true);
        return;
    }
    const container = document.getElementById('player-view-container');
    if (!container) return;
    const nav = container.querySelector('.nav-tabs');
    const homeTab = container.querySelector('.nav-tab[data-tab="player-home"]');
    const homeSection = document.getElementById('player-home');
    if (nav && homeTab && homeSection) {
        nav.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        homeTab.classList.add('active');
        homeSection.classList.add('active');
        loadMiCasaContent();
    }
}

window.saveMiCasaNotas = function() {
    const user = getCurrentUser();
    if (!user || !user.id || !isPlayer()) {
        showToast('Debes estar logueado como aventurero', true);
        return;
    }
    
    const notasPersonales = document.getElementById('mi-casa-notas-personales').value.trim();
    
    // Obtener datos existentes para preservar la información del DM
    db.collection('players').doc(user.id).get().then(doc => {
        const playerData = doc.exists ? doc.data() : {};
        const casaExistente = playerData.casa || {};
        
        const casaData = {
            ...casaExistente, // Preservar toda la información del DM
            notasPersonales: notasPersonales // Solo actualizar las notas personales
        };
        
        return db.collection('players').doc(user.id).update({
            casa: casaData,
            casaUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }).then(() => {
        showToast('Tus notas personales guardadas');
    }).catch(err => {
        console.error('Error guardando notas:', err);
        showToast('Error al guardar tus notas', true);
    });
}

function togglePlayersCard() {
    document.getElementById('players-card').classList.toggle('expanded');
}
