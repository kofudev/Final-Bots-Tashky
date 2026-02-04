/**
 * ====================================
 * TASHKY BOT - SIGNATURE KOFU
 * ====================================
 * 
 * Système de signature et branding Kofu
 * Affichage de messages stylés et crédits
 * 
 * @author Kofu (github.com/kofudev)
 * @version 1.0.0
 * @license MIT
 * 
 * ====================================
 */

const { EmbedBuilder } = require('discord.js');

class KofuSignature {
    /**
     * Afficher le message de démarrage stylé
     * @author Kofu
     */
    static showStartupMessage() {
        console.log('\n' + '═'.repeat(60));
        console.log('');
        console.log('            ████████╗ █████╗ ███████╗██╗  ██╗██╗  ██╗');
        console.log('            ╚══██╔══╝██╔══██╗██╔════╝██║  ██║██║ ██╔╝');
        console.log('               ██║   ███████║███████╗███████║█████╔╝ ');
        console.log('               ██║   ██╔══██║╚════██║██╔══██║██╔═██╗ ');
        console.log('               ██║   ██║  ██║███████║██║  ██║██║  ██╗');
        console.log('               ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝');
        console.log('');
        console.log('                    Discord Bot - Ultimate Edition');
        console.log('                    Made with ❤️ by Kofu');
        console.log('                    github.com/kofudev');
        console.log('');
        console.log('═'.repeat(60));
        console.log('✨ Bot démarré avec succès !');
        console.log('🚀 Prêt à servir les utilisateurs !');
        console.log('💖 Merci d\'utiliser TASHKY Bot !');
        console.log('═'.repeat(60) + '\n');
    }

    /**
     * Créer un embed avec la signature Kofu
     * @param {string} title - Titre de l'embed
     * @param {string} description - Description de l'embed
     * @param {string} color - Couleur de l'embed (hex)
     * @returns {EmbedBuilder} Embed avec signature Kofu
     * @author Kofu
     */
    static createKofuEmbed(title, description, color = '#5865F2') {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setFooter({
                text: '✨ Made with ❤️ by Kofu | TASHKY Bot',
                iconURL: 'https://i.imgur.com/kofu-avatar.png'
            })
            .setTimestamp();
    }

    /**
     * Créer un embed d'erreur avec signature Kofu
     * @param {string} title - Titre de l'erreur
     * @param {string} description - Description de l'erreur
     * @returns {EmbedBuilder} Embed d'erreur
     * @author Kofu
     */
    static createErrorEmbed(title, description) {
        return new EmbedBuilder()
            .setTitle(`❌ ${title}`)
            .setDescription(description)
            .setColor('#F04747')
            .setFooter({
                text: '✨ Made with ❤️ by Kofu | TASHKY Bot',
                iconURL: 'https://i.imgur.com/kofu-avatar.png'
            })
            .setTimestamp();
    }

    /**
     * Créer un embed de succès avec signature Kofu
     * @param {string} title - Titre du succès
     * @param {string} description - Description du succès
     * @returns {EmbedBuilder} Embed de succès
     * @author Kofu
     */
    static createSuccessEmbed(title, description) {
        return new EmbedBuilder()
            .setTitle(`✅ ${title}`)
            .setDescription(description)
            .setColor('#43B581')
            .setFooter({
                text: '✨ Made with ❤️ by Kofu | TASHKY Bot',
                iconURL: 'https://i.imgur.com/kofu-avatar.png'
            })
            .setTimestamp();
    }

    /**
     * Créer un embed d'avertissement avec signature Kofu
     * @param {string} title - Titre de l'avertissement
     * @param {string} description - Description de l'avertissement
     * @returns {EmbedBuilder} Embed d'avertissement
     * @author Kofu
     */
    static createWarningEmbed(title, description) {
        return new EmbedBuilder()
            .setTitle(`⚠️ ${title}`)
            .setDescription(description)
            .setColor('#FAA61A')
            .setFooter({
                text: '✨ Made with ❤️ by Kofu | TASHKY Bot',
                iconURL: 'https://i.imgur.com/kofu-avatar.png'
            })
            .setTimestamp();
    }

    /**
     * Créer un embed d'information avec signature Kofu
     * @param {string} title - Titre de l'information
     * @param {string} description - Description de l'information
     * @returns {EmbedBuilder} Embed d'information
     * @author Kofu
     */
    static createInfoEmbed(title, description) {
        return new EmbedBuilder()
            .setTitle(`ℹ️ ${title}`)
            .setDescription(description)
            .setColor('#00B0F4')
            .setFooter({
                text: '✨ Made with ❤️ by Kofu | TASHKY Bot',
                iconURL: 'https://i.imgur.com/kofu-avatar.png'
            })
            .setTimestamp();
    }

    /**
     * Obtenir le footer standard Kofu
     * @returns {object} Footer object pour Discord
     * @author Kofu
     */
    static getKofuFooter() {
        return {
            text: '✨ Made with ❤️ by Kofu | TASHKY Bot',
            iconURL: 'https://i.imgur.com/kofu-avatar.png'
        };
    }

    /**
     * Obtenir les couleurs du thème Kofu
     * @returns {object} Objet avec les couleurs
     * @author Kofu
     */
    static getKofuColors() {
        return {
            primary: '#5865F2',
            success: '#43B581',
            error: '#F04747',
            warning: '#FAA61A',
            info: '#00B0F4',
            kofu: '#FF69B4'
        };
    }

    /**
     * Obtenir les emojis du thème Kofu
     * @returns {object} Objet avec les emojis
     * @author Kofu
     */
    static getKofuEmojis() {
        return {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            loading: '⏳',
            kofu: '✨',
            owner: '👑',
            mod: '🛡️',
            ticket: '🎫',
            music: '🎵',
            fun: '🎮',
            heart: '❤️',
            star: '⭐',
            rocket: '🚀'
        };
    }

    /**
     * Créer un message de crédits complet
     * @returns {string} Message de crédits formaté
     * @author Kofu
     */
    static getCreditsMessage() {
        return `
╔══════════════════════════════════════╗
║            TASHKY BOT                ║
║        Ultimate Edition              ║
╠══════════════════════════════════════╣
║                                      ║
║  👨‍💻 Développeur: Kofu                ║
║  🔗 GitHub: github.com/kofudev       ║
║  📧 Contact: kofu@example.com        ║
║  💖 Licence: MIT                     ║
║                                      ║
║  🎯 Version: 1.0.0                   ║
║  📅 Créé: Février 2026               ║
║  🚀 Statut: Actif                    ║
║                                      ║
╠══════════════════════════════════════╣
║  Merci d'utiliser TASHKY Bot ! ❤️    ║
║  ✨ Made with ❤️ by Kofu             ║
╚══════════════════════════════════════╝
        `;
    }

    /**
     * Logger un message avec style Kofu
     * @param {string} message - Message à logger
     * @param {string} type - Type de log (info, warn, error, success)
     * @author Kofu
     */
    static log(message, type = 'info') {
        const timestamp = new Date().toLocaleString('fr-FR');
        const prefix = '✨ [Kofu]';
        
        switch (type) {
            case 'success':
                console.log(`✅ ${prefix} ${message}`);
                break;
            case 'error':
                console.error(`❌ ${prefix} ${message}`);
                break;
            case 'warn':
                console.warn(`⚠️ ${prefix} ${message}`);
                break;
            case 'info':
            default:
                console.log(`ℹ️ ${prefix} ${message}`);
                break;
        }
    }

    /**
     * Afficher les statistiques du bot avec style
     * @param {object} stats - Statistiques du bot
     * @author Kofu
     */
    static showStats(stats) {
        console.log('\n' + '═'.repeat(50));
        console.log('📊 STATISTIQUES TASHKY BOT');
        console.log('═'.repeat(50));
        console.log(`🏛️ Serveurs: ${stats.guilds || 0}`);
        console.log(`👥 Utilisateurs: ${stats.users || 0}`);
        console.log(`⚙️ Commandes: ${stats.commands || 0}`);
        console.log(`💬 Messages: ${stats.messages || 0}`);
        console.log(`⏱️ Uptime: ${stats.uptime || '0s'}`);
        console.log(`📊 Ping: ${stats.ping || 0}ms`);
        console.log('═'.repeat(50));
        console.log('✨ Made with ❤️ by Kofu');
        console.log('═'.repeat(50) + '\n');
    }

    /**
     * Créer un embed de profil Kofu
     * @returns {EmbedBuilder} Embed de profil
     * @author Kofu
     */
    static createKofuProfileEmbed() {
        return new EmbedBuilder()
            .setTitle('👨‍💻 Profil du Développeur')
            .setDescription('**Kofu** - Créateur de TASHKY Bot')
            .addFields(
                { name: '🔗 GitHub', value: '[github.com/kofudev](https://github.com/kofudev)', inline: true },
                { name: '💼 Spécialité', value: 'Bots Discord & Web Dev', inline: true },
                { name: '🌍 Localisation', value: 'France 🇫🇷', inline: true },
                { name: '💖 Philosophie', value: 'Code humain, lisible et passionné', inline: false },
                { name: '🎯 Mission', value: 'Créer des outils qui améliorent l\'expérience Discord', inline: false }
            )
            .setColor('#FF69B4')
            .setThumbnail('https://i.imgur.com/kofu-avatar.png')
            .setFooter({
                text: '✨ Made with ❤️ by Kofu | TASHKY Bot',
                iconURL: 'https://i.imgur.com/kofu-avatar.png'
            })
            .setTimestamp();
    }
}

// Exporter la classe KofuSignature
module.exports = KofuSignature;

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */