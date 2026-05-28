/**
 * NEXORC - Lógica de Validación de Acceso
 */

async function validarAcceso() {
    let ticketInput = document.getElementById('ticket-id').value.trim().toUpperCase().replace(/\s+/g, '');
    ticketInput = ticketInput.replace('NEXO-', 'NEX-').replace('NEXO', 'NEX-');
    if (ticketInput.startsWith('NEX') && !ticketInput.startsWith('NEX-')) {
        ticketInput = ticketInput.replace('NEX', 'NEX-');
    }
    const phoneInput = document.getElementById('client-phone').value.trim();
    
    if (!ticketInput || !phoneInput) {
        showMessage('Por favor, ingrese su ID de Ticket y Teléfono.', 'error');
        NEXORC.showToast('Datos incompletos', 'error');
        return;
    }

    try {
        showMessage('Validando credenciales en servidor seguro...', 'info');
        NEXORC.showToast('Validando credenciales...', 'info', 2000);

        // Leer base de datos en la web (Tickets)
        let tickets = [];
        try {
            const response = await fetch('/api/tickets');
            if (response.ok) {
                tickets = await response.json();
            } else {
                console.warn('Fallo al cargar tickets del servidor. Usando local...');
                const storedTickets = localStorage.getItem('nexorc_tickets');
                tickets = storedTickets ? JSON.parse(storedTickets) : [];
            }
        } catch (e) {
            console.error('Error de conexión con la base de datos remota. Usando local...', e);
            const storedTickets = localStorage.getItem('nexorc_tickets');
            tickets = storedTickets ? JSON.parse(storedTickets) : [];
        }
        
        // Función para limpiar números de teléfono (deja solo dígitos)
        const cleanPhone = (phone) => String(phone || '').replace(/\D/g, '');
        const cleanInputPhone = cleanPhone(phoneInput);

        if (!cleanInputPhone.startsWith('569') || cleanInputPhone.length !== 11) {
            showMessage('Error: El formato del teléfono debe comenzar con 569 (Ej: 56912345678).', 'error');
            NEXORC.showToast('Formato de teléfono inválido', 'error');
            return;
        }
        
        const ticketEncontrado = tickets.find(t => 
            t.id_ticket === ticketInput && 
            cleanPhone(t.telefono) === cleanInputPhone
        );

        setTimeout(() => {
            if (ticketEncontrado) {
                // Guardamos sesión con datos dinámicos del ticket específico
                sessionStorage.setItem('nexorc_auth', 'true');
                sessionStorage.setItem('ticket_id', ticketEncontrado.id_ticket);
                sessionStorage.setItem('cliente_nombre', ticketEncontrado.nombre);
                sessionStorage.setItem('hardware_info', ticketEncontrado.hardware ? `${ticketEncontrado.hardware.procesador} | ${ticketEncontrado.hardware.ram} | ${ticketEncontrado.hardware.disco}` : 'Dispositivo en Evaluación');
                sessionStorage.setItem('estado_proceso', ticketEncontrado.estado_proceso || 'Recibido');
                sessionStorage.setItem('bitacora', JSON.stringify(ticketEncontrado.bitacora || []));

                showMessage(`Bienvenido, ${ticketEncontrado.nombre}. Redirigiendo...`, 'success');
                NEXORC.showToast(`Bienvenido, ${ticketEncontrado.nombre}`, 'success');
                
                // Redirección inmediata
                setTimeout(() => {
                    window.location.href = 'estado_ticket.html';
                }, 800);
            } else {
                showMessage('ID de Ticket o Teléfono incorrectos.', 'error');
                NEXORC.showToast('Acceso denegado', 'error');
            }
        }, 1000);

    } catch (error) {
        console.error('Error de validación:', error);
        showMessage('Error técnico de conexión. Intente más tarde.', 'error');
        NEXORC.showToast('Error de conexión', 'error');
    }
}

function showMessage(text, type) {
    const messageElement = document.getElementById('access-message');
    if (messageElement) {
        messageElement.textContent = text;
        messageElement.className = 'access-message ' + type;
        messageElement.style.display = 'block';
    }
}

// Control del Modal Portal Clientes
function abrirPortal() {
    const modal = document.getElementById('portal-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

function cerrarPortal() {
    const modal = document.getElementById('portal-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Cerrar modal si se hace clic fuera del contenido
window.addEventListener('click', function(event) {
    const modal = document.getElementById('portal-modal');
    if (event.target === modal) {
        cerrarPortal();
    }
});
