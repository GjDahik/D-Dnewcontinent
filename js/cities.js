// ==================== HELPER: Leer archivos CSV o Excel ====================
function readFileAsText(file, callback) {
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    
    if (isExcel) {
        // Leer archivo Excel usando SheetJS
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Obtener la primera hoja
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Convertir a CSV
                const csv = XLSX.utils.sheet_to_csv(worksheet);
                callback(csv);
            } catch (error) {
                showToast('Error al leer archivo Excel: ' + error.message, true);
                console.error('Error leyendo Excel:', error);
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        // Leer archivo CSV normalmente
        const reader = new FileReader();
        reader.onload = function(e) {
            callback(e.target.result);
        };
        reader.readAsText(file);
    }
}

// ==================== CITIES + NPCs + SHOPS ====================
/** Ciudad fija "Old Mistfall": no se puede borrar desde el dashboard, solo desde la base de datos. */
const OLD_MISTFALL_CITY_NAME = 'Old Mistfall';
function isOldMistfallCity(cityOrNombre) {
    const n = (typeof cityOrNombre === 'object' ? (cityOrNombre && cityOrNombre.nombre) : cityOrNombre) || '';
    return ('' + n).trim().toLowerCase() === OLD_MISTFALL_CITY_NAME.toLowerCase();
}

function loadWorld() {
    console.log('loadWorld llamado');
    
    if (!db) {
        console.error('Error: db no está definido');
        return;
    }
    
    // Prevenir múltiples suscripciones
    if (window._worldSubscribed) {
        console.log('loadWorld ya estaba suscrito, omitiendo...');
        return;
    }
    window._worldSubscribed = true;
    
    console.log('Iniciando snapshots de Firestore...');
    
    // Cargar ciudades - usar el mismo patrón que funciona en loadPlayerWorld
    db.collection('cities').onSnapshot(snap => {
        console.log('=== SNAPSHOT DE CITIES RECIBIDO ===');
        console.log('Snapshot completo:', snap);
        console.log('Tamaño:', snap ? snap.size : 'null');
        console.log('Docs:', snap ? snap.docs : 'null');
        
        if (snap && snap.docs && snap.docs.length > 0) {
            citiesData = snap.docs.map(d => {
                const data = { id: d.id, ...d.data() };
                console.log('Ciudad mapeada:', data.nombre);
                return data;
            });
            console.log('Total ciudades en citiesData:', citiesData.length);
            console.log('Ciudades:', citiesData.map(c => c.nombre));
            
            // Forzar renderizado inmediatamente y también después de un delay
            renderCities();
            setTimeout(function() {
                renderCities();
            }, 500);
        } else {
            console.warn('No hay documentos en el snapshot o snap está vacío');
            citiesData = [];
            renderCities();
        }
    }, error => {
        console.error('ERROR en snapshot de cities:', error);
        console.error('Detalles del error:', error.code, error.message);
        if (typeof showToast === 'function') {
            showToast('Error al cargar ciudades: ' + error.message, true);
        }
    });
    
    // Cargar NPCs
    db.collection('npcs').onSnapshot(snap => {
        if (snap && snap.docs) {
            npcsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            window.npcsData = npcsData;
            renderCities();
        }
    }, error => {
        console.error('Error en snapshot de npcs:', error);
    });
    
    // Cargar tiendas
    db.collection('shops').onSnapshot(snap => {
        if (snap && snap.docs) {
            shopsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            window.shopsData = shopsData;
            renderCities();
        }
    }, error => {
        console.error('Error en snapshot de shops:', error);
    });
}

function renderCities() {
    console.log('renderCities llamado');
    
    // Usar las variables globales directamente
    const cities = citiesData || [];
    const npcs = npcsData || [];
    const shops = shopsData || [];
    
    console.log('Datos:', {
        citiesCount: cities.length,
        npcsCount: npcs.length,
        shopsCount: shops.length,
        citiesDataExists: typeof citiesData !== 'undefined',
        citiesIsArray: Array.isArray(cities)
    });
    
    // Intentar encontrar el contenedor varias veces
    let container = document.getElementById('cities-container');
    if (!container) {
        console.warn('cities-container no encontrado, esperando...');
        // Esperar un poco y volver a intentar
        setTimeout(function() {
            container = document.getElementById('cities-container');
            if (container) {
                console.log('Contenedor encontrado en segundo intento');
                renderCities();
            } else {
                console.error('ERROR: cities-container NO EXISTE en el DOM');
                // Intentar crear un mensaje de error visible
                const citiesSection = document.getElementById('cities');
                if (citiesSection) {
                    citiesSection.innerHTML += '<div style="background:red;color:white;padding:20px;margin:20px;">ERROR: El contenedor cities-container no existe</div>';
                }
            }
        }, 1000);
        return;
    }
    
    console.log('Contenedor encontrado:', container);
    
    if (!cities || !Array.isArray(cities)) {
        console.error('Error: citiesData no es un array válido');
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏘️</div><p>Error al cargar ciudades</p></div>';
        return;
    }
    
    if (!cities.length) {
        console.log('No hay ciudades en el array');
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏘️</div><p>No hay ciudades. ¡Crea la primera!</p></div>';
        return;
    }
    
    console.log('Renderizando', cities.length, 'ciudades');
    console.log('Primeras 3 ciudades:', cities.slice(0, 3));
    
    try {
        let htmlContent = '';
        cities.forEach((city, index) => {
            console.log(`Procesando ciudad ${index + 1}:`, city.nombre);
            const cityNpcs = npcs.filter(n => n.ciudadId === city.id);
            const cityShops = shops.filter(s => s.ciudadId === city.id);
        const nivelColor = city.nivel <= 2 ? '🟢' : city.nivel <= 4 ? '🟡' : city.nivel <= 5 ? '🟠' : '🔴';
        const tipoEmoji = { herreria: '⚔️', pociones: '🧪', taberna: '🍺', biblioteca: '📚', arqueria: '🏹', emporio: '🛒', batalla: '🥊', santuario: '🪞', banco: '🏦', posada: '🏨' };
        const actitudEmoji = { amigable: '😊', neutral: '😐', hostil: '😠' };

        const html = `
            <div class="city-card" id="city-${city.id}">
                <div class="city-header" onclick="toggleCity('${city.id}')">
                    ${city.imagenUrl ? `<div class="city-image" style="width:120px; height:80px; border-radius:8px; overflow:hidden; margin-right:16px; flex-shrink:0; background:#2a231c; display:flex; align-items:center; justify-content:center;"><img src="${city.imagenUrl.replace(/"/g, '&quot;')}" alt="${(city.nombre || '').replace(/"/g, '&quot;')}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='🖼️';"></div>` : ''}
                    <div class="city-info" style="flex:1;">
                        <h3>🏰 ${city.nombre}</h3>
                        <p>${city.descripcion || 'Sin descripción'}</p>
                    </div>
                    <div class="city-meta">
                        <span>${nivelColor} Nivel ${city.nivel}</span>
                        <span>🎭 ${cityNpcs.length}</span>
                        <span>🛒 ${cityShops.length}</span>
                        <span class="city-toggle">▼</span>
                    </div>
                </div>
                <div class="city-actions" style="flex-wrap:wrap; align-items:center;">
                    <button class="btn btn-small" onclick="event.stopPropagation(); openNpcModal('${city.id}')">+ NPC</button>
                    <button class="btn btn-small" onclick="event.stopPropagation(); openShopModal('${city.id}')">+ Tienda</button>
                    <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); openImportShopsModal('${city.id}')">📤 Importar Tiendas</button>
                    <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); openImportNpcsModal('${city.id}')">📤 Importar NPCs</button>
                    <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); editCity('${city.id}')">✏️</button>
                    ${!isOldMistfallCity(city) ? `<button class="btn btn-small btn-danger" onclick="event.stopPropagation(); deleteCity('${city.id}', '${(city.nombre || '').replace(/'/g, "\\'")}')">🗑️</button>` : '<span class="btn btn-small btn-secondary" style="opacity:0.7; cursor:not-allowed;" title="Old Mistfall solo puede eliminarse desde la base de datos">🗑️</span>'}
                    <button class="btn btn-small ${(city.visibleToPlayers !== false) ? 'btn-success' : 'btn-secondary'}" onclick="event.stopPropagation(); toggleCityVisibility('${city.id}')" title="${(city.visibleToPlayers !== false) ? 'Visible para jugadores. Clic para ocultar.' : 'Oculta para jugadores. Clic para mostrar.'}">${(city.visibleToPlayers !== false) ? '👁️ Visible' : '👁️‍🗨️ Oculta'}</button>
                    <div style="display:flex; align-items:center; gap:8px; margin-left:auto;">
                        <span style="color:#8b7355; font-size:0.9em; white-space:nowrap;">Est. recomendado:</span>
                        <select onchange="setEstablecimientoRecomendado('${city.id}', this.value)" style="background:#1a1a1a; border:1px solid #4a3c31; color:#d4c4a8; padding:6px 10px; border-radius:4px; font-size:0.9em; min-width:140px;">
                            <option value="">Ninguno</option>
                            ${cityShops.map(s => `<option value="${s.id}" ${(city.establecimientoRecomendadoId === s.id) ? 'selected' : ''}>${(s.nombre || 'Tienda').replace(/"/g, '&quot;')}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="city-content">
                    <div class="subsection">
                        <div class="subsection-header">
                            <h4>🎭 NPCs (${cityNpcs.length})</h4>
                        </div>
                        <div class="mini-cards">
                            ${cityNpcs.length ? cityNpcs.map(n => `
                                <div class="mini-card">
                                    <div class="mini-card-title">${n.nombre}</div>
                                    <div class="mini-card-info">${n.rol} • ${actitudEmoji[n.actitud] || ''} ${n.actitud}</div>
                                    <div class="mini-card-actions">
                                        <button class="btn btn-small btn-secondary" onclick="editNpc('${n.id}')">✏️</button>
                                        <button class="btn btn-small btn-danger" onclick="deleteNpc('${n.id}', '${n.nombre}')">🗑️</button>
                                    </div>
                                </div>
                            `).join('') : '<p style="color:#a89a8c;padding:10px;">Sin NPCs</p>'}
                        </div>
                    </div>
                    <div class="subsection">
                        <div class="subsection-header">
                            <h4>🛒 Tiendas (${cityShops.length})</h4>
                        </div>
                        <div class="mini-cards">
                            ${cityShops.length ? cityShops.map(s => {
                                const owner = npcs.find(n => n.id === s.npcDueno);
                                const isSantuario = (s.tipo || '').toLowerCase() === 'santuario';
                                const isBanco = (s.tipo || '').toLowerCase() === 'banco';
                                const isPosada = (s.tipo || '').toLowerCase() === 'posada';
                                const sinInventario = isSantuario || isBanco || isPosada;
                                return `
                                <div class="mini-card">
                                    <div class="mini-card-title">${tipoEmoji[s.tipo] || '🏪'} ${s.nombre}</div>
                                    <div class="mini-card-info">${s.tipo} ${owner ? '• ' + owner.nombre : ''}${sinInventario ? ' <span style="color:#8b7355; font-size:0.85em;">(sin inventario)</span>' : ''}</div>
                                    <div class="mini-card-actions">
                                        ${!sinInventario ? `<button class="btn btn-small" onclick="manageInventory('${s.id}')">📦</button>` : ''}
                                        <button class="btn btn-small btn-secondary" onclick="editShop('${s.id}')">✏️</button>
                                        <button class="btn btn-small btn-danger" onclick="deleteShop('${s.id}', '${s.nombre}')">🗑️</button>
                                    </div>
                                </div>`;
                            }).join('') : '<p style="color:#a89a8c;padding:10px;">Sin tiendas</p>'}
                        </div>
                    </div>
                </div>
            </div>`;
            htmlContent += html;
        });
        
        console.log('HTML generado, longitud:', htmlContent.length);
        container.innerHTML = htmlContent;
        console.log('Ciudades renderizadas exitosamente. Contenedor ahora tiene:', container.children.length, 'elementos hijos');
    } catch (error) {
        console.error('Error renderizando ciudades:', error);
        console.error('Stack trace:', error.stack);
        if (container) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>Error al renderizar ciudades: ' + error.message + '</p><p style="font-size:0.8em;color:#888;">Revisa la consola para más detalles</p></div>';
        }
    }
}

// Hacer funciones globalmente accesibles
window.renderCities = renderCities;
window.loadWorld = loadWorld;

// Función de diagnóstico que se puede llamar desde la consola
window.debugCities = function() {
    console.log('=== DIAGNÓSTICO DE CIUDADES ===');
    console.log('citiesData:', citiesData);
    console.log('window.citiesData:', window.citiesData);
    console.log('Número de ciudades:', (citiesData || []).length);
    console.log('Contenedor existe:', !!document.getElementById('cities-container'));
    console.log('db existe:', typeof db !== 'undefined');
    console.log('loadWorld existe:', typeof loadWorld !== 'function');
    console.log('renderCities existe:', typeof renderCities === 'function');
    
    const container = document.getElementById('cities-container');
    if (container) {
        console.log('Contenedor encontrado, contenido actual:', container.innerHTML.length, 'caracteres');
    }
    
    // Intentar renderizar manualmente
    if (typeof renderCities === 'function') {
        console.log('Intentando renderizar ciudades...');
        renderCities();
    }
    
    // Intentar cargar manualmente
    if (typeof loadWorld === 'function' && typeof db !== 'undefined') {
        console.log('Intentando cargar ciudades desde Firestore...');
        db.collection('cities').get().then(snap => {
            console.log('Ciudades en Firestore:', snap.size);
            snap.forEach(doc => {
                console.log('Ciudad:', doc.id, doc.data());
            });
        });
    }
};

function toggleCity(id) {
    document.getElementById('city-' + id).classList.toggle('expanded');
}

function setEstablecimientoRecomendado(cityId, shopId) {
    var payload = { establecimientoRecomendadoId: shopId || null };
    db.collection('cities').doc(cityId).update(payload).then(function() {
        showToast(shopId ? 'Establecimiento recomendado actualizado' : 'Recomendado quitado');
    }).catch(function(e) { showToast('Error: ' + (e.message || e), true); });
}

function toggleCityVisibility(cityId) {
    const cities = window.citiesData || citiesData || [];
    var city = cities.find(function(c) { return c.id === cityId; });
    if (!city) return;
    var next = city.visibleToPlayers === false;
    db.collection('cities').doc(cityId).update({ visibleToPlayers: next }).then(function() {
        showToast(next ? 'Ciudad visible para jugadores' : 'Ciudad oculta para jugadores');
    }).catch(function(e) { showToast('Error: ' + (e.message || e), true); });
}

// ==================== IMPORT SHOPS CSV ====================
function openImportShopsModal(cityId) {
    const cities = window.citiesData || citiesData || [];
    var city = cities.find(function(c) { return c.id === cityId; });
    if (!city) {
        showToast('Ciudad no encontrada', true);
        return;
    }
    document.getElementById('import-shops-city-id').value = cityId;
    document.getElementById('import-shops-city-name').textContent = city.nombre;
    openModal('import-shops-modal');
}

function importShopsCSV(event) {
    var file = event.target.files[0];
    if (!file) return;

    var cityId = document.getElementById('import-shops-city-id').value;

    readFileAsText(file, function(text) {
        var lines = text.split('\n').filter(function(line) { return line.trim(); });
        
        if (lines.length < 2) {
            showToast('El archivo está vacío', true);
            return;
        }

        // Detectar separador (coma o punto y coma)
        var separator = lines[0].indexOf(';') !== -1 ? ';' : ',';

        var header = lines[0].split(separator).map(function(h) { return h.trim().toLowerCase(); });
        var nombreIdx = header.indexOf('nombre');
        var tipoIdx = header.indexOf('tipo');

        if (nombreIdx === -1 || tipoIdx === -1) {
            showToast('El CSV debe tener columnas "nombre" y "tipo"', true);
            return;
        }

        var validTypes = ['pociones', 'herreria', 'arqueria', 'emporio', 'biblioteca', 'taberna', 'batalla', 'santuario', 'banco', 'posada'];
        function normalizeTipo(s) {
            if (!s) return '';
            return (s + '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }
        var batch = db.batch();
        var count = 0;

        for (var i = 1; i < lines.length; i++) {
            var values = lines[i].split(separator).map(function(v) { return v.trim(); });
            var nombre = values[nombreIdx];
            var tipoRaw = (values[tipoIdx] || '').trim();
            var tipo = normalizeTipo(tipoRaw);

            if (nombre && validTypes.indexOf(tipo) !== -1) {
                var ref = db.collection('shops').doc();
                batch.set(ref, {
                    nombre: nombre,
                    tipo: tipo,
                    ciudadId: cityId,
                    npcDueno: '',
                    inventario: []
                });
                count++;
            }
        }

        if (count === 0) {
            showToast('No se encontraron tiendas válidas. Tipos aceptados: pociones, herrería, arquería, emporio, biblioteca, taberna, batalla, santuario, banco, posada', true);
            return;
        }

        batch.commit().then(function() {
            showToast(count + ' tiendas importadas');
            closeModal('import-shops-modal');
        }).catch(function(e) { showToast('Error: ' + e.message, true); });
    });
    event.target.value = '';
}

// ==================== IMPORT NPCs CSV ====================
function openImportNpcsModal(cityId) {
    const cities = window.citiesData || citiesData || [];
    var city = cities.find(function(c) { return c.id === cityId; });
    if (!city) {
        showToast('Ciudad no encontrada', true);
        return;
    }
    document.getElementById('import-npcs-city-id').value = cityId;
    document.getElementById('import-npcs-city-name').textContent = city.nombre;
    openModal('import-npcs-modal');
}

function importNpcsCSV(event) {
    var file = event.target.files[0];
    if (!file) return;

    var cityId = document.getElementById('import-npcs-city-id').value;
    var validActitudes = ['amigable', 'neutral', 'hostil'];

    readFileAsText(file, function(text) {
        var lines = text.split('\n').filter(function(line) { return line.trim(); });

        if (lines.length < 2) {
            showToast('El archivo está vacío', true);
            return;
        }

        var separator = lines[0].indexOf(';') !== -1 ? ';' : ',';
        var header = lines[0].split(separator).map(function(h) { return h.trim().toLowerCase(); });
        var nombreIdx = header.indexOf('nombre');
        var rolIdx = header.indexOf('rol');
        var actitudIdx = header.indexOf('actitud');
        var notasIdx = header.indexOf('notas');

        if (nombreIdx === -1) {
            showToast('El CSV debe tener al menos la columna "nombre"', true);
            return;
        }
        if (rolIdx === -1) rolIdx = -1;
        if (actitudIdx === -1) actitudIdx = -1;
        if (notasIdx === -1) notasIdx = -1;

        var batch = db.batch();
        var count = 0;

        for (var i = 1; i < lines.length; i++) {
            var values = lines[i].split(separator).map(function(v) { return v.trim(); });
            var nombre = values[nombreIdx];
            var rol = rolIdx >= 0 ? (values[rolIdx] || '') : '';
            var actitudRaw = actitudIdx >= 0 ? (values[actitudIdx] || 'neutral').toLowerCase().trim() : 'neutral';
            var actitud = validActitudes.indexOf(actitudRaw) !== -1 ? actitudRaw : 'neutral';
            var notas = notasIdx >= 0 ? (values[notasIdx] || '') : '';

            if (nombre) {
                var ref = db.collection('npcs').doc();
                batch.set(ref, {
                    nombre: nombre,
                    ciudadId: cityId,
                    rol: rol,
                    actitud: actitud,
                    notas: notas
                });
                count++;
            }
        }

        if (count === 0) {
            showToast('No se encontraron NPCs válidos (nombre requerido)', true);
            return;
        }

        batch.commit().then(function() {
            showToast(count + ' NPCs importados');
            closeModal('import-npcs-modal');
        }).catch(function(err) { showToast('Error: ' + err.message, true); });
    });
    event.target.value = '';
}

// City CRUD
function openCityModal() {
    console.log('openCityModal llamado');
    console.log('db disponible:', typeof db !== 'undefined');
    console.log('openModal disponible:', typeof openModal !== 'undefined');
    console.log('showToast disponible:', typeof showToast !== 'undefined');
    
    try {
        const cityIdEl = document.getElementById('city-id');
        const cityNombreEl = document.getElementById('city-nombre');
        const cityNivelEl = document.getElementById('city-nivel');
        const cityDescripcionEl = document.getElementById('city-descripcion');
        const cityVisibleEl = document.getElementById('city-visible-jugadores');
        const cityModalTitleEl = document.getElementById('city-modal-title');
        
        console.log('Elementos encontrados:', {
            cityIdEl: !!cityIdEl,
            cityNombreEl: !!cityNombreEl,
            cityNivelEl: !!cityNivelEl,
            cityDescripcionEl: !!cityDescripcionEl,
            cityVisibleEl: !!cityVisibleEl,
            cityModalTitleEl: !!cityModalTitleEl
        });
        
        if (!cityIdEl || !cityNombreEl || !cityNivelEl || !cityDescripcionEl || !cityVisibleEl || !cityModalTitleEl) {
            console.error('Error: Elementos del modal de ciudad no encontrados');
            alert('Error: Elementos del formulario no encontrados. Revisa la consola.');
            if (typeof showToast === 'function') {
                showToast('Error: No se puede abrir el modal de ciudad', true);
            }
            return;
        }
        
        const cityImagenUrlEl = document.getElementById('city-imagen-url');
        
        cityIdEl.value = '';
        cityNombreEl.value = '';
        cityNivelEl.value = '3';
        cityDescripcionEl.value = '';
        if (cityImagenUrlEl) cityImagenUrlEl.value = '';
        cityVisibleEl.checked = true;
        cityModalTitleEl.textContent = '🏘️ Nueva Ciudad';
        
        if (typeof openModal === 'function') {
            console.log('Abriendo modal city-modal');
            openModal('city-modal');
        } else {
            console.error('Error: función openModal no está definida');
            alert('Error: función openModal no está definida');
            if (typeof showToast === 'function') {
                showToast('Error: No se puede abrir el modal', true);
            }
        }
    } catch (error) {
        console.error('Error en openCityModal:', error);
        alert('Error: ' + error.message);
        if (typeof showToast === 'function') {
            showToast('Error al abrir el modal: ' + error.message, true);
        }
    }
}

// Hacer funciones globalmente accesibles
window.openCityModal = openCityModal;
window.editCity = editCity;
window.saveCity = saveCity;
window.deleteCity = deleteCity;
window.toggleCity = toggleCity;
window.toggleCityVisibility = toggleCityVisibility;
window.setEstablecimientoRecomendado = setEstablecimientoRecomendado;

function editCity(id) {
    const cities = window.citiesData || citiesData || [];
    const c = cities.find(x => x.id === id);
    if (!c) {
        showToast('Ciudad no encontrada', true);
        return;
    }
    const cityIdEl = document.getElementById('city-id');
    const cityNombreEl = document.getElementById('city-nombre');
    const cityNivelEl = document.getElementById('city-nivel');
    const cityDescripcionEl = document.getElementById('city-descripcion');
    const cityImagenUrlEl = document.getElementById('city-imagen-url');
    const cityVisibleEl = document.getElementById('city-visible-jugadores');
    const cityModalTitleEl = document.getElementById('city-modal-title');
    
    if (!cityIdEl || !cityNombreEl || !cityNivelEl || !cityDescripcionEl || !cityVisibleEl || !cityModalTitleEl) {
        showToast('Error: Campos del formulario no encontrados', true);
        return;
    }
    
    cityIdEl.value = id;
    cityNombreEl.value = c.nombre;
    cityNivelEl.value = c.nivel;
    cityDescripcionEl.value = c.descripcion || '';
    if (cityImagenUrlEl) cityImagenUrlEl.value = c.imagenUrl || '';
    cityVisibleEl.checked = c.visibleToPlayers !== false;
    cityModalTitleEl.textContent = '✏️ Editar Ciudad';
    
    if (typeof openModal === 'function') {
        openModal('city-modal');
    } else {
        showToast('Error: No se puede abrir el modal', true);
    }
}

function saveCity() {
    try {
        if (!db) {
            showToast('Error: Base de datos no disponible', true);
            return;
        }
        const id = document.getElementById('city-id').value;
        const nombreEl = document.getElementById('city-nombre');
        const nivelEl = document.getElementById('city-nivel');
        const descripcionEl = document.getElementById('city-descripcion');
        const imagenUrlEl = document.getElementById('city-imagen-url');
        const visibleEl = document.getElementById('city-visible-jugadores');
        
        if (!nombreEl || !nivelEl || !descripcionEl || !visibleEl) {
            showToast('Error: Campos del formulario no encontrados', true);
            return;
        }
        
        const data = {
            nombre: nombreEl.value.trim(),
            nivel: parseInt(nivelEl.value) || 3,
            descripcion: descripcionEl.value.trim(),
            imagenUrl: imagenUrlEl ? imagenUrlEl.value.trim() : '',
            visibleToPlayers: visibleEl.checked
        };
        
        if (!data.nombre) { 
            showToast('Nombre requerido', true); 
            return; 
        }
        
        const promise = id 
            ? db.collection('cities').doc(id).update(data)
            : db.collection('cities').add(data);
            
        promise
            .then(() => { 
                showToast(id ? 'Ciudad actualizada' : 'Ciudad creada'); 
                if (typeof closeModal === 'function') {
                    closeModal('city-modal');
                }
            })
            .catch(error => {
                console.error('Error guardando ciudad:', error);
                showToast('Error al guardar: ' + error.message, true);
            });
    } catch (error) {
        console.error('Error en saveCity:', error);
        showToast('Error: ' + error.message, true);
    }
}

function deleteCity(id, nombre) {
    if (isOldMistfallCity(nombre)) {
        showToast('Old Mistfall no puede borrarse desde aquí. Solo desde la base de datos.', true);
        return;
    }
    if (confirm(`¿Eliminar ${nombre} y todos sus NPCs/tiendas?`)) {
        const npcs = window.npcsData || npcsData || [];
        const shops = window.shopsData || shopsData || [];
        const batch = db.batch();
        batch.delete(db.collection('cities').doc(id));
        npcs.filter(n => n.ciudadId === id).forEach(n => batch.delete(db.collection('npcs').doc(n.id)));
        shops.filter(s => s.ciudadId === id).forEach(s => batch.delete(db.collection('shops').doc(s.id)));
        batch.commit().then(() => showToast('Ciudad eliminada')).catch(e => {
            console.error('Error eliminando ciudad:', e);
            showToast('Error al eliminar: ' + e.message, true);
        });
    }
}

// NPC CRUD
function openNpcModal(ciudadId) {
    document.getElementById('npc-id').value = '';
    document.getElementById('npc-ciudad-id').value = ciudadId;
    document.getElementById('npc-nombre').value = '';
    document.getElementById('npc-rol').value = 'Mercader';
    document.getElementById('npc-actitud').value = 'neutral';
    document.getElementById('npc-notas').value = '';
    document.getElementById('npc-modal-title').textContent = '🎭 Nuevo NPC';
    openModal('npc-modal');
}

function editNpc(id) {
    const n = npcsData.find(x => x.id === id);
    document.getElementById('npc-id').value = id;
    document.getElementById('npc-ciudad-id').value = n.ciudadId;
    document.getElementById('npc-nombre').value = n.nombre;
    document.getElementById('npc-rol').value = n.rol;
    document.getElementById('npc-actitud').value = n.actitud;
    document.getElementById('npc-notas').value = n.notas || '';
    document.getElementById('npc-modal-title').textContent = '✏️ Editar NPC';
    openModal('npc-modal');
}

function saveNpc() {
    const id = document.getElementById('npc-id').value;
    const data = {
        nombre: document.getElementById('npc-nombre').value,
        ciudadId: document.getElementById('npc-ciudad-id').value,
        rol: document.getElementById('npc-rol').value,
        actitud: document.getElementById('npc-actitud').value,
        notas: document.getElementById('npc-notas').value
    };
    if (!data.nombre) { showToast('Nombre requerido', true); return; }
    (id ? db.collection('npcs').doc(id).update(data) : db.collection('npcs').add(data))
        .then(() => { showToast(id ? 'NPC actualizado' : 'NPC creado'); closeModal('npc-modal'); });
}

function deleteNpc(id, nombre) {
    if (confirm(`¿Eliminar a ${nombre}?`))
        db.collection('npcs').doc(id).delete().then(() => showToast('NPC eliminado'));
}

// Shop CRUD
function openShopModal(ciudadId) {
    document.getElementById('shop-id').value = '';
    document.getElementById('shop-ciudad-id').value = ciudadId;
    document.getElementById('shop-nombre').value = '';
    document.getElementById('shop-tipo').value = 'herreria';
    updateShopNpcSelect(ciudadId);
    document.getElementById('shop-modal-title').textContent = '🛒 Nueva Tienda';
    openModal('shop-modal');
}

function editShop(id) {
    const s = shopsData.find(x => x.id === id);
    document.getElementById('shop-id').value = id;
    document.getElementById('shop-ciudad-id').value = s.ciudadId;
    document.getElementById('shop-nombre').value = s.nombre;
    document.getElementById('shop-tipo').value = s.tipo;
    updateShopNpcSelect(s.ciudadId);
    setTimeout(() => document.getElementById('shop-npc').value = s.npcDueno || '', 50);
    document.getElementById('shop-modal-title').textContent = '✏️ Editar Tienda';
    openModal('shop-modal');
}

function updateShopNpcSelect(ciudadId) {
    const sel = document.getElementById('shop-npc');
    const cityNpcs = npcsData.filter(n => n.ciudadId === ciudadId);
    sel.innerHTML = '<option value="">— Sin dueño —</option>' +
        cityNpcs.map(n => `<option value="${n.id}">${n.nombre}</option>`).join('');
}

function saveShop() {
    const id = document.getElementById('shop-id').value;
    const data = {
        nombre: document.getElementById('shop-nombre').value,
        ciudadId: document.getElementById('shop-ciudad-id').value,
        tipo: document.getElementById('shop-tipo').value,
        npcDueno: document.getElementById('shop-npc').value
    };
    if (!id) data.inventario = [];
    if (!data.nombre) { showToast('Nombre requerido', true); return; }
    (id ? db.collection('shops').doc(id).update(data) : db.collection('shops').add(data))
        .then(() => { showToast(id ? 'Tienda actualizada' : 'Tienda creada'); closeModal('shop-modal'); });
}

function deleteShop(id, nombre) {
    if (confirm(`¿Eliminar ${nombre}?`))
        db.collection('shops').doc(id).delete().then(() => showToast('Tienda eliminada'));
}

// Initialize - No cargar automáticamente aquí, se carga desde app.js cuando el DM inicia sesión
// loadWorld() se llama desde showDashboard() en app.js
