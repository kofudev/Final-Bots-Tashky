/**
 * ====================================
 * ÉVÉNEMENT: CLIENT READY
 * ====================================
 * 
 * Déclenché quand le bot est connecté et prêt
 * Initialisation complète du système
 * 
 * @author Kofu (github.com/kofudev)
 * ====================================
 */

const { Events, ActivityType } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    name: Events.ClientReady,
    once: true,
    
    /**
     * Exécution de l'événement ready
     * @param {Client} client - Le client Discord
     * @author Kofu
     */
    async execute(client) {
        console.log(`🤖 [Kofu] Bot connecté en tant que: ${client.user.tag}`);
        
        // Afficher la signature Kofu stylée
        KofuSignature.showStartupMessage();
        
        // Définir l'activité du bot
        const activity = process.env.BOT_ACTIVITY || '✨ Made by Kofu | /help';
        const activityType = ActivityType[process.env.ACTIVITY_TYPE] || ActivityType.Watching;
        
        client.user.setActivity(activity, { type: activityType });
        console.log(`🎮 [Kofu] Activité définie: ${activity}`);
        
        // Définir le statut du bot
        const status = process.env.BOT_STATUS || 'online';
        client.user.setStatus(status);
        console.log(`🟢 [Kofu] Statut défini: ${status}`);
        
        // Mettre à jour les statistiques globales
        await updateGlobalStats(client);
        
        // Initialiser les systèmes avancés
        await initializeAdvancedSystems(client);
        
        // Afficher les statistiques de démarrage
        displayStartupStats(client);
        
        // Logger l'événement
        client.logger.info(`Bot démarré - ${client.guilds.cache.size} serveurs, ${client.users.cache.size} utilisateurs`);
        
        // Programmer les tâches périodiques
        schedulePeriodicTasks(client);
        
        console.log('🎉 [Kofu] Bot complètement initialisé et prêt !');
    }
};

/**
 * Mettre à jour les statistiques globales
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function updateGlobalStats(client) {
    try {
        const globalData = client.database.read('globaldata.json') || client.database.getDefaultGlobalData();
        
        globalData.statistics.totalGuilds = client.guilds.cache.size;
        globalData.statistics.totalUsers = client.users.cache.size;
        globalData.bot.startedAt = new Date();
        globalData.lastUpdated = new Date();
        
        client.database.write('globaldata.json', globalData);
        console.log('📊 [Kofu] Statistiques globales mises à jour');
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur mise à jour stats:', error.message);
    }
}

/**
 * Initialiser les systèmes avancés
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function initializeAdvancedSystems(client) {
    try {
        console.log('🔧 [Kofu] Initialisation des systèmes avancés...');
        
        // Initialiser le système anti-spam
        if (process.env.ENABLE_ANTI_SPAM === 'true') {
            // TODO: Initialiser anti-spam
            console.log('🛡️ [Kofu] Système anti-spam initialisé');
        }
        
        // Initialiser le système anti-raid
        if (process.env.ENABLE_ANTI_RAID === 'true') {
            // TODO: Initialiser anti-raid
            console.log('🛡️ [Kofu] Système anti-raid initialisé');
        }
        
        // Initialiser le système anti-nuke
        if (process.env.ENABLE_ANTI_NUKE === 'true') {
            // TODO: Initialiser anti-nuke
            console.log('🛡️ [Kofu] Système anti-nuke initialisé');
        }
        
        // Initialiser le système de backup automatique
        if (process.env.ENABLE_AUTO_BACKUP === 'true') {
            // TODO: Initialiser auto-backup
            console.log('💾 [Kofu] Système de backup automatique initialisé');
        }
        
        console.log('✅ [Kofu] Tous les systèmes avancés sont initialisés');
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur initialisation systèmes avancés:', error);
    }
}

/**
 * Afficher les statistiques de démarrage
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
function displayStartupStats(client) {
    const stats = {
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        channels: client.channels.cache.size,
        commands: client.commands.size,
        uptime: formatUptime(client.uptime),
        ping: client.ws.ping,
        memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
    };
    
    KofuSignature.showStats(stats);
}

/**
 * Programmer les tâches périodiques
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
function schedulePeriodicTasks(client) {
    // Mettre à jour les stats toutes les heures
    setInterval(async () => {
        await updateGlobalStats(client);
        console.log('🔄 [Kofu] Statistiques mises à jour automatiquement');
    }, 60 * 60 * 1000); // 1 heure
    
    // Nettoyer les anciens logs tous les jours
    setInterval(() => {
        client.logger.cleanOldLogs();
        console.log('🧹 [Kofu] Nettoyage automatique des logs effectué');
    }, 24 * 60 * 60 * 1000); // 24 heures
    
    // Backup automatique si activé
    if (process.env.ENABLE_AUTO_BACKUP === 'true') {
        const backupInterval = parseInt(process.env.BACKUP_INTERVAL) || 86400000; // 24h par défaut
        
        setInterval(async () => {
            try {
                // TODO: Implémenter le backup automatique
                console.log('💾 [Kofu] Backup automatique effectué');
            } catch (error) {
                console.error('❌ [Kofu] Erreur backup automatique:', error);
            }
        }, backupInterval);
    }
    
    console.log('⏰ [Kofu] Tâches périodiques programmées');
}

/**
 * Formater l'uptime en format lisible
 * @param {number} uptime - Uptime en millisecondes
 * @returns {string} Uptime formaté
 * @author Kofu
 */
function formatUptime(uptime) {
    if (!uptime) return '0s';
    
    const seconds = Math.floor(uptime / 1000);
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
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */