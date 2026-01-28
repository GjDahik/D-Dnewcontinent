// ==================== TRANSACTIONS ====================
function loadTransactions() {
    db.collection('transactions').orderBy('fecha', 'desc').limit(50).onSnapshot(snap => {
        const list = document.getElementById('transactions-list');
        if (snap.empty) {
            list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📜</div><p>No hay transacciones</p></div>';
            return;
        }
        list.innerHTML = '<div class="cards-grid">';
        snap.forEach(doc => {
            const t = doc.data();
            const fecha = t.fecha?.toDate?.() || new Date();
            const tipo = t.tipo || 'compra';
            const tipoLabel = tipo === 'compra' ? 'Compra' : tipo === 'venta' ? 'Venta' : tipo === 'deposito' ? 'Depósito' : tipo === 'retiro' ? 'Retiro' : tipo === 'hospedaje' ? 'Hospedaje' : 'Uso';
            const tipoClass = tipo === 'compra' ? '' : tipo === 'venta' ? 'tipo-venta' : tipo === 'deposito' ? 'tipo-deposito' : tipo === 'retiro' ? 'tipo-retiro' : tipo === 'hospedaje' ? 'tipo-hospedaje' : 'tipo-uso';
            let body = '';
            if (tipo === 'compra') {
                body = `
                        <div class="card-stat">
                            <span class="card-stat-label">👤 Comprador</span>
                            <span class="card-stat-value">${t.playerName || 'Desconocido'}</span>
                        </div>
                        <div class="card-stat">
                            <span class="card-stat-label">🏪 Tienda</span>
                            <span class="card-stat-value">${t.shopName || 'Desconocida'}</span>
                        </div>
                        <div class="card-stat">
                            <span class="card-stat-label">💰 Precio</span>
                            <span class="card-stat-value gold-value">${t.precio} GP</span>
                        </div>`;
            } else if (tipo === 'venta') {
                body = `
                        <div class="card-stat">
                            <span class="card-stat-label">👤 Vendido por</span>
                            <span class="card-stat-value">${t.playerName || 'Desconocido'}</span>
                        </div>
                        <div class="card-stat">
                            <span class="card-stat-label">🏪 Concepto</span>
                            <span class="card-stat-value">Venta</span>
                        </div>
                        <div class="card-stat">
                            <span class="card-stat-label">💰 Ingreso</span>
                            <span class="card-stat-value gold-value">${t.precio} GP</span>
                        </div>`;
            } else if (tipo === 'deposito') {
                body = `
                        <div class="card-stat">
                            <span class="card-stat-label">👤 Depositado por</span>
                            <span class="card-stat-value">${t.playerName || 'Desconocido'}</span>
                        </div>
                        <div class="card-stat">
                            <span class="card-stat-label">🏦 Banco</span>
                            <span class="card-stat-value">${t.shopName || 'Banco'}</span>
                        </div>
                        <div class="card-stat">
                            <span class="card-stat-label">💰 Cantidad</span>
                            <span class="card-stat-value gold-value">${t.precio} GP</span>
                        </div>`;
            } else if (tipo === 'retiro') {
                const comision = t.comision != null ? t.comision : 0;
                body = `
                        <div class="card-stat">
                            <span class="card-stat-label">👤 Retirado por</span>
                            <span class="card-stat-value">${t.playerName || 'Desconocido'}</span>
                        </div>
                        <div class="card-stat">
                            <span class="card-stat-label">🏦 Banco</span>
                            <span class="card-stat-value">${t.shopName || 'Banco'}</span>
                        </div>
                        <div class="card-stat">
                            <span class="card-stat-label">💰 Recibido</span>
                            <span class="card-stat-value gold-value">${t.precio} GP</span>
                        </div>
                        ${comision > 0 ? `<div class="card-stat">
                            <span class="card-stat-label">📉 Comisión (2%)</span>
                            <span class="card-stat-value">${comision} GP</span>
                        </div>` : ''}`;
            } else if (tipo === 'hospedaje') {
                body = `
                        <div class="card-stat">
                            <span class="card-stat-label">👤 Huésped</span>
                            <span class="card-stat-value">${t.playerName || 'Desconocido'}</span>
                        </div>
                        <div class="card-stat">
                            <span class="card-stat-label">🏨 Posada</span>
                            <span class="card-stat-value">${t.shopName || 'Posada'}</span>
                        </div>
                        <div class="card-stat">
                            <span class="card-stat-label">💰 Precio/noche</span>
                            <span class="card-stat-value gold-value">${t.precio} GP</span>
                        </div>`;
            } else {
                body = `
                        <div class="card-stat">
                            <span class="card-stat-label">👤 Usado por</span>
                            <span class="card-stat-value">${t.playerName || 'Desconocido'}</span>
                        </div>
                        <div class="card-stat">
                            <span class="card-stat-label">📌 Tipo</span>
                            <span class="card-stat-value">Uso (consumido)</span>
                        </div>`;
            }
            list.innerHTML += `
                <div class="card ${tipoClass}">
                    <div class="card-header">
                        <div>
                            <span class="tipo-badge tipo-${tipo}">${tipoLabel}</span>
                            <div class="card-title">${t.itemName}</div>
                            <div class="card-subtitle">${fecha.toLocaleDateString('es')} ${fecha.toLocaleTimeString('es', {hour:'2-digit',minute:'2-digit'})}</div>
                        </div>
                    </div>
                    <div class="card-body">${body}</div>
                </div>`;
        });
        list.innerHTML += '</div>';
    });
}

// Initialize
loadTransactions();
