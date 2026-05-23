/**
 * NEXORC - Diagnóstico y Generación de Tickets
 */

const urlParams = new URLSearchParams(window.location.search);
const tipoServicio = urlParams.get('tipo');

// Configuración dinámica si viene de Ciberseguridad
if (tipoServicio === 'ciberseguridad') {
    const hardwareSection = document.getElementById('seccion-hardware');
    const ciberSection = document.getElementById('seccion-ciberseguridad');
    
    if (hardwareSection) hardwareSection.style.display = 'none';
    if (ciberSection) ciberSection.style.display = 'block';
    
    // Quitar el required del hardware
    const fieldsToUnrequire = ['procesador', 'ram', 'so', 'disco-tipo', 'disco-cap'];
    fieldsToUnrequire.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.removeAttribute('required');
    });
    
    // Cambiar textos
    const headerH1 = document.querySelector('header h1');
    const headerP = document.querySelector('header p');
    if (headerH1) headerH1.textContent = "Ficha de Ingreso: Ciberseguridad y Pentesting";
    if (headerP) headerP.textContent = "Seleccione los objetivos de red e infraestructura para iniciar la auditoría.";
    
    // Ocultar botón de auto-detectar
    const btnAutodetect = document.getElementById('btn-autodetect');
    if (btnAutodetect) btnAutodetect.style.display = 'none';
}

function autoDetectar() {
    // Detectar Sistema Operativo
    let os = "Desconocido";
    if (navigator.userAgent.indexOf("Win") != -1) os = "Windows";
    if (navigator.userAgent.indexOf("Mac") != -1) os = "macOS";
    if (navigator.userAgent.indexOf("Linux") != -1) os = "Linux";
    if (navigator.userAgent.indexOf("Android") != -1) os = "Android";
    if (navigator.userAgent.indexOf("like Mac") != -1) os = "iOS";

    // Detectar RAM (Aproximada)
    const ram = navigator.deviceMemory ? navigator.deviceMemory + "GB" : "No detectada";

    // Detectar Núcleos de CPU
    const cores = navigator.hardwareConcurrency ? ` (${navigator.hardwareConcurrency} núcleos)` : "";

    // Rellenar campos
    document.getElementById('so').value = os;
    const ramSelect = document.getElementById('ram');
    if (ramSelect) {
        const ramVal = ram.includes("GB") ? (ram === "8GB" || ram === "16GB" || ram === "4GB" ? ram : "16GB") : "";
        ramSelect.value = ramVal;
    }
    document.getElementById('procesador').value = "CPU Detectada" + cores;

    NEXORC.showToast("Telemetría básica detectada con éxito. Por favor, complete los detalles específicos.", "success");
}

const diagnosticForm = document.getElementById('diagnostico-form');
if (diagnosticForm) {
    diagnosticForm.addEventListener('submit', function (e) {
        e.preventDefault();

        // Validar teléfono (Debe empezar con 569 y tener 11 dígitos)
        const telefonoInput = document.getElementById('telefono').value;
        const telefonoLimpio = telefonoInput.replace(/\D/g, '');
        if (!telefonoLimpio.startsWith('569') || telefonoLimpio.length !== 11) {
            NEXORC.showToast("ERROR: El número debe comenzar con 569 (Ej: 56912345678).", "error");
            return;
        }

        // Generar ID de ticket
        const tickets = JSON.parse(localStorage.getItem('nexorc_tickets') || '[]');
        let maxId = 1000;
        tickets.forEach(t => {
            if(t.id_ticket) {
                const num = parseInt(t.id_ticket.replace('NEX-', ''));
                if (!isNaN(num) && num > maxId) maxId = num;
            }
        });
        const newId = `NEX-${maxId + 1}`;

        // Construir datos de hardware / objetivos
        let hardwareData = {};
        let hardwareTextForWa = "";

        if (tipoServicio === 'ciberseguridad') {
            let targets = [];
            if(document.getElementById('ciber-wifi').checked) targets.push("Redes Wi-Fi");
            if(document.getElementById('ciber-camaras').checked) targets.push("Cámaras IP / CCTV");
            if(document.getElementById('ciber-web').checked) targets.push("Sitios Web / Servidores");
            if(document.getElementById('ciber-lan').checked) targets.push("Red Local LAN");
            
            let targetsStr = targets.length > 0 ? targets.join(', ') : "Ninguno específico";
            
            hardwareData = {
                procesador: "Auditoría de Seguridad",
                ram: "N/A",
                disco: targetsStr,
                so: "Ciberseguridad"
            };
            
            hardwareTextForWa = `*OBJETIVOS DE AUDITORÍA:*\n- ${targetsStr}\n\n`;
        } else {
            hardwareData = {
                procesador: document.getElementById('procesador').value,
                ram: document.getElementById('ram').value,
                disco: document.getElementById('disco-tipo').value + " " + document.getElementById('disco-cap').value,
                so: document.getElementById('so').value
            };
            
            hardwareTextForWa = `*HARDWARE:*\n` +
            `- Procesador: ${hardwareData.procesador}\n` +
            `- RAM: ${hardwareData.ram}\n` +
            `- Almacenamiento: ${hardwareData.disco}\n` +
            `- S.O.: ${hardwareData.so}\n\n`;
        }

        // Recolección de datos
        const data = {
            id_ticket: newId,
            nombre: document.getElementById('nombre').value,
            telefono: telefonoLimpio,
            rut: document.getElementById('rut').value,
            email: document.getElementById('email').value,
            urgencia: tipoServicio === 'ciberseguridad' ? "Falla Física/Forense" : "Generico",
            estado_proceso: "Recibido",
            hardware: hardwareData,
            sintomas: document.getElementById('sintomas').value,
            bitacora: [
                { fecha: new Date().toLocaleString(), mensaje: tipoServicio === 'ciberseguridad' ? "Solicitud de auditoría de ciberseguridad recibida." : "Solicitud de diagnóstico recibida vía web." }
            ]
        };

        // 1. Guardar en nexorc_tickets
        tickets.push(data);
        localStorage.setItem('nexorc_tickets', JSON.stringify(tickets));

        // 2. Preparar mensaje para WhatsApp
        const message =
            `*NUEVO INGRESO TÉCNICO NEXORC*\n` +
            `----------------------------\n` +
            `*TICKET:* ${newId}\n` +
            `*TIPO:* ${tipoServicio === 'ciberseguridad' ? 'CIBERSEGURIDAD / PENTESTING' : 'DIAGNÓSTICO GENERAL'}\n` +
            `*CLIENTE:* ${data.nombre}\n` +
            `*RUT:* ${data.rut}\n` +
            `*TEL:* ${data.telefono}\n\n` +
            hardwareTextForWa +
            `*SÍNTOMAS / DETALLES:*\n` +
            `${data.sintomas}\n\n` +
            `*NEXORC® aplicado.*\n` +
            `----------------------------`;

        const encodedMessage = encodeURIComponent(message);
        const waUrl = `https://wa.me/56971568682?text=${encodedMessage}`;

        // Mostrar el modal con el número de ticket
        const bigTicketEl = document.getElementById('big-ticket-number');
        const ticketOverlay = document.getElementById('ticket-overlay');
        const btnWaRedirect = document.getElementById('btn-wa-redirect');

        if (bigTicketEl) bigTicketEl.textContent = newId;
        if (ticketOverlay) ticketOverlay.style.display = 'flex';
        
        // Configurar el botón de whatsapp
        if (btnWaRedirect) {
            btnWaRedirect.onclick = function() {
                window.location.href = waUrl;
            };
        }

        NEXORC.showToast("Ticket generado correctamente. Redirigiendo...", "success");

        // Redirigir automáticamente
        setTimeout(() => {
            window.location.href = waUrl;
        }, 6000);
    });
}
