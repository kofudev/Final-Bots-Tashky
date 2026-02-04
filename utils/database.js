/**
 * ====================================
 * TASHKY BOT - DATABASE MANAGER
 * ====================================
 * 
 * Système de gestion de base de données JSON
 * Simple, efficace et humain !
 * 
 * @author Kofu (github.com/kofudev)
 * @version 1.0.0
 * @license MIT
 * 
 * ====================================
 */

const fs = require('fs');
const path = require('path');

class Database {
    /**
     * Constructeur de la classe Database
     * @param {string} basePath - Chemin de base pour la BDD
     * @author Kofu
     */
    constructor(basePath = './database') {
        this.basePath = basePath;
        this.ensureDirectories();
        console.log('✨ [Kofu] Base de données JSON initialisée !');
    }

    /**
     * Créer tous les dossiers nécessaires à la BDD
     * @author Kofu
     */
    ensureDirectories() {
        const dirs = [
            this.basePath,
            path.join(this.basePath, 'guilds'),
            path.join(this.basePath, 'users'),
            path.join(this.basePath, 'sanctions'),
            path.join(this.basePath, 'tickets'),
            path.join(this.basePath, 'backups')
        ];

        // Créer chaque dossier s'il n'existe pas
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`✅ [Kofu] Dossier créé: ${dir}`);
            }
        });

        // Créer les fichiers de base
        this.ensureFile('blacklist.json', { users: [], guilds: [], lastUpdated: new Date() });
        this.ensureFile('globaldata.json', this.getDefaultGlobalData());
        this.ensureFile('owners.json', { owners: [], actions: [], lastUpdated: new Date() });
        this.ensureFile('sanctions/warnings.json', { warnings: [], lastUpdated: new Date() });
        this.ensureFile('sanctions/bans.json', { bans: [], lastUpdated: new Date() });
        this.ensureFile('sanctions/mutes.json', { mutes: [], lastUpdated: new Date() });
        this.ensureFile('tickets/active.json', { tickets: [], lastUpdated: new Date() });
        this.ensureFile('tickets/closed.json', { tickets: [], lastUpdated: new Date() });
    }

    /**
     * S'assurer qu'un fichier existe, sinon le créer
     * @param {string} filePath - Chemin du fichier
     * @param {object} defaultData - Données par défaut
     * @author Kofu
     */
    ensureFile(filePath, defaultData = {}) {
        const fullPath = path.join(this.basePath, filePath);
        if (!fs.existsSync(fullPath)) {
            fs.writeFileSync(fullPath, JSON.stringify(defaultData, null, 2));
            console.log(`✅ [Kofu] Fichier créé: ${filePath}`);
        }
    }

    /**
     * Lire un fichier JSON
     * @param {string} filePath - Chemin du fichier
     * @returns {object|null} Données du fichier ou null
     * @author Kofu
     */
    read(filePath) {
        try {
            const fullPath = path.join(this.basePath, filePath);
            if (!fs.existsSync(fullPath)) {
                console.log(`⚠️ [Kofu] Fichier introuvable: ${filePath}`);
                return null;
            }
            const data = fs.readFileSync(fullPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`❌ [Kofu] Erreur lecture ${filePath}:`, error.message);
            return null;
        }
    }

    /**
     * Écrire dans un fichier JSON
     * @param {string} filePath - Chemin du fichier
     * @param {object} data - Données à écrire
     * @returns {boolean} Succès ou échec
     * @author Kofu
     */
    write(filePath, data) {
        try {
            const fullPath = path.join(this.basePath, filePath);
            fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`❌ [Kofu] Erreur écriture ${filePath}:`, error.message);
            return false;
        }
    }

    // ========================================
    // GUILDS - Gestion des serveurs Discord
    // ========================================

    /**
     * Récupérer la configuration d'un serveur
     * @param {string} guildId - ID du serveur
     * @returns {object} Configuration du serveur
     * @author Kofu
     */
    getGuild(guildId) {
        const guildData = this.read(`guilds/${guildId}.json`);
        return guildData || this.getDefaultGuildConfig(guildId);
    }

    /**
     * Sauvegarder la configuration d'un serveur
     * @param {string} guildId - ID du serveur
     * @param {object} data - Données à sauvegarder
     * @returns {boolean} Succès ou échec
     * @author Kofu
     */
    setGuild(guildId, data) {
        data.updatedAt = new Date();
        return this.write(`guilds/${guildId}.json`, data);
    }

    /**
     * Mettre à jour partiellement un serveur
     * @param {string} guildId - ID du serveur
     * @param {object} updates - Modifications à appliquer
     * @returns {boolean} Succès ou échec
     * @author Kofu
     */
    updateGuild(guildId, updates) {
        const guild = this.getGuild(guildId);
        const updated = this.deepMerge(guild, updates);
        updated.updatedAt = new Date();
        return this.setGuild(guildId, updated);
    }

    /**
     * Supprimer un serveur de la BDD
     * @param {string} guildId - ID du serveur
     * @returns {boolean} Succès ou échec
     * @author Kofu
     */
    deleteGuild(guildId) {
        const filePath = path.join(this.basePath, `guilds/${guildId}.json`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ [Kofu] Serveur ${guildId} supprimé de la BDD`);
            return true;
        }
        return false;
    }

    // ========================================
    // USERS - Gestion des utilisateurs
    // ========================================

    /**
     * Récupérer les données d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @returns {object} Données de l'utilisateur
     * @author Kofu
     */
    getUser(userId) {
        const userData = this.read(`users/${userId}.json`);
        return userData || this.getDefaultUserData(userId);
    }

    /**
     * Sauvegarder les données d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @param {object} data - Données à sauvegarder
     * @returns {boolean} Succès ou échec
     * @author Kofu
     */
    setUser(userId, data) {
        data.updatedAt = new Date();
        return this.write(`users/${userId}.json`, data);
    }

    /**
     * Mettre à jour partiellement un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @param {object} updates - Modifications à appliquer
     * @returns {boolean} Succès ou échec
     * @author Kofu
     */
    updateUser(userId, updates) {
        const user = this.getUser(userId);
        const updated = this.deepMerge(user, updates);
        updated.updatedAt = new Date();
        return this.setUser(userId, updated);
    }

    // ========================================
    // SANCTIONS - Warnings, Bans, Mutes
    // ========================================

    /**
     * Ajouter un avertissement à un utilisateur
     * @param {object} warningData - Données de l'avertissement
     * @returns {string|null} ID de l'avertissement ou null
     * @author Kofu
     */
    addWarning(warningData) {
        const data = this.read('sanctions/warnings.json');
        
        // Générer un ID unique pour le warn
        warningData.id = `warn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        warningData.timestamp = new Date();
        warningData.removed = false;
        
        data.warnings.push(warningData);
        data.lastUpdated = new Date();
        
        const success = this.write('sanctions/warnings.json', data);
        console.log(`⚠️ [Kofu] Warn ajouté: ${warningData.id}`);
        return success ? warningData.id : null;
    }

    /**
     * Récupérer les warnings d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @param {string} guildId - ID du serveur (optionnel)
     * @returns {array} Liste des warnings
     * @author Kofu
     */
    getWarnings(userId, guildId = null) {
        const data = this.read('sanctions/warnings.json');
        let warnings = data.warnings.filter(w => w.userId === userId && !w.removed);
        
        // Filtrer par serveur si spécifié
        if (guildId) {
            warnings = warnings.filter(w => w.guildId === guildId);
        }
        
        return warnings;
    }

    /**
     * Récupérer les bans d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @returns {array} Liste des bans
     * @author Kofu
     */
    getBans(userId) {
        const data = this.read('sanctions/bans.json');
        return data.bans.filter(b => b.userId === userId);
    }

    /**
     * Récupérer les mutes d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @returns {array} Liste des mutes
     * @author Kofu
     */
    getMutes(userId) {
        const data = this.read('sanctions/mutes.json');
        return data.mutes.filter(m => m.userId === userId);
    }

    // ========================================
    // UTILS - Fonctions utilitaires
    // ========================================

    /**
     * Fusionner profondément deux objets
     * @param {object} target - Objet cible
     * @param {object} source - Objet source
     * @returns {object} Objet fusionné
     * @author Kofu
     */
    deepMerge(target, source) {
        const output = Object.assign({}, target);
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }

    /**
     * Vérifier si une variable est un objet
     * @param {*} item - Variable à vérifier
     * @returns {boolean} True si objet
     * @author Kofu
     */
    isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    /**
     * Configuration par défaut d'un serveur
     * @param {string} guildId - ID du serveur
     * @returns {object} Config par défaut
     * @author Kofu
     */
    getDefaultGuildConfig(guildId) {
        return {
            guildId,
            guildName: '',
            ownerId: '',
            settings: {
                language: 'fr',
                prefix: '/',
                timezone: 'Europe/Paris'
            },
            logs: {
                moderation: null,
                messages: null,
                members: null,
                server: null,
                voice: null,
                tickets: null
            },
            welcome: {
                enabled: false,
                channel: null,
                message: 'Bienvenue {user} sur **{server}** ! 🎉\n✨ Made by Kofu',
                embed: true,
                embedColor: '#5865F2'
            },
            tickets: {
                enabled: false,
                category: null,
                transcriptsChannel: null,
                staffRoles: [],
                maxTicketsPerUser: 1
            },
            moderation: {
                antiSpam: { enabled: false },
                antiRaid: { enabled: false },
                antiNuke: { enabled: false }
            },
            customization: {
                embedColor: '#5865F2',
                embedFooter: '✨ Made with ❤️ by Kofu | TASHKY Bot',
                successEmoji: '✅',
                errorEmoji: '❌'
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    /**
     * Données par défaut d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @returns {object} Données par défaut
     * @author Kofu
     */
    getDefaultUserData(userId) {
        return {
            userId,
            username: '',
            discriminator: '',
            avatar: null,
            servers: [],
            globalStats: {
                totalMessages: 0,
                totalCommands: 0,
                firstSeen: new Date(),
                lastSeen: new Date()
            },
            moderation: {
                warnings: [],
                bans: [],
                mutes: [],
                totalWarnings: 0,
                totalBans: 0,
                totalMutes: 0
            },
            security: {
                blacklisted: false,
                riskScore: 0
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }

    /**
     * Données globales par défaut
     * @returns {object} Données par défaut
     * @author Kofu
     */
    getDefaultGlobalData() {
        return {
            bot: {
                name: 'TASHKY Bot',
                version: '1.0.0',
                author: 'Kofu',
                github: 'github.com/kofudev',
                startedAt: new Date(),
                totalUptime: 0
            },
            statistics: {
                totalGuilds: 0,
                totalUsers: 0,
                totalCommands: 0,
                totalMessages: 0
            },
            lastUpdated: new Date()
        };
    }
}

// Exporter la classe Database
module.exports = Database;

/**
 * ====================================
 * Fait avec ❤️ par Kofu
 * github.com/kofudev
 * ====================================
 */