/**
 * NEXORC - Portal de Trazabilidad del Cliente
 */

// Load client data from sessionStorage
const clientNameEl = document.querySelector('#clientName span');
const hardwareEl = document.querySelector('#hardwareInfo span');
const diagnosticEl = document.querySelector('#diagnostic span');
const logConsole = document.getElementById('logConsole');
const recyclingBanner = document.getElementById('recyclingBanner');

// Populate fields
const ticketId = sessionStorage.getItem('ticket_id') || 'NEX-XXXX';
const ticketDisplay = document.querySelector('#ticketDisplay span');
if (ticketDisplay) ticketDisplay.textContent = ticketId;

const nombre = sessionStorage.getItem('cliente_nombre') || 'Desconocido';
if (clientNameEl) clientNameEl.textContent = nombre;

const hardware = sessionStorage.getItem('hardware_info') || 'Dispositivo en Evaluación';
if (hardwareEl) hardwareEl.textContent = hardware;

const estadoProceso = sessionStorage.getItem('estado_proceso') || 'Recibido';
if (diagnosticEl) diagnosticEl.textContent = estadoProceso;

// Timeline mapping
const stateMap = {
    'Recibido': 0,
    'Diagnóstico': 1,
    'Clonación': 2,
    'Rescate': 3,
    'Finalizado': 4
};

const activeStep = stateMap[estadoProceso] || 0;
const steps = ['step1', 'step2', 'step3', 'step4', 'step5'];

steps.forEach((id, idx) => {
    const li = document.getElementById(id);
    if (li) {
        if (idx < activeStep) {
            li.classList.add('completed');
        } else if (idx === activeStep) {
            li.classList.add('active');
        }
    }
});

// Load log (bitácora)
let bitacoraData = sessionStorage.getItem('bitacora');
let logs = [];
try {
    logs = JSON.parse(bitacoraData);
    if (!Array.isArray(logs)) {
        logs = [{ fecha: new Date().toLocaleDateString(), mensaje: bitacoraData || 'No hay mensajes nuevos.' }];
    }
} catch (e) {
    logs = [{ fecha: new Date().toLocaleDateString(), mensaje: bitacoraData || 'No hay mensajes nuevos.' }];
}

if (logConsole) {
    logConsole.innerHTML = '';
    if (logs.length === 0) {
        logs = [{ fecha: new Date().toLocaleDateString(), mensaje: 'No hay mensajes nuevos.' }];
    }

    logs.forEach(log => {
        const line = document.createElement('div');
        line.innerHTML = `<span class="console-prefix">>> [${log.fecha}]</span> ${log.mensaje}`;
        logConsole.appendChild(line);
    });
    
    // Autoscroll
    logConsole.scrollTop = logConsole.scrollHeight;
}

// Show recycling banner if finished or explicitly set
if (recyclingBanner && (estadoProceso === 'Finalizado' || sessionStorage.getItem('recycling') === 'true')) {
    recyclingBanner.style.display = 'block';
}

// Show PDF button if finished
const btnDownloadPdf = document.getElementById('btn-download-pdf');
if (btnDownloadPdf && estadoProceso === 'Finalizado') {
    btnDownloadPdf.style.display = 'block';
}

function generateClientPDF() {
    const reportDiv = document.getElementById('print-report');
    if (!reportDiv) return;
    
    reportDiv.style.display = 'block';
    
    // Generar contenido del PDF (Bitácora)
    const logsHTML = logs.map(l => `<p style="margin: 0.5rem 0; font-size: 0.9rem;"><strong>[${l.fecha}]</strong> ${l.mensaje}</p>`).join('');
    
    reportDiv.innerHTML = `
        <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 1rem; margin-bottom: 2rem; font-family: monospace;">
            <h1 style="margin: 0; font-size: 1.8rem;">NEXORC RECOVERY CENTER</h1>
            <p style="margin: 0.5rem 0 0 0;">Reporte Técnico Oficial</p>
        </div>
        <div style="line-height: 1.6; padding: 0 1rem;">
            <p><strong>TICKET ID:</strong> ${ticketId}</p>
            <p><strong>CLIENTE:</strong> ${nombre}</p>
            <p><strong>HARDWARE / OBJETIVO:</strong> ${hardware}</p>
            <p><strong>ESTADO DEL PROCEDIMIENTO:</strong> <span style="background: #e0e0e0; padding: 2px 8px; border: 1px solid #000;">FINALIZADO</span></p>
            
            <h3 style="border-bottom: 1px solid #000; padding-bottom: 0.5rem; margin-top: 2rem; text-transform: uppercase;">Bitácora de Eventos</h3>
            <div style="padding-left: 1rem; border-left: 2px solid #ccc;">
                ${logsHTML}
            </div>
        </div>
        <div style="margin-top: 4rem; text-align: center; font-size: 0.8rem; color: #333; border-top: 1px solid #ccc; padding-top: 1rem;">
            <p>Documento de trazabilidad emitido electrónicamente por NEXORC.</p>
            <p style="margin-top: 0.5rem;">Válido como comprobante de gestión técnica.</p>
            <div style="margin-top: 2rem; font-family: monospace; font-weight: bold; border: 2px solid #0a4a0a; display: inline-block; padding: 0.5rem 1rem; color: #0a4a0a;">
                SELLO ÉTICO BIOCHAKRA®
            </div>
        </div>
    `;
    
    // Retraso minúsculo para asegurar que el navegador renderice el DOM antes de imprimir
    setTimeout(() => {
        window.print();
        // Ocultar reporte después de invocar la impresión
        setTimeout(() => {
            reportDiv.style.display = 'none';
        }, 500);
    }, 100);
}

// Hacer la función accesible globalmente para el botón onclick
window.generateClientPDF = generateClientPDF;
