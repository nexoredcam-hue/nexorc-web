/**
 * NEXORC - Portal de Trazabilidad del Cliente
 */

// Load client data from sessionStorage
const clientNameEl = document.querySelector('#clientName span');
const hardwareEl = document.querySelector('#hardwareInfo span');
const diagnosticEl = document.querySelector('#diagnostic span');
const logConsole = document.getElementById('logConsole');
const recyclingBanner = document.getElementById('recyclingBanner');
const ticketDisplay = document.querySelector('#ticketDisplay span');
const btnDownloadPdf = document.getElementById('btn-download-pdf');

// Timeline mapping
const stateMap = {
    'Recibido': 0,
    'Diagnóstico': 1,
    'Clonación': 2,
    'Rescate': 3,
    'Finalizado': 4
};

let currentLogs = [];

function updateUI(nombre, hardware, estadoProceso, logs) {
    if (clientNameEl) clientNameEl.textContent = nombre;
    if (hardwareEl) hardwareEl.textContent = hardware;
    if (diagnosticEl) diagnosticEl.textContent = estadoProceso;

    // Timeline mapping
    const activeStep = stateMap[estadoProceso] !== undefined ? stateMap[estadoProceso] : 0;
    const steps = ['step1', 'step2', 'step3', 'step4', 'step5'];

    steps.forEach((id, idx) => {
        const li = document.getElementById(id);
        if (li) {
            li.classList.remove('completed', 'active');
            if (idx < activeStep) {
                li.classList.add('completed');
            } else if (idx === activeStep) {
                li.classList.add('active');
            }
        }
    });

    // Load logs
    currentLogs = logs;
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
    if (recyclingBanner) {
        if (estadoProceso === 'Finalizado' || sessionStorage.getItem('recycling') === 'true') {
            recyclingBanner.style.display = 'block';
        } else {
            recyclingBanner.style.display = 'none';
        }
    }

    // Show PDF button if finished
    if (btnDownloadPdf) {
        if (estadoProceso === 'Finalizado') {
            btnDownloadPdf.style.display = 'block';
        } else {
            btnDownloadPdf.style.display = 'none';
        }
    }
}

// 1. Carga inicial rápida desde sessionStorage
const ticketId = sessionStorage.getItem('ticket_id') || 'NEX-XXXX';
if (ticketDisplay) ticketDisplay.textContent = ticketId;

const initialNombre = sessionStorage.getItem('cliente_nombre') || 'Desconocido';
const initialHardware = sessionStorage.getItem('hardware_info') || 'Dispositivo en Evaluación';
const initialEstadoProceso = sessionStorage.getItem('estado_proceso') || 'Recibido';

let initialLogs = [];
try {
    initialLogs = JSON.parse(sessionStorage.getItem('bitacora') || '[]');
    if (!Array.isArray(initialLogs)) {
        initialLogs = [{ fecha: new Date().toLocaleDateString(), mensaje: sessionStorage.getItem('bitacora') || 'No hay mensajes nuevos.' }];
    }
} catch (e) {
    initialLogs = [{ fecha: new Date().toLocaleDateString(), mensaje: sessionStorage.getItem('bitacora') || 'No hay mensajes nuevos.' }];
}

updateUI(initialNombre, initialHardware, initialEstadoProceso, initialLogs);

// 2. Carga en vivo e instantánea desde la base de datos web Vercel Postgres
async function syncTicketLive() {
    if (!ticketId || ticketId === 'NEX-XXXX') return;

    try {
        const response = await fetch('/api/tickets');
        if (response.ok) {
            const tickets = await response.json();
            const ticketEncontrado = tickets.find(t => t.id_ticket === ticketId);
            if (ticketEncontrado) {
                const liveNombre = ticketEncontrado.nombre;
                const liveHardware = ticketEncontrado.hardware ? `${ticketEncontrado.hardware.procesador} | ${ticketEncontrado.hardware.ram} | ${ticketEncontrado.hardware.disco}` : 'Dispositivo en Evaluación';
                const liveEstadoProceso = ticketEncontrado.estado_proceso || 'Recibido';
                const liveLogs = Array.isArray(ticketEncontrado.bitacora) ? ticketEncontrado.bitacora : [];

                // Actualizar sessionStorage
                sessionStorage.setItem('cliente_nombre', liveNombre);
                sessionStorage.setItem('hardware_info', liveHardware);
                sessionStorage.setItem('estado_proceso', liveEstadoProceso);
                sessionStorage.setItem('bitacora', JSON.stringify(liveLogs));

                // Actualizar la interfaz
                updateUI(liveNombre, liveHardware, liveEstadoProceso, liveLogs);
            }
        }
    } catch (e) {
        console.error('Error al sincronizar ticket con base de datos en la web:', e);
    }
}

// Ejecutar sincronización al cargar la página
document.addEventListener('DOMContentLoaded', syncTicketLive);

function generateClientPDF() {
    const reportDiv = document.getElementById('print-report');
    if (!reportDiv) return;
    
    reportDiv.style.display = 'block';
    
    // Generar contenido del PDF (Bitácora)
    const logsHTML = currentLogs.map(l => `<p style="margin: 0.5rem 0; font-size: 0.9rem;"><strong>[${l.fecha}]</strong> ${l.mensaje}</p>`).join('');
    
    reportDiv.innerHTML = `
        <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 1rem; margin-bottom: 2rem; font-family: monospace;">
            <h1 style="margin: 0; font-size: 1.8rem;">NEXORC RECOVERY CENTER</h1>
            <p style="margin: 0.5rem 0 0 0;">Reporte Técnico Oficial</p>
        </div>
        <div style="line-height: 1.6; padding: 0 1rem;">
            <p><strong>TICKET ID:</strong> ${ticketId}</p>
            <p><strong>CLIENTE:</strong> ${initialNombre}</p>
            <p><strong>HARDWARE / OBJETIVO:</strong> ${initialHardware}</p>
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
