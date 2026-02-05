/**
 * ====================================
 * FACTORY D'EMBEDS
 * ====================================
 * 
 * Créateur d'embeds standardisés
 * Système cohérent pour tous les embeds
 * 
 * @author Kofu (github.com/kofudev)
 * ====================================
 */

const { EmbedBuilder } = require('discord.js');
const colors = require('../config/colors');
const emojis = require('../config/emojis');
const KofuSignature = require('./kofu-signature');

class EmbedFactory {
    /**
     * Créer un embed de base
     * @returns {EmbedBuilder} Embed de base
     */
    static base() {
        return new EmbedBuilder()
            .setColor(colors.primary)
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
    }
    
    /**
     * Créer un embed de succès
     * @param {string} title - Titre
     * @param {string} description - Description
     * @returns {EmbedBuilder} Embed de succès
     */
    static success(title, description) {
        return this.base()
            .setColor(colors.success)
            .setTitle(`${emojis.success} ${title}`)
            .setDescription(description);
    }
    
    /**
     * Créer un embed d'erreur
     * @param {string} title - Titre
     * @param {string} description - Description
     * @returns {EmbedBuilder} Embed d'erreur
     */
    static error(title, description) {
        return this.base()
            .setColor(colors.error)
            .setTitle(`${emojis.error} ${title}`)
            .setDescription(description);
    }
    
    /**
     * Créer un embed d'avertissement
     * @param {string} title - Titre
     * @param {string} description - Description
     * @returns {EmbedBuilder} Embed d'avertissement
     */
    static warning(title, description) {
        return this.base()
            .setColor(colors.warning)
            .setTitle(`${emojis.warning} ${title}`)
            .setDescription(description);
    }
    
    /**
     * Créer un embed d'information
     * @param {string} title - Titre
     * @param {string} description - Description
     * @returns {EmbedBuilder} Embed d'information
     */
    static info(title, description) {
        return this.base()
            .setColor(colors.info)
            .setTitle(`${emojis.info} ${title}`)
            .setDescription(description);
    }
    
    /**
     * Créer un embed de chargement
     * @param {string} title - Titre
     * @param {string} description - Description
     * @returns {EmbedBuilder} Embed de chargement
     */
    static loading(title, description) {
        return this.base()
            .setColor(colors.primary)
            .setTitle(`${emojis.loading} ${title}`)
            .setDescription(description);
    }
    
    /**
     * Créer un embed de modération
     * @param {string} action - Action de modération
     * @param {string} title - Titre
     * @param {string} description - Description
     * @returns {EmbedBuilder} Embed de modération
     */
    static moderation(action, title, description) {
        const actionColors = {
            ban: colors.ban,
            kick: colors.kick,
            warn: colors.warn,
            mute: colors.mute
        };
        
        const actionEmojis = {
            ban: emojis.ban,
            kick: emojis.kick,
            warn: emojis.warn,
            mute: emojis.mute
        };
        
        return this.base()
            .setColor(actionColors[action] || colors.warning)
            .setTitle(`${actionEmojis[action] || emojis.warning} ${title}`)
            .setDescription(description);
    }
    
    /**
     * Créer un embed de niveau
     * @param {number} level - Niveau
     * @param {string} title - Titre
     * @param {string} description - Description
     * @returns {EmbedBuilder} Embed de niveau
     */
    static level(level, title, description) {
        let color = colors.level[1];
        if (level >= 100) color = colors.level[100];
        else if (level >= 75) color = colors.level[75];
        else if (level >= 50) color = colors.level[50];
        else if (level >= 25) color = colors.level[25];
        else if (level >= 10) color = colors.level[10];
        
        return this.base()
            .setColor(color)
            .setTitle(`${emojis.level} ${title}`)
            .setDescription(description);
    }
    
    /**
     * Créer un embed d'économie
     * @param {string} type - Type d'économie
     * @param {string} title - Titre
     * @param {string} description - Description
     * @returns {EmbedBuilder} Embed d'économie
     */
    static economy(type, title, description) {
        const economyColors = {
            coins: colors.economy.coins,
            daily: colors.economy.daily,
            work: colors.economy.work,
            shop: colors.economy.shop
        };
        
        const economyEmojis = {
            coins: emojis.coins,
            daily: emojis.daily,
            work: emojis.work,
            shop: emojis.shop
        };
        
        return this.base()
            .setColor(economyColors[type] || colors.economy.coins)
            .setTitle(`${economyEmojis[type] || emojis.coins} ${title}`)
            .setDescription(description);
    }
    
    /**
     * Créer un embed de fun
     * @param {string} type - Type de fun
     * @param {string} title - Titre
     * @param {string} description - Description
     * @returns {EmbedBuilder} Embed de fun
     */
    static fun(type, title, description) {
        const funColors = {
            games: colors.fun.games,
            trivia: colors.fun.trivia,
            rps: colors.fun.rps
        };
        
        return this.base()
            .setColor(funColors[type] || colors.fun.games)
            .setTitle(`${title}`)
            .setDescription(description);
    }
}

module.exports = EmbedFactory;

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */