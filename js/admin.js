/**
 * NEXORC - Panel de Administración
 */

// ============================================================
// SISTEMA DE SEGURIDAD FORENSE (SHA-256 + Anti Fuerza Bruta)
// ============================================================

// Hash SHA-256 por defecto de 'nexorc2026'
const DEFAULT_HASH = '6c745670e35d613874dfebb52583607940087cc569788be7de62f64c9a6a399f';

// Configuración de seguridad
const SECURITY_CONFIG = {
    maxLoginAttempts: 5,         // Intentos máximos antes del bloqueo
    lockoutDurationMs: 60000,    // Duración del bloqueo: 60 segundos
    sessionTimeoutMs: 1800000    // Expiración de sesión: 30 minutos
};

// Contador de intentos fallidos (en memoria, se resetea al recargar)
let loginAttempts = 0;
let lockoutUntil = 0;

/**
 * Genera un hash SHA-256 de un texto plano usando la Web Crypto API.
 * Retorna el hash como string hexadecimal de 64 caracteres.
 * @param {string} plainText - Texto a hashear
 * @returns {Promise<string>} Hash SHA-256 en hexadecimal
 */
async function sha256(plainText) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sanitiza texto para prevenir inyección XSS al insertarlo en el DOM.
 * @param {string} str - Texto potencialmente peligroso
 * @returns {string} Texto sanitizado y seguro para HTML
 */
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

/**
 * Migra automáticamente contraseñas antiguas (Base64) al nuevo formato SHA-256.
 * Detecta el formato anterior y lo reemplaza de forma transparente.
 */
async function migratePasswordIfNeeded() {
    const stored = localStorage.getItem('nexorc_admin_pass');

    // Si no existe ninguna contraseña, establecer el hash SHA-256 por defecto
    if (!stored) {
        localStorage.setItem('nexorc_admin_pass', DEFAULT_HASH);
        return;
    }

    // Detectar formato Base64 antiguo (longitud típica y caracteres '=' de padding)
    // Los hashes SHA-256 siempre tienen exactamente 64 caracteres hexadecimales
    if (stored.length !== 64 || /[^0-9a-f]/.test(stored)) {
        // Es Base64 antiguo: decodificar, hashear y guardar en nuevo formato
        try {
            const oldPlain = atob(stored);
            const newHash = await sha256(oldPlain);
            localStorage.setItem('nexorc_admin_pass', newHash);
            console.log('[NEXORC SECURITY] Contraseña migrada de Base64 a SHA-256.');
        } catch (e) {
            // Si falla la decodificación, resetear al hash por defecto
            localStorage.setItem('nexorc_admin_pass', DEFAULT_HASH);
            console.warn('[NEXORC SECURITY] Error en migración. Contraseña reseteada al valor por defecto.');
        }
    }
}

/**
 * Valida la contraseña ingresada contra el hash SHA-256 almacenado.
 * Incluye protección anti fuerza bruta con bloqueo temporal.
 */
async function checkPass() {
    // Verificar si el usuario está bloqueado por intentos fallidos
    const now = Date.now();
    if (now < lockoutUntil) {
        const remainingSec = Math.ceil((lockoutUntil - now) / 1000);
        NEXORC.showToast(`🔒 Sistema bloqueado. Intente en ${remainingSec}s.`, 'error');
        return;
    }

    // Asegurar que la contraseña esté en formato SHA-256
    await migratePasswordIfNeeded();

    const passEl = document.getElementById('admin-pass');
    const pass = passEl ? passEl.value : '';

    if (!pass) {
        NEXORC.showToast('Ingrese una contraseña.', 'error');
        return;
    }

    const inputHash = await sha256(pass);
    const storedHash = localStorage.getItem('nexorc_admin_pass');

    if (inputHash === storedHash) {
        // Login exitoso: resetear intentos y guardar sesión con timestamp
        loginAttempts = 0;
        sessionStorage.setItem('nexorc_admin_session', 'active');
        sessionStorage.setItem('nexorc_session_start', now.toString());

        const overlay = document.getElementById('login-overlay');
        if (overlay) overlay.style.display = 'none';
        if (passEl) passEl.value = ''; // Limpiar campo de contraseña
        initDB();
        startSessionTimer();
        NEXORC.showToast('Acceso autorizado. MODO: SUPERUSUARIO', 'success');
    } else {
        // Login fallido: incrementar contador
        loginAttempts++;
        const remaining = SECURITY_CONFIG.maxLoginAttempts - loginAttempts;

        const errorEl = document.getElementById('login-error');
        if (errorEl) errorEl.style.display = 'block';

        if (loginAttempts >= SECURITY_CONFIG.maxLoginAttempts) {
            lockoutUntil = now + SECURITY_CONFIG.lockoutDurationMs;
            loginAttempts = 0;
            NEXORC.showToast(`🔒 Demasiados intentos fallidos. Bloqueado por ${SECURITY_CONFIG.lockoutDurationMs / 1000}s.`, 'error');
        } else {
            NEXORC.showToast(`Acceso denegado. ${remaining} intento(s) restante(s).`, 'error');
        }
    }
}

/**
 * Permite cambiar la contraseña de administración.
 * Requiere verificar la contraseña actual antes de aceptar la nueva.
 */
async function changeAdminPass() {
    const currentPass = prompt('Ingrese la contraseña actual:');
    if (currentPass === null) return;

    const currentHash = await sha256(currentPass);
    if (currentHash !== localStorage.getItem('nexorc_admin_pass')) {
        NEXORC.showToast('Contraseña actual incorrecta. Operación cancelada.', 'error');
        return;
    }

    const newPass = prompt('Ingrese la nueva contraseña (mínimo 6 caracteres):');
    if (newPass === null || newPass.trim().length < 6) {
        NEXORC.showToast('La contraseña debe tener al menos 6 caracteres.', 'error');
        return;
    }

    // Hashear y almacenar la nueva contraseña
    const newHash = await sha256(newPass.trim());
    localStorage.setItem('nexorc_admin_pass', newHash);
    NEXORC.showToast('Contraseña actualizada exitosamente con SHA-256.', 'success');
}

/**
 * Inicia un temporizador de expiración de sesión.
 * Si el usuario supera el tiempo máximo de inactividad, cierra la sesión.
 */
let sessionTimer = null;
function startSessionTimer() {
    if (sessionTimer) clearInterval(sessionTimer);

    sessionTimer = setInterval(() => {
        const sessionStart = parseInt(sessionStorage.getItem('nexorc_session_start') || '0');
        if (Date.now() - sessionStart > SECURITY_CONFIG.sessionTimeoutMs) {
            // Sesión expirada: cerrar y mostrar login
            sessionStorage.removeItem('nexorc_admin_session');
            sessionStorage.removeItem('nexorc_session_start');
            clearInterval(sessionTimer);

            const overlay = document.getElementById('login-overlay');
            if (overlay) overlay.style.display = 'flex';
            NEXORC.showToast('⏱️ Sesión expirada por inactividad. Ingrese nuevamente.', 'info');
        }
    }, 60000); // Verificar cada 60 segundos
}

// GESTIÓN DE DATOS Y TABS
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    const tabBtn = document.getElementById(`tab-${tabId}`);
    const content = document.getElementById(`content-${tabId}`);
    
    if (tabBtn) tabBtn.classList.add('active');
    if (content) content.classList.add('active');
}

function showCreateForm() {
    const manageForm = document.getElementById('form-manage');
    const createForm = document.getElementById('form-create');
    
    if (manageForm) manageForm.style.display = 'none';
    if (createForm) createForm.style.display = 'block';
    
    document.querySelectorAll('.ticket-card').forEach(c => c.classList.remove('selected'));
}

function initDB() {
    if (!localStorage.getItem('nexorc_biochakra_count')) {
        localStorage.setItem('nexorc_biochakra_count', '0');
    }
    
    // Migración de datos antiguos si existen
    const oldClients = localStorage.getItem('nexorc_clients');
    if (oldClients && !localStorage.getItem('nexorc_tickets')) {
        let parsedOld = JSON.parse(oldClients);
        let migratedTickets = parsedOld.map((c, index) => {
            return {
                id_ticket: `NEX-${1001 + index}`,
                nombre: c.nombre,
                telefono: c.telefono,
                urgencia: "Generico",
                estado_proceso: c.estado_proceso,
                bitacora: Array.isArray(c.bitacora) ? c.bitacora : [{ fecha: new Date().toLocaleString(), mensaje: c.bitacora || "Migrado de sistema antiguo." }],
                hardware: { procesador: "No especificado", ram: "No especificada", disco: "No especificado" },
                sintomas: "No especificados"
            };
        });
        localStorage.setItem('nexorc_tickets', JSON.stringify(migratedTickets));
    } else if (!localStorage.getItem('nexorc_tickets')) {
        const defaultTickets = [
            {
                "id_ticket": "NEX-1001",
                "nombre": "Cliente Prueba",
                "telefono": "56971568682",
                "urgencia": "Mantenimiento Base",
                "hardware": { "procesador": "Intel i5", "ram": "16GB", "disco": "SSD 500GB" },
                "sintomas": "Evaluación general del sistema y limpieza.",
                "estado_proceso": "Recibido",
                "bitacora": [
                    { fecha: new Date().toLocaleString(), mensaje: "Ingreso de dispositivo al laboratorio. Pendiente de evaluación técnica." }
                ]
            }
        ];
        localStorage.setItem('nexorc_tickets', JSON.stringify(defaultTickets));
    }
    updateCounters();
    renderTickets();
}

function updateCounters() {
    const tickets = JSON.parse(localStorage.getItem('nexorc_tickets')) || [];
    let activos = 0, finalizados = 0;
    tickets.forEach(t => t.estado_proceso === 'Finalizado' ? finalizados++ : activos++);
    
    const kpiActivos = document.getElementById('kpi-activos');
    const kpiFinalizados = document.getElementById('kpi-finalizados');
    const kpiBiochakra = document.getElementById('kpi-biochakra');
    
    if (kpiActivos) kpiActivos.textContent = activos;
    if (kpiFinalizados) kpiFinalizados.textContent = finalizados;
    
    const bioCount = localStorage.getItem('nexorc_biochakra_count') || '0';
    if (kpiBiochakra) kpiBiochakra.textContent = bioCount;
    
    // Actualizar medidor visual (Meta de 100 para escala)
    const meter = document.getElementById('bio-meter');
    if (meter) {
        const percent = Math.min((parseInt(bioCount) / 100) * 100, 100);
        meter.style.width = percent + '%';
    }
}

function addBiochakra() {
    let current = parseInt(localStorage.getItem('nexorc_biochakra_count') || '0');
    localStorage.setItem('nexorc_biochakra_count', (current + 1).toString());
    updateCounters();
    NEXORC.showToast("♻️ Registro Biochakra actualizado.", "success");
}

function getCardClass(urgency) {
    if (urgency === 'Falla Física/Forense') return 'falla-forense';
    if (urgency === 'Mantenimiento Base') return 'mantenimiento';
    if (urgency === 'Recuperación Lógica') return 'recuperacion';
    return 'generico';
}

function getProgress(status) {
    const steps = {
        'Recibido': 10,
        'Diagnóstico': 30,
        'Clonación': 50,
        'Rescate': 80,
        'Finalizado': 100
    };
    return steps[status] || 0;
}

// BÚSQUEDA DE TICKETS
let currentSearchQuery = "";

function handleSearch(query) {
    currentSearchQuery = query.toLowerCase().trim();
    renderTickets();
}

function renderTickets() {
    const tickets = JSON.parse(localStorage.getItem('nexorc_tickets')) || [];
    const listActivos = document.getElementById('list-activos');
    const listHistorial = document.getElementById('list-historial');

    if (!listActivos || !listHistorial) return;

    listActivos.innerHTML = '';
    listHistorial.innerHTML = '';

    tickets.forEach((t, index) => {
        // Filtrado por búsqueda
        const matchSearch = t.nombre.toLowerCase().includes(currentSearchQuery) || 
                            t.id_ticket.toLowerCase().includes(currentSearchQuery) ||
                            t.telefono.includes(currentSearchQuery);

        if (!matchSearch) return;

        const progress = getProgress(t.estado_proceso);
        const cardClass = getCardClass(t.urgencia);
        const html = `
            <div class="ticket-card ${cardClass}" id="card-${index}" onclick="loadTicketToForm(${index})" style="animation-delay: ${index * 0.05}s">
                <div class="tc-header">
                    <span>${sanitizeHTML(t.id_ticket)}</span>
                    <span style="color: var(--accent); font-weight: bold;">${sanitizeHTML(t.estado_proceso)}</span>
                </div>
                <div class="tc-title" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${sanitizeHTML(t.nombre)}</span>
                    <span style="font-size: 0.75rem; color: #88ff88; font-family: var(--font-mono); background: rgba(0,255,0,0.1); padding: 2px 6px; border-radius: 3px;">📞 ${sanitizeHTML(t.telefono)}</span>
                </div>
                <div class="tc-symptoms">${sanitizeHTML(t.sintomas)}</div>
                <div class="card-progress-bg">
                    <div class="card-progress-fill" style="width: ${progress}%"></div>
                </div>
                <button class="btn-delete" onclick="event.stopPropagation(); deleteTicket(${index})">[ ELIMINAR REGISTRO ]</button>
            </div>
        `;

        if (t.estado_proceso === 'Finalizado') {
            listHistorial.innerHTML += html;
        } else {
            listActivos.innerHTML += html;
        }
    });
    updateCounters();
}

function loadTicketToForm(index) {
    document.querySelectorAll('.ticket-card').forEach(c => c.classList.remove('selected'));
    const selectedCard = document.getElementById(`card-${index}`);
    if (selectedCard) selectedCard.classList.add('selected');

    const formCreate = document.getElementById('form-create');
    const formManage = document.getElementById('form-manage');
    const manageContent = document.getElementById('manage-content');
    
    if (formCreate) formCreate.style.display = 'none';
    if (formManage) formManage.style.display = 'block';
    if (manageContent) manageContent.style.display = 'block';

    const tickets = JSON.parse(localStorage.getItem('nexorc_tickets'));
    const t = tickets[index];

    const manageHeader = document.getElementById('manage-header');
    const manageHw = document.getElementById('manage-hw');
    const manageSymp = document.getElementById('manage-symp');
    const manageIndex = document.getElementById('manage-index');
    const updateStatus = document.getElementById('update-status');
    const updateBitacora = document.getElementById('update-bitacora');

    if (manageHeader) manageHeader.innerHTML = `<span style="color:#fff;">[${sanitizeHTML(t.id_ticket)}]</span> ${sanitizeHTML(t.nombre)} <span style="font-size: 0.9rem; color: #88ff88; margin-left: 10px;">📞 ${sanitizeHTML(t.telefono)}</span>`;
    if (manageHw) manageHw.textContent = `${t.hardware.procesador} | ${t.hardware.ram} | ${t.hardware.disco}`;
    if (manageSymp) manageSymp.textContent = t.sintomas;

    if (manageIndex) manageIndex.value = index;
    if (updateStatus) updateStatus.value = t.estado_proceso || 'Recibido';
    if (updateBitacora) updateBitacora.value = '';
    
    updateBitacoraHistory(getBitacoraArray(t.bitacora));
}

function getBitacoraArray(bitacora) {
    if (Array.isArray(bitacora)) return bitacora;
    return [{ fecha: "N/A", mensaje: bitacora || "Sin registros." }];
}

function updateBitacoraHistory(bitacora) {
    const historyEl = document.getElementById('bitacora-history');
    if (!historyEl) return;
    
    historyEl.innerHTML = '';
    bitacora.forEach(log => {
        const logDiv = document.createElement('div');
        logDiv.innerHTML = `<span class="log-date">[${sanitizeHTML(log.fecha)}]</span> <span class="log-msg">${sanitizeHTML(log.mensaje)}</span>`;
        historyEl.appendChild(logDiv);
    });
    
    // Autoscroll suave
    setTimeout(() => {
        historyEl.scrollTo({
            top: historyEl.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);
}

function updateTicketData() {
    const index = document.getElementById('manage-index').value;
    if (index === "") return;

    const tickets = JSON.parse(localStorage.getItem('nexorc_tickets'));
    const t = tickets[index];

    const newStatus = document.getElementById('update-status').value;
    const newMsg = document.getElementById('update-bitacora').value.trim();

    t.estado_proceso = newStatus;
    if (newMsg !== "") {
        if (!Array.isArray(t.bitacora)) t.bitacora = [];
        t.bitacora.push({ fecha: new Date().toLocaleString(), mensaje: newMsg });
    }

    localStorage.setItem('nexorc_tickets', JSON.stringify(tickets));
    NEXORC.showToast(`Ticket ${t.id_ticket} actualizado con éxito.`, "success");
    renderTickets();
    loadTicketToForm(index);
}

function deleteTicket(index) {
    if (!confirm("¿Está seguro de eliminar este ticket permanentemente?")) return;
    
    const tickets = JSON.parse(localStorage.getItem('nexorc_tickets'));
    tickets.splice(index, 1);
    localStorage.setItem('nexorc_tickets', JSON.stringify(tickets));
    
    NEXORC.showToast("Ticket eliminado.", "info");
    renderTickets();
    document.getElementById('manage-content').style.display = 'none';
}

function createTicket() {
    const name = document.getElementById('new-name').value.trim();
    const phone = document.getElementById('new-phone').value.trim();
    const urgency = document.getElementById('new-urgency').value;
    const cpu = document.getElementById('new-cpu').value.trim();
    const ram = document.getElementById('new-ram').value;
    const disk = document.getElementById('new-disk').value.trim();
    const symptoms = document.getElementById('new-symptoms').value.trim();

    if (!name || !phone) {
        NEXORC.showToast("Nombre y teléfono son obligatorios.", "error");
        return;
    }

    // Normalizar y validar teléfono (Debe comenzar con 569 y tener 11 dígitos)
    const phoneClean = phone.replace(/\D/g, '');
    if (!phoneClean.startsWith('569') || phoneClean.length !== 11) {
        NEXORC.showToast("ERROR: El número debe comenzar con 569 (Ej: 56912345678).", "error");
        return;
    }

    const tickets = JSON.parse(localStorage.getItem('nexorc_tickets')) || [];
    
    // Generar nuevo ID
    let maxId = 1000;
    tickets.forEach(t => {
        const num = parseInt(t.id_ticket.replace('NEX-', ''));
        if (!isNaN(num) && num > maxId) maxId = num;
    });
    const newId = `NEX-${maxId + 1}`;

    const newTicket = {
        id_ticket: newId,
        nombre: name,
        telefono: phoneClean,
        urgencia: urgency,
        hardware: {
            procesador: cpu || "No especificado",
            ram: ram || "No especificada",
            disco: disk || "No especificado"
        },
        sintomas: symptoms || "No especificados",
        estado_proceso: "Recibido",
        bitacora: [{ fecha: new Date().toLocaleString(), mensaje: "Ticket generado en laboratorio." }]
    };

    tickets.push(newTicket);
    localStorage.setItem('nexorc_tickets', JSON.stringify(tickets));
    
    NEXORC.showToast(`Ticket ${newId} generado correctamente.`, "success");
    
    // Limpiar campos
    document.getElementById('new-name').value = '';
    document.getElementById('new-phone').value = '';
    document.getElementById('new-cpu').value = '';
    document.getElementById('new-ram').value = '';
    document.getElementById('new-disk').value = '';
    document.getElementById('new-symptoms').value = '';
    
    renderTickets();
}

function generateCert() {
    const rut = document.getElementById('cert-rut').value;
    const sn = document.getElementById('cert-sn').value;
    const type = document.getElementById('cert-type').value;

    if (!rut || !sn) {
        NEXORC.showToast("RUT y SN son necesarios para el certificado.", "error");
        return;
    }

    const preview = document.getElementById('cert-preview');
    const body = document.getElementById('cert-body');
    const actions = document.getElementById('cert-actions');

    if (preview && body && actions) {
        body.innerHTML = `
            <p style="text-align: right;"><strong>Fecha de Emisión:</strong> ${new Date().toLocaleDateString()}</p>
            <p>Por la presente, <strong>NEXORC RECOVERY CENTER INFORMATICA</strong> certifica que se ha realizado el procedimiento de:</p>
            <h2 style="text-align: center; margin: 2rem 0; text-decoration: underline;">${type}</h2>
            <p><strong>Identificación del Cliente:</strong> ${rut}</p>
            <p><strong>Identificación del Dispositivo (SN):</strong> ${sn}</p>
            <p style="margin-top: 2rem;">Los trabajos realizados cumplen con los estándares de integridad y confidencialidad requeridos por el protocolo técnico NEXORC, garantizando el éxito de la operación bajo los parámetros técnicos especificados.</p>
        `;
        preview.style.display = 'block';
        actions.style.display = 'flex';
        NEXORC.showToast("Certificado generado. Listo para imprimir.", "success");
    }
}

function printCert() {
    window.print();
}

function reprintTicket() {
    const index = document.getElementById('manage-index').value;
    if (index === "") return;
    
    const tickets = JSON.parse(localStorage.getItem('nexorc_tickets'));
    const t = tickets[index];
    
    const modal = document.getElementById('ticket-modal');
    const content = document.getElementById('ticket-content');
    const btnWa = document.getElementById('btn-wa-ticket');

    if (modal && content) {
        content.innerHTML = `
            <p><strong>ID TICKET:</strong> ${t.id_ticket}</p>
            <p><strong>FECHA:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>CLIENTE:</strong> ${t.nombre}</p>
            <p><strong>TELÉFONO:</strong> ${t.telefono}</p>
            <hr style="border: 1px dashed #000;">
            <p><strong>EQUIPO:</strong> ${t.hardware.procesador} | ${t.hardware.ram} | ${t.hardware.disco}</p>
            <p><strong>SÍNTOMAS:</strong> ${t.sintomas}</p>
            <p><strong>ESTADO INICIAL:</strong> ${t.estado_proceso}</p>
        `;
        modal.style.display = 'flex';
        
        if (btnWa) {
            btnWa.onclick = () => {
                const msg = encodeURIComponent(`*NEXORC TICKET VISUAL*\nID: ${t.id_ticket}\nCliente: ${t.nombre}\nEstado: ${t.estado_proceso}`);
                window.open(`https://wa.me/${t.telefono}?text=${msg}`);
            };
        }
    }
}

// Inicialización
window.onload = async () => {
    // Migrar contraseña al formato SHA-256 si es necesario
    await migratePasswordIfNeeded();

    // Si ya hay sesión activa (F5), verificar que no haya expirado
    if (sessionStorage.getItem('nexorc_admin_session') === 'active') {
        const sessionStart = parseInt(sessionStorage.getItem('nexorc_session_start') || '0');
        const elapsed = Date.now() - sessionStart;

        if (elapsed > SECURITY_CONFIG.sessionTimeoutMs) {
            // Sesión expirada: limpiar y mostrar login
            sessionStorage.removeItem('nexorc_admin_session');
            sessionStorage.removeItem('nexorc_session_start');
            NEXORC.showToast('⏱️ Sesión expirada. Ingrese nuevamente.', 'info');
        } else {
            // Sesión válida: continuar
            const overlay = document.getElementById('login-overlay');
            if (overlay) overlay.style.display = 'none';
            initDB();
            startSessionTimer();
        }
    }
};

// Sincronización automática entre pestañas (Multi-tab)
window.addEventListener('storage', (e) => {
    if (e.key === 'nexorc_tickets') {
        renderTickets();
    } else if (e.key === 'nexorc_biochakra_count') {
        updateCounters();
    }
});
