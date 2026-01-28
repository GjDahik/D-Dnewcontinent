// ==================== PLAYERS ====================
function loadPlayers() {
    db.collection('players').onSnapshot(snap => {
        playersData = [];
        snap.forEach(doc => playersData.push({ id: doc.id, ...doc.data() }));
        renderPlayers();
    });
}

function renderPlayers() {
    const container = document.getElementById('players-list');
    document.getElementById('players-count').textContent = playersData.length + ' jugador' + (playersData.length !== 1 ? 'es' : '');
    
    if (!playersData.length) {
        container.innerHTML = '<p style="color:#a89a8c;padding:10px;">No hay jugadores. ¡Crea el primero!</p>';
        return;
    }
    container.innerHTML = '';
    playersData.forEach(p => {
        const bancoBalance = (p.bancoBalance != null ? p.bancoBalance : 0);
        container.innerHTML += `
            <div class="mini-card">
                <div class="mini-card-title">⚔️ ${p.nombre}</div>
                <div class="mini-card-info">${p.clase} • Nivel ${p.nivel}</div>
                <div class="mini-card-info gold-value">💰 ${p.oro.toLocaleString()} GP</div>
                <div class="mini-card-info gold-value" style="color:#5a8a5a;">🏦 ${bancoBalance.toLocaleString()} GP</div>
                <div class="mini-card-info">🔐 PIN: ${p.pin}</div>
                <div class="mini-card-info">🎒 Items: ${(p.inventario || []).length}</div>
                <div style="margin-top:10px;font-size:0.85em;color:#a89a8c;">${p.notas || 'Sin notas'}</div>
                <div class="mini-card-actions" style="margin-top:10px;">
                    <button class="btn btn-small" onclick="openGoldModal('${p.id}', '${p.nombre}', ${p.oro})">💰</button>
                    <button class="btn btn-small" onclick="openBancoModal('${p.id}', '${p.nombre}', ${bancoBalance})" style="background:linear-gradient(180deg, #5a8a5a 0%, #4a7a4a 100%);">🏦</button>
                    <button class="btn btn-small" onclick="openPlayerCasaModal('${p.id}', '${(p.nombre || '').replace(/'/g, "\\'")}')" style="background:linear-gradient(180deg, #8b5a2b 0%, #6b4a1b 100%);">🏠</button>
                    <button class="btn btn-small btn-secondary" onclick="editPlayer('${p.id}')">✏️</button>
                    <button class="btn btn-small btn-danger" onclick="deletePlayer('${p.id}', '${p.nombre}')">🗑️</button>
                </div>
            </div>`;
    });
}

function openPlayerModal() {
    document.getElementById('player-id').value = '';
    document.getElementById('player-nombre').value = '';
    document.getElementById('player-clase').value = 'Guerrero';
    document.getElementById('player-nivel').value = 1;
    document.getElementById('player-oro').value = 100;
    document.getElementById('player-pin').value = '';
    document.getElementById('player-notas').value = '';
    document.getElementById('player-modal-title').textContent = '✨ Nuevo Jugador';
    openModal('player-modal');
}

function editPlayer(id) {
    db.collection('players').doc(id).get().then(doc => {
        const p = doc.data();
        document.getElementById('player-id').value = id;
        document.getElementById('player-nombre').value = p.nombre;
        document.getElementById('player-clase').value = p.clase;
        document.getElementById('player-nivel').value = p.nivel;
        document.getElementById('player-oro').value = p.oro;
        document.getElementById('player-pin').value = p.pin;
        document.getElementById('player-notas').value = p.notas || '';
        document.getElementById('player-modal-title').textContent = '✏️ Editar Jugador';
        openModal('player-modal');
    });
}

function savePlayer() {
    const id = document.getElementById('player-id').value;
    const data = {
        nombre: document.getElementById('player-nombre').value,
        clase: document.getElementById('player-clase').value,
        nivel: parseInt(document.getElementById('player-nivel').value),
        oro: parseInt(document.getElementById('player-oro').value),
        pin: document.getElementById('player-pin').value,
        notas: document.getElementById('player-notas').value
    };
    if (!id) {
        data.inventario = [];
        data.bancoBalance = 0; // Inicializar balance del banco en 0 para nuevos jugadores
    }
    if (!data.nombre || !data.pin) { showToast('Nombre y PIN requeridos', true); return; }
    (id ? db.collection('players').doc(id).update(data) : db.collection('players').add(data))
        .then(() => { showToast(id ? 'Jugador actualizado' : 'Jugador creado'); closeModal('player-modal'); })
        .catch(e => showToast('Error: ' + e.message, true));
}

function deletePlayer(id, nombre) {
    if (confirm(`¿Eliminar a ${nombre}?`))
        db.collection('players').doc(id).delete().then(() => showToast('Jugador eliminado'));
}

function openGoldModal(id, nombre, oro) {
    document.getElementById('gold-player-id').value = id;
    document.getElementById('gold-player-name').textContent = nombre;
    document.getElementById('gold-current').textContent = oro.toLocaleString() + ' GP';
    document.getElementById('gold-amount').value = 0;
    const player = playersData.find(p => p.id === id);
    document.getElementById('gold-modal-items-count').textContent = (player?.inventario || []).length;
    openModal('gold-modal');
}

function adjustGold() {
    const id = document.getElementById('gold-player-id').value;
    const op = document.getElementById('gold-operation').value;
    const amt = parseInt(document.getElementById('gold-amount').value);
    db.collection('players').doc(id).get().then(doc => {
        let g = doc.data().oro;
        if (op === 'add') g += amt;
        else if (op === 'subtract') g = Math.max(0, g - amt);
        else g = amt;
        return db.collection('players').doc(id).update({ oro: g });
    }).then(() => { showToast('Oro actualizado'); closeModal('gold-modal'); });
}

function openBancoModal(id, nombre, bancoBalance) {
    document.getElementById('banco-player-id').value = id;
    document.getElementById('banco-player-name').textContent = nombre;
    document.getElementById('banco-current').textContent = bancoBalance.toLocaleString() + ' GP';
    document.getElementById('banco-amount').value = 0;
    openModal('banco-modal');
}

function adjustBanco() {
    const id = document.getElementById('banco-player-id').value;
    const op = document.getElementById('banco-operation').value;
    const amt = parseInt(document.getElementById('banco-amount').value);
    db.collection('players').doc(id).get().then(doc => {
        const data = doc.data();
        let b = (data.bancoBalance != null ? data.bancoBalance : 0);
        if (op === 'add') b += amt;
        else if (op === 'subtract') b = Math.max(0, b - amt);
        else b = amt;
        return db.collection('players').doc(id).update({ bancoBalance: b });
    }).then(() => { showToast('Balance del banco actualizado'); closeModal('banco-modal'); });
}

// ==================== PLAYER INVENTORY ====================
function openPlayerInventory(playerId) {
    const player = playersData.find(p => p.id === playerId);
    if (!player) return;

    document.getElementById('player-inventory-id').value = playerId;
    document.getElementById('player-inventory-name').textContent = player.nombre;
    document.getElementById('player-inventory-gold').textContent = '💰 ' + player.oro.toLocaleString() + ' GP';
    document.getElementById('player-inventory-title').textContent = '🎒 Inventario - ' + player.nombre;

    renderPlayerInventory(player);
    openModal('player-inventory-modal');
}

function renderPlayerInventory(player) {
    const list = document.getElementById('player-inventory-list');
    const items = player.inventario || [];

    if (items.length === 0) {
        list.innerHTML = '<p style="color:#8b7355; text-align:center; padding:30px;">El inventario está vacío</p>';
        return;
    }

    const rarityColors = {
        'común': '#2ecc71',
        'infrecuente': '#3498db',
        'rara': '#9b59b6',
        'legendaria': '#e74c3c'
    };

    list.innerHTML = items.map((item, index) => `
        <div class="mini-card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="flex:1;">
                <div class="mini-card-title" style="display:flex; align-items:center; gap:10px;">
                    ${item.name}
                    <span style="background:${rarityColors[item.rarity] || '#888'}; padding:2px 8px; border-radius:10px; font-size:0.7em; text-transform:uppercase;">${item.rarity || 'común'}</span>
                </div>
                <div class="mini-card-info">${item.effect || 'Sin descripción'}</div>
                ${item.price ? `<div style="color:#f1c40f; font-size:0.85em;">Valor: ${item.price} GP</div>` : ''}
            </div>
            <div class="mini-card-actions">
                <button class="btn btn-small btn-danger" onclick="removeItemFromPlayer(${index})" title="Quitar Item">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openGiveItemModal() {
    document.getElementById('give-item-name').value = '';
    document.getElementById('give-item-price').value = 0;
    document.getElementById('give-item-effect').value = '';
    document.getElementById('give-item-rarity').value = 'común';
    openModal('give-item-modal');
}

function giveItemToPlayer() {
    const playerId = document.getElementById('player-inventory-id').value;
    const item = {
        name: document.getElementById('give-item-name').value,
        price: parseInt(document.getElementById('give-item-price').value) || 0,
        effect: document.getElementById('give-item-effect').value,
        rarity: document.getElementById('give-item-rarity').value
    };

    if (!item.name) {
        showToast('El nombre es requerido', true);
        return;
    }

    const player = playersData.find(p => p.id === playerId);
    let inventario = player.inventario || [];
    inventario.push(item);

    db.collection('players').doc(playerId).update({ inventario })
        .then(() => {
            showToast('Item entregado a ' + player.nombre);
            closeModal('give-item-modal');
            player.inventario = inventario;
            renderPlayerInventory(player);
        })
        .catch(e => showToast('Error: ' + e.message, true));
}

function removeItemFromPlayer(index) {
    if (!confirm('¿Quitar este item del inventario?')) return;

    const playerId = document.getElementById('player-inventory-id').value;
    const player = playersData.find(p => p.id === playerId);
    let inventario = player.inventario || [];
    
    inventario.splice(index, 1);

    db.collection('players').doc(playerId).update({ inventario })
        .then(() => {
            showToast('Item removido');
            player.inventario = inventario;
            renderPlayerInventory(player);
        })
        .catch(e => showToast('Error: ' + e.message, true));
}

function openPlayerCasaModal(playerId, playerNombre) {
    document.getElementById('dm-casa-player-id').value = playerId;
    document.getElementById('dm-casa-player-name').textContent = playerNombre;
    
    db.collection('players').doc(playerId).get().then(doc => {
        const playerData = doc.exists ? doc.data() : {};
        const casaInfo = playerData.casa || {};
        
        document.getElementById('dm-casa-nombre').value = casaInfo.nombre || '';
        document.getElementById('dm-casa-descripcion').value = casaInfo.descripcion || '';
        document.getElementById('dm-casa-ubicacion').value = casaInfo.ubicacion || '';
        document.getElementById('dm-casa-imagen-url').value = casaInfo.imagenUrl || '';
        document.getElementById('dm-casa-notas').value = casaInfo.notas || '';
        
        openModal('dm-casa-modal');
    }).catch(err => {
        console.error('Error cargando información de la casa:', err);
        showToast('Error al cargar información de la casa', true);
    });
}

function savePlayerCasa() {
    const playerId = document.getElementById('dm-casa-player-id').value;
    if (!playerId) return;
    
    // Obtener datos existentes para preservar las notas personales del jugador
    db.collection('players').doc(playerId).get().then(doc => {
        const playerData = doc.exists ? doc.data() : {};
        const casaExistente = playerData.casa || {};
        
        const casaData = {
            nombre: document.getElementById('dm-casa-nombre').value.trim(),
            descripcion: document.getElementById('dm-casa-descripcion').value.trim(),
            ubicacion: document.getElementById('dm-casa-ubicacion').value.trim(),
            imagenUrl: document.getElementById('dm-casa-imagen-url').value.trim(),
            notas: document.getElementById('dm-casa-notas').value.trim(),
            notasPersonales: casaExistente.notasPersonales || '' // Preservar notas personales del jugador
        };
        
        return db.collection('players').doc(playerId).update({
            casa: casaData,
            casaUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }).then(() => {
        showToast('Información de la casa guardada');
        closeModal('dm-casa-modal');
    }).catch(err => {
        console.error('Error guardando casa:', err);
        showToast('Error al guardar información de la casa', true);
    });
}

// Initialize
loadPlayers();
