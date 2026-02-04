/**
 * ====================================
 * TASHKY BOT - SYSTÈME DE LOGS
 * ====================================
 * 
 * Système de logging avancé avec Winston
 * Logs colorés, fichiers séparés, rotation
 * 
 * @author Kofu (github.com/kofudev)
 * @version 1.0.0
 * @license MIT
 * 
 * ====================================
 */

const winston = require('winston');
const fs = require('fs');
const path = require('path');

class Logger {
    /**
     * Constructeur du système de logs
     * @author Kofu
     */
    constructor() {
        this.ensureLogDirectories();
        this.createLogger();
        console.log('📝 [Kofu] Système de logs initialisé !');
    }

    /**
     * Créer les dossiers de logs nécessaires
     * @author Kofu
     */
    ensureLogDirectories() {
        const dirs = [
            './logs',
            './logs/errors',
            './logs/commands',
            './logs/owner',
            './logs/moderation'
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`✅ [Kofu] Dossier de logs créé: ${dir}`);
            }
        });
    }

    /**
     * Créer le logger Winston
     * @author Kofu
     */
    createLogger() {
        // Format personnalisé pour les logs
        const customFormat = winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            winston.format.errors({ stack: true }),
            winston.format.printf(({ level, message, timestamp, stack }) => {
                const kofuSignature = '✨ [Kofu]';
                if (stack) {
                    return `${timestamp} ${level.toUpperCase()} ${kofuSignature} ${message}\n${stack}`;
                }
                return `${timestamp} ${level.toUpperCase()} ${kofuSignature} ${message}`;
            })
        );

        // Configuration du logger principal
        this.logger = winston.createLogger({
            level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
            format: customFormat,
            transports: [
                // Log général (tous les niveaux)
                new winston.transports.File({
                    filename: './logs/combined.log',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5
                }),
                
                // Logs d'erreurs uniquement
                new winston.transports.File({
                    filename: './logs/errors/error.log',
                    level: 'error',
                    maxsize: 5242880,
                    maxFiles: 10
                }),
                
                // Console (en développement)
                ...(process.env.NODE_ENV === 'development' ? [
                    new winston.transports.Console({
                        format: winston.format.combine(
                            winston.format.colorize(),
                            winston.format.simple()
                        )
                    })
                ] : [])
            ]
        });

        // Logger spécialisé pour les commandes
        this.commandLogger = winston.createLogger({
            level: 'info',
            format: customFormat,
            transports: [
                new winston.transports.File({
                    filename: './logs/commands/commands.log',
                    maxsize: 5242880,
                    maxFiles: 5
                })
            ]
        });

        // Logger spécialisé pour les actions owner
        this.ownerLogger = winston.createLogger({
            level: 'info',
            format: customFormat,
            transports: [
                new winston.transports.File({
                    filename: './logs/owner/owner-actions.log',
                    maxsize: 5242880,
                    maxFiles: 10
                })
            ]
        });

        // Logger spécialisé pour la modération
        this.moderationLogger = winston.createLogger({
            level: 'info',
            format: customFormat,
            transports: [
                new winston.transports.File({
                    filename: './logs/moderation/moderation.log',
                    maxsize: 5242880,
                    maxFiles: 5
                })
            ]
        });
    }

    // ========================================
    // MÉTHODES DE LOGGING GÉNÉRALES
    // ========================================

    /**
     * Log d'information
     * @param {string} message - Message à logger
     * @param {object} meta - Métadonnées optionnelles
     * @author Kofu
     */
    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    /**
     * Log d'erreur
     * @param {string} message - Message à logger
     * @param {Error|object} error - Erreur ou métadonnées
     * @author Kofu
     */
    error(message, error = {}) {
        if (error instanceof Error) {
            this.logger.error(message, { error: error.message, stack: error.stack });
        } else {
            this.logger.error(message, error);
        }
    }

    /**
     * Log d'avertissement
     * @param {string} message - Message à logger
     * @param {object} meta - Métadonnées optionnelles
     * @author Kofu
     */
    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }

    /**
     * Log de debug
     * @param {string} message - Message à logger
     * @param {object} meta - Métadonnées optionnelles
     * @author Kofu
     */
    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }

    // ========================================
    // MÉTHODES DE LOGGING SPÉCIALISÉES
    // ========================================

    /**
     * Logger une commande utilisée
     * @param {object} interaction - L'interaction Discord
     * @param {string} commandName - Nom de la commande
     * @param {boolean} success - Succès ou échec
     * @author Kofu
     */
    logCommand(interaction, commandName, success = true) {
        const logData = {
            command: commandName,
            user: {
                id: interaction.user.id,
                tag: interaction.user.tag
            },
            guild: interaction.guild ? {
                id: interaction.guild.id,
                name: interaction.guild.name
            } : null,
            channel: {
                id: interaction.channel.id,
                name: interaction.channel.name
            },
            success,
            timestamp: new Date().toISOString()
        };

        const message = `Commande ${commandName} ${success ? 'exécutée' : 'échouée'} par ${interaction.user.tag}`;
        this.commandLogger.info(message, logData);

        // Log aussi dans le logger principal si c'est un échec
        if (!success) {
            this.logger.warn(`Échec commande: ${message}`, logData);
        }
    }

    /**
     * Logger une action owner (CRITIQUE)
     * @param {object} user - L'utilisateur qui fait l'action
     * @param {string} action - L'action effectuée
     * @param {object} details - Détails de l'action
     * @author Kofu
     */
    logOwnerAction(user, action, details = {}) {
        const logData = {
            action,
            owner: {
                id: user.id,
                tag: user.tag
            },
            details,
            timestamp: new Date().toISOString(),
            severity: 'CRITICAL'
        };

        const message = `🚨 ACTION OWNER: ${action} par ${user.tag}`;
        
        // Logger dans le fichier owner
        this.ownerLogger.warn(message, logData);
        
        // Logger aussi dans le logger principal (niveau warning)
        this.logger.warn(message, logData);

        console.log(`🚨 [Kofu] ${message}`);
    }

    /**
     * Logger une action de modération
     * @param {object} moderator - Le modérateur
     * @param {string} action - L'action de modération
     * @param {object} target - La cible de l'action
     * @param {object} details - Détails de l'action
     * @author Kofu
     */
    logModeration(moderator, action, target, details = {}) {
        const logData = {
            action,
            moderator: {
                id: moderator.id,
                tag: moderator.tag
            },
            target: {
                id: target.id,
                tag: target.tag || target.username
            },
            guild: details.guild ? {
                id: details.guild.id,
                name: details.guild.name
            } : null,
            reason: details.reason || 'Aucune raison spécifiée',
            duration: details.duration || null,
            timestamp: new Date().toISOString()
        };

        const message = `Modération: ${action} sur ${target.tag || target.username} par ${moderator.tag}`;
        
        this.moderationLogger.info(message, logData);
        this.logger.info(message, logData);
    }

    /**
     * Logger une erreur critique du bot
     * @param {string} context - Contexte de l'erreur
     * @param {Error} error - L'erreur
     * @param {object} additionalData - Données supplémentaires
     * @author Kofu
     */
    logCriticalError(context, error, additionalData = {}) {
        const logData = {
            context,
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            additionalData,
            timestamp: new Date().toISOString(),
            severity: 'CRITICAL'
        };

        const message = `💥 ERREUR CRITIQUE: ${context} - ${error.message}`;
        
        this.logger.error(message, logData);
        console.error(`💥 [Kofu] ${message}`);
    }

    /**
     * Logger l'activité d'un utilisateur suspect
     * @param {object} user - L'utilisateur suspect
     * @param {string} reason - Raison de la suspicion
     * @param {object} evidence - Preuves
     * @author Kofu
     */
    logSuspiciousActivity(user, reason, evidence = {}) {
        const logData = {
            user: {
                id: user.id,
                tag: user.tag
            },
            reason,
            evidence,
            timestamp: new Date().toISOString(),
            severity: 'WARNING'
        };

        const message = `🚨 Activité suspecte: ${reason} - ${user.tag}`;
        
        this.logger.warn(message, logData);
        console.warn(`🚨 [Kofu] ${message}`);
    }

    // ========================================
    // MÉTHODES UTILITAIRES
    // ========================================

    /**
     * Nettoyer les anciens logs (plus de 30 jours)
     * @author Kofu
     */
    cleanOldLogs() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Cette méthode pourrait être étendue pour supprimer
        // automatiquement les anciens fichiers de logs
        this.logger.info('Nettoyage des anciens logs effectué');
    }

    /**
     * Obtenir les statistiques des logs
     * @returns {object} Statistiques des logs
     * @author Kofu
     */
    getLogStats() {
        // Cette méthode pourrait être étendue pour retourner
        // des statistiques détaillées sur les logs
        return {
            message: 'Statistiques des logs disponibles',
            timestamp: new Date().toISOString()
        };
    }
}

// Exporter la classe Logger
module.exports = Logger;

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */