/**
 * ====================================
 * TASHKY BOT - POINT D'ENTRÉE PRINCIPAL
 * ====================================
 * 
 * Bot Discord multifonction universel
 * Modération • Tickets • Logs • Owner Panel
 * 
 * @author Kofu (github.com/kofudev)
 * @version 1.0.0
 * @license MIT
 * 
 * ====================================
 */

// Charger les variables d'environnement en premier
require('dotenv').config();

// Imports des modules Discord.js
const { Client, GatewayIntentBits, Partials, Collection, ActivityType } = require('discord.js');

// Imports des handlers personnalisés
const commandHandler = require('./handlers/commandHandler');
const eventHandler = require('./handlers/eventHandler');
const errorHandler = require('./handlers/errorHandler');

// Imports des utilitaires
const Database = require('./utils/database');
const Logger = require('./utils/logger');
const KofuSignature = require('./utils/kofu-signature');

// ========================================
// INITIALISATION DU CLIENT DISCORD
// ========================================

/**
 * Créer le client Discord avec tous les intents nécessaires
 * @author Kofu
 */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember
    ]
});

// ========================================
// COLLECTIONS POUR LES COMMANDES
// ========================================

/**
 * Collections pour stocker les commandes et cooldowns
 * @author Kofu
 */
client.commands = new Collection();
client.cooldowns = new Collection();

// ========================================
// INITIALISATION DE LA BASE DE DONNÉES
// ========================================

/**
 * Initialiser la base de données JSON
 * @author Kofu
 */
const database = new Database();
client.database = database;

// ========================================
// INITIALISATION DU LOGGER
// ========================================

/**
 * Initialiser le système de logs
 * @author Kofu
 */
const logger = new Logger();
client.logger = logger;

// ========================================
// CHARGEMENT DES HANDLERS
// ========================================

/**
 * Charger tous les handlers du bot
 * @author Kofu
 */
async function loadHandlers() {
    try {
        console.log('🔄 [Kofu] Chargement des handlers...');
        
        // Charger les commandes
        await commandHandler(client);
        console.log('✅ [Kofu] Commandes chargées !');
        
        // Charger les événements
        await eventHandler(client);
        console.log('✅ [Kofu] Événements chargés !');
        
        // Initialiser la gestion d'erreurs
        errorHandler(client);
        console.log('✅ [Kofu] Gestion d\'erreurs initialisée !');
        
        console.log('🎉 [Kofu] Tous les handlers sont chargés !');
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur lors du chargement des handlers:', error);
        process.exit(1);
    }
}

// ========================================
// ÉVÉNEMENT: BOT PRÊT
// ========================================

/**
 * Quand le bot est connecté et prêt
 * @author Kofu
 */
client.once('ready', async () => {
    console.log('\n' + '='.repeat(50));
    console.log('🤖 TASHKY BOT - DÉMARRAGE RÉUSSI !');
    console.log('='.repeat(50));
    console.log(`✅ Connecté en tant que: ${client.user.tag}`);
    console.log(`🏛️ Serveurs: ${client.guilds.cache.size}`);
    console.log(`👥 Utilisateurs: ${client.users.cache.size}`);
    console.log(`📊 Ping: ${client.ws.ping}ms`);
    console.log(`🕐 Démarré le: ${new Date().toLocaleString('fr-FR')}`);
    console.log('='.repeat(50));
    console.log('✨ Made with ❤️ by Kofu');
    console.log('🔗 github.com/kofudev');
    console.log('='.repeat(50) + '\n');
    
    // Définir l'activité du bot
    const activity = process.env.BOT_ACTIVITY || '✨ Made by Kofu | /help';
    const activityType = ActivityType[process.env.ACTIVITY_TYPE] || ActivityType.Watching;
    
    client.user.setActivity(activity, { type: activityType });
    console.log(`🎮 [Kofu] Activité définie: ${activity}`);
    
    // Définir le statut du bot
    const status = process.env.BOT_STATUS || 'online';
    client.user.setStatus(status);
    console.log(`🟢 [Kofu] Statut défini: ${status}`);
    
    // Mettre à jour les stats globales
    await updateGlobalStats();
    
    // Démarrer le panel web si activé
    if (process.env.ENABLE_OWNER_PANEL === 'true') {
        try {
            const webPanel = require('./web-panel/server');
            webPanel.start(client);
            console.log(`🌐 [Kofu] Panel web démarré sur le port ${process.env.DASHBOARD_PORT}`);
        } catch (error) {
            console.error('❌ [Kofu] Erreur démarrage panel web:', error.message);
        }
    }
    
    // Afficher la signature Kofu
    KofuSignature.showStartupMessage();
});

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Mettre à jour les statistiques globales
 * @author Kofu
 */
async function updateGlobalStats() {
    try {
        const globalData = database.read('globaldata.json') || database.getDefaultGlobalData();
        
        globalData.statistics.totalGuilds = client.guilds.cache.size;
        globalData.statistics.totalUsers = client.users.cache.size;
        globalData.bot.startedAt = new Date();
        globalData.lastUpdated = new Date();
        
        database.write('globaldata.json', globalData);
        console.log('📊 [Kofu] Statistiques globales mises à jour');
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur mise à jour stats:', error.message);
    }
}

// ========================================
// GESTION DES ERREURS GLOBALES
// ========================================

/**
 * Gestion des erreurs non capturées
 * @author Kofu
 */
process.on('uncaughtException', (error) => {
    console.error('💥 [Kofu] Erreur non capturée:', error);
    logger.error('Uncaught Exception', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 [Kofu] Promesse rejetée:', reason);
    logger.error('Unhandled Rejection', { reason, promise });
});

// ========================================
// ARRÊT PROPRE DU BOT
// ========================================

/**
 * Gérer l'arrêt propre du bot
 * @author Kofu
 */
process.on('SIGINT', async () => {
    console.log('\n🛑 [Kofu] Arrêt du bot en cours...');
    
    try {
        // Sauvegarder les données importantes
        await updateGlobalStats();
        
        // Fermer la connexion Discord
        client.destroy();
        
        console.log('✅ [Kofu] Bot arrêté proprement !');
        console.log('✨ Made with ❤️ by Kofu');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur lors de l\'arrêt:', error);
        process.exit(1);
    }
});

// ========================================
// DÉMARRAGE DU BOT
// ========================================

/**
 * Fonction principale de démarrage
 * @author Kofu
 */
async function startBot() {
    try {
        // Vérifier le token Discord
        if (!process.env.DISCORD_TOKEN) {
            throw new Error('Token Discord manquant ! Vérifiez votre fichier .env');
        }
        
        // Vérifier les owners
        if (!process.env.BOT_OWNERS) {
            console.warn('⚠️ [Kofu] Aucun owner défini ! Les commandes owner seront inaccessibles.');
        }
        
        console.log('🚀 [Kofu] Démarrage de TASHKY Bot...');
        console.log('✨ Made with ❤️ by Kofu');
        
        // Charger les handlers
        await loadHandlers();
        
        // Se connecter à Discord
        await client.login(process.env.DISCORD_TOKEN);
        
    } catch (error) {
        console.error('💥 [Kofu] Erreur fatale lors du démarrage:', error);
        process.exit(1);
    }
}

// Démarrer le bot
startBot();

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */