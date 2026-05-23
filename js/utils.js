/**
 * NEXORC UTILS - Sistema de Notificaciones y Utilidades Globales
 */

const NEXORC = {
    /**
     * Muestra una notificación flotante (Toast)
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo: 'info', 'success', 'error'
     * @param {number} duration - Duración en ms
     */
    showToast: function(message, type = 'info', duration = 5000) {
        // Crear contenedor si no existe
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        // Crear elemento toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';

        toast.innerHTML = `
            <span>${icon}</span>
            <span>${message}</span>
        `;

        // Añadir al contenedor
        container.appendChild(toast);

        // Mostrar con delay para animación
        setTimeout(() => toast.classList.add('show'), 10);

        // Configurar progreso de la barra (duración)
        toast.style.setProperty('--duration', `${duration}ms`);

        // Eliminar después de la duración
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }
};

// Sobrescribir el alert nativo para usar Toasts si se desea, 
// o simplemente usar NEXORC.showToast explícitamente.
// window.alert = (msg) => NEXORC.showToast(msg, 'info'); 

/**
 * SISTEMA GLOBAL DE NAVEGACIÓN (BOTÓN FLOTANTE)
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inyectar el botón en el DOM
    const floater = document.createElement('div');
    floater.className = 'nav-floater bounce';
    floater.innerHTML = `
        <svg viewBox="0 0 24 24">
            <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
    `;
    document.body.appendChild(floater);

    // 2. Lógica de visibilidad y dirección (scroll)
    const toggleFloater = () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        
        // Si la página no requiere scroll, ocultar
        if (scrollHeight <= clientHeight + 10) {
            floater.classList.remove('visible');
            return;
        }

        floater.classList.add('visible');

        // Condición técnica solicitada: cambia a 'Up' solo al llegar al final absoluto
        if ((clientHeight + scrollTop) >= (scrollHeight - 50)) {
            // Mostrar flecha hacia arriba (Scroll to Top)
            floater.classList.add('up');
            floater.classList.remove('bounce');
        } else {
            // El resto del tiempo se mantiene apuntando hacia abajo
            floater.classList.remove('up');
            floater.classList.add('bounce');
        }
    };

    window.addEventListener('scroll', toggleFloater);
    window.addEventListener('resize', toggleFloater);
    // Timeout para asegurar que la página se renderizó y las alturas son correctas
    setTimeout(toggleFloater, 100);

    // 3. Comportamiento al hacer click
    floater.addEventListener('click', () => {
        const isUp = floater.classList.contains('up');
        if (isUp) {
            // Subir al inicio suavemente
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // Bajar aproximadamente el alto de la pantalla (o hasta el final si queda poco)
            window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
        }
    });
});
