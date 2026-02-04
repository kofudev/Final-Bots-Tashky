/**
 * ====================================
 * TASHKY BOT - WEB PANEL JAVASCRIPT
 * ====================================
 * 
 * Scripts JavaScript pour le dashboard
 * Interactions et animations
 * 
 * @author Kofu (github.com/kofudev)
 * ====================================
 */

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    console.log('✨ [Kofu] Dashboard JavaScript initialisé !');
    
    // Initialiser les fonctionnalités
    initializeAnimations();
    initializeStatsUpdater();
    initializeTooltips();
    initializeTheme();
    
    // Message de bienvenue dans la console
    console.log(`
    ╔══════════════════════════════════════╗
    ║            TASHKY BOT                ║
    ║        Ultimate Edition              ║
    ╠══════════════════════════════════════╣
    ║                                      ║
    ║  👨‍💻 Développeur: Kofu                ║
    ║  🔗 GitHub: github.com/kofudev       ║
    ║  💖 Licence: MIT                     ║
    ║                                      ║
    ╚══════════════════════════════════════╝
    `);
});

/**
 * Initialiser les animations
 * @author Kofu
 */
function initializeAnimations() {
    // Animation des cartes au scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observer les éléments à animer
    document.querySelectorAll('.stat-card, .feature-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    console.log('🎬 [Kofu] Animations initialisées');
}

/**
 * Initialiser le système de mise à jour des stats
 * @author Kofu
 */
function initializeStatsUpdater() {
    // Mettre à jour les stats toutes les 30 secondes
    setInterval(updateStats, 30000);
    
    console.log('📊 [Kofu] Mise à jour automatique des stats activée');
}

/**
 * Mettre à jour les statistiques
 * @author Kofu
 */
async function updateStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        // Mettre à jour les éléments de stats
        updateStatElement('guilds', stats.guilds);
        updateStatElement('users', stats.users);
        updateStatElement('commands', stats.commands);
        updateStatElement('ping', `${stats.ping}ms`);
        
        console.log('📊 [Kofu] Statistiques mises à jour');
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur mise à jour stats:', error);
    }
}

/**
 * Mettre à jour un élément de statistique
 * @param {string} type - Type de statistique
 * @param {string|number} value - Nouvelle valeur
 * @author Kofu
 */
function updateStatElement(type, value) {
    const elements = document.querySelectorAll(`[data-stat="${type}"]`);
    elements.forEach(el => {
        // Animation de changement
        el.style.transform = 'scale(1.1)';
        el.style.transition = 'transform 0.3s ease';
        
        setTimeout(() => {
            el.textContent = value;
            el.style.transform = 'scale(1)';
        }, 150);
    });
}

/**
 * Initialiser les tooltips Bootstrap
 * @author Kofu
 */
function initializeTooltips() {
    // Initialiser tous les tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    console.log('💡 [Kofu] Tooltips initialisés');
}

/**
 * Initialiser le système de thème
 * @author Kofu
 */
function initializeTheme() {
    // Détecter le thème préféré de l'utilisateur
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Appliquer le thème (pour l'instant, toujours sombre)
    document.body.setAttribute('data-theme', 'dark');
    
    console.log('🎨 [Kofu] Thème initialisé');
}

/**
 * Afficher une notification toast
 * @param {string} message - Message à afficher
 * @param {string} type - Type de notification (success, error, warning, info)
 * @author Kofu
 */
function showToast(message, type = 'info') {
    // Créer l'élément toast
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    // Ajouter au container de toasts
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    toastContainer.appendChild(toast);
    
    // Initialiser et afficher le toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Supprimer l'élément après fermeture
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

/**
 * Copier du texte dans le presse-papiers
 * @param {string} text - Texte à copier
 * @author Kofu
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('✅ Copié dans le presse-papiers !', 'success');
    } catch (error) {
        console.error('❌ [Kofu] Erreur copie presse-papiers:', error);
        showToast('❌ Erreur lors de la copie', 'danger');
    }
}

/**
 * Formater un nombre avec des séparateurs
 * @param {number} num - Nombre à formater
 * @returns {string} Nombre formaté
 * @author Kofu
 */
function formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num);
}

/**
 * Formater une durée en format lisible
 * @param {number} ms - Durée en millisecondes
 * @returns {string} Durée formatée
 * @author Kofu
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days}j ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Effectuer une requête API avec gestion d'erreurs
 * @param {string} url - URL de l'API
 * @param {object} options - Options de la requête
 * @returns {Promise} Promesse de la réponse
 * @author Kofu
 */
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error(`❌ [Kofu] Erreur API ${url}:`, error);
        showToast(`❌ Erreur: ${error.message}`, 'danger');
        throw error;
    }
}

/**
 * Débouncer une fonction
 * @param {Function} func - Fonction à débouncer
 * @param {number} wait - Délai d'attente en ms
 * @returns {Function} Fonction débouncée
 * @author Kofu
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Valider un ID Discord
 * @param {string} id - ID à valider
 * @returns {boolean} True si valide
 * @author Kofu
 */
function isValidDiscordId(id) {
    return /^\d{17,19}$/.test(id);
}

/**
 * Échapper le HTML pour éviter les injections XSS
 * @param {string} text - Texte à échapper
 * @returns {string} Texte échappé
 * @author Kofu
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Fonctions utilitaires globales
window.KofuUtils = {
    showToast,
    copyToClipboard,
    formatNumber,
    formatDuration,
    apiRequest,
    debounce,
    isValidDiscordId,
    escapeHtml
};

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */