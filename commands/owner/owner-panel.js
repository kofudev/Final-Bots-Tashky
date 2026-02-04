/**
 * ====================================
 * COMMANDE OWNER: /owner-panel
 * ====================================
 * 
 * Panel de contrôle TOTAL pour les owners
 * Accès à TOUTES les fonctionnalités du bot
 * 
 * ⚠️ COMMANDE EXTRÊMEMENT PUISSANTE ⚠️
 * 
 * @author Kofu (github.com/kofudev)
 * @category Owner Commands
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('owner-panel')
        .setDescription('👑 [OWNER] Panel de contrôle total du bot'),
    
    category: 'owner',
    cooldown: 0, // Pas de cooldown pour les owners
    ownerOnly: true,
    
    /**
     * Exécution de la commande owner-panel
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        // Vérifier que c'est un owner
        const owners = process.env.BOT_OWNERS ? JSON.parse(process.env.BOT_OWNERS) : [];
        if (!owners.includes(interaction.user.id)) {
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Accès refusé !',
                'Cette commande est réservée aux propriétaires du bot (Kofu & co).'
            );
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        // Logger l'accès au panel owner
        interaction.client.logger.logOwnerAction(
            interaction.user,
            'OWNER_PANEL_ACCESS',
            { 
                guild: interaction.guild ? { id: interaction.guild.id, name: interaction.guild.name } : null,
                timestamp: new Date()
            }
        );
        
        // Afficher le panel principal
        await showMainPanel(interaction);
    }
};

/**
 * Afficher le panel principal
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @author Kofu
 */
async function showMainPanel(interaction) {
    const client = interaction.client;
    
    // Récupérer les statistiques globales
    const globalData = client.database.read('globaldata.json') || client.database.getDefaultGlobalData();
    const uptime = formatUptime(client.uptime);
    
    // Créer l'embed principal du panel
    const panelEmbed = new EmbedBuilder()
        .setTitle('👑 OWNER PANEL - Contrôle Total')
        .setDescription(
            '**Bienvenue dans le panel de contrôle TASHKY Bot !** 🚀\n\n' +
            '⚠️ **ATTENTION:** Ce panel donne accès à des fonctionnalités EXTRÊMEMENT puissantes.\n' +
            '🔒 **Sécurité:** Toutes les actions sont loggées et tracées.\n\n' +
            '**Utilise le menu ci-dessous pour naviguer** 👇'
        )
        .setColor('#FFD700')
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            {
                name: '📊 Statistiques Globales',
                value: 
                    `🏛️ **Serveurs:** \`${client.guilds.cache.size}\`\n` +
                    `👥 **Utilisateurs:** \`${client.users.cache.size}\`\n` +
                    `📺 **Salons:** \`${client.channels.cache.size}\`\n` +
                    `⚙️ **Commandes:** \`${client.commands.size}\``,
                inline: true
            },
            {
                name: '⚡ Performance Système',
                value: 
                    `🏓 **Ping:** \`${client.ws.ping}ms\`\n` +
                    `⏱️ **Uptime:** \`${uptime}\`\n` +
                    `💾 **RAM:** \`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB\`\n` +
                    `🖥️ **Node.js:** \`${process.version}\``,
                inline: true
            },
            {
                name: '🔧 Informations Owner',
                value: 
                    `👤 **Owner:** ${interaction.user.tag}\n` +
                    `🆔 **ID:** \`${interaction.user.id}\`\n` +
                    `📅 **Accès:** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
                    `🌍 **Serveur:** ${interaction.guild ? interaction.guild.name : 'DM'}`,
                inline: false
            }
        )
        .setFooter({ text: '✨ Made with ❤️ by Kofu | OWNER PANEL - ACCÈS TOTAL' })
        .setTimestamp();
    
    // Créer le menu de navigation principal
    const mainMenu = new StringSelectMenuBuilder()
        .setCustomId('owner_main_menu')
        .setPlaceholder('👑 Sélectionne une catégorie...')
        .addOptions([
            {
                label: 'Gestion des Serveurs',
                description: 'Contrôle total sur tous les serveurs',
                value: 'servers',
                emoji: '🏛️'
            },
            {
                label: 'Gestion des Utilisateurs',
                description: 'Analyse et gestion des utilisateurs',
                value: 'users',
                emoji: '👥'
            },
            {
                label: 'Système & Maintenance',
                description: 'Maintenance, logs, backups',
                value: 'system',
                emoji: '🔧'
            },
            {
                label: 'Base de Données',
                description: 'Gestion de la base de données',
                value: 'database',
                emoji: '💾'
            },
            {
                label: 'Sécurité & Modération',
                description: 'Blacklist, bans globaux, sécurité',
                value: 'security',
                emoji: '🛡️'
            },
            {
                label: 'Statistiques Avancées',
                description: 'Analytics et rapports détaillés',
                value: 'analytics',
                emoji: '📊'
            }
        ]);
    
    // Créer les boutons d'action rapide
    const quickActions = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('owner_emergency_stop')
                .setLabel('🚨 ARRÊT D\'URGENCE')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('owner_reload_all')
                .setLabel('🔄 Recharger Tout')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('owner_backup_all')
                .setLabel('💾 Backup Global')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('owner_logs')
                .setLabel('📝 Logs Récents')
                .setStyle(ButtonStyle.Secondary)
        );
    
    const menuRow = new ActionRowBuilder().addComponents(mainMenu);
    
    await interaction.reply({
        embeds: [panelEmbed],
        components: [menuRow, quickActions],
        ephemeral: true
    });
    
    // Gérer les interactions du panel
    handlePanelInteractions(interaction, client);
    
    console.log(`👑 [Kofu] Owner panel ouvert par ${interaction.user.tag}`);
}

/**
 * Gérer les interactions du panel
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
function handlePanelInteractions(interaction, client) {
    const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 600000 // 10 minutes
    });
    
    collector.on('collect', async i => {
        try {
            // Logger toutes les actions
            client.logger.logOwnerAction(
                i.user,
                'OWNER_PANEL_ACTION',
                { action: i.customId, values: i.values }
            );
            
            if (i.isStringSelectMenu()) {
                const category = i.values[0];
                await handleCategorySelection(i, category, client);
            } else if (i.isButton()) {
                await handleButtonAction(i, client);
            }
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur interaction owner panel:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur du Panel !',
                `Une erreur est survenue: \`${error.message}\``
            );
            
            await i.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    });
    
    collector.on('end', () => {
        console.log(`⏱️ [Kofu] Owner panel fermé pour ${interaction.user.tag}`);
    });
}

/**
 * Gérer la sélection de catégorie
 * @param {StringSelectMenuInteraction} interaction - L'interaction de menu
 * @param {string} category - Catégorie sélectionnée
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function handleCategorySelection(interaction, category, client) {
    switch (category) {
        case 'servers':
            await showServersPanel(interaction, client);
            break;
        case 'users':
            await showUsersPanel(interaction, client);
            break;
        case 'system':
            await showSystemPanel(interaction, client);
            break;
        case 'database':
            await showDatabasePanel(interaction, client);
            break;
        case 'security':
            await showSecurityPanel(interaction, client);
            break;
        case 'analytics':
            await showAnalyticsPanel(interaction, client);
            break;
        default:
            await interaction.reply({ content: '❌ Catégorie inconnue !', ephemeral: true });
    }
}

/**
 * Afficher le panel des serveurs
 * @param {StringSelectMenuInteraction} interaction - L'interaction
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function showServersPanel(interaction, client) {
    const guilds = client.guilds.cache;
    const guildList = guilds.map(guild => 
        `**${guild.name}** (\`${guild.id}\`) - ${guild.memberCount} membres`
    ).slice(0, 10).join('\n');
    
    const serversEmbed = new EmbedBuilder()
        .setTitle('🏛️ Gestion des Serveurs')
        .setDescription(
            `**Contrôle total sur ${guilds.size} serveur(s)**\n\n` +
            `**Top 10 serveurs:**\n${guildList}\n\n` +
            `*Utilise les boutons ci-dessous pour des actions spécifiques*`
        )
        .setColor('#5865F2')
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    const serverButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('owner_server_list_all')
                .setLabel('📋 Liste Complète')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('owner_server_backup_all')
                .setLabel('💾 Backup Tous')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('owner_server_leave')
                .setLabel('🚪 Quitter Serveur')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('owner_back_main')
                .setLabel('🔙 Retour')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.update({
        embeds: [serversEmbed],
        components: [serverButtons]
    });
}

/**
 * Afficher le panel des utilisateurs
 * @param {StringSelectMenuInteraction} interaction - L'interaction
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function showUsersPanel(interaction, client) {
    const users = client.users.cache;
    
    const usersEmbed = new EmbedBuilder()
        .setTitle('👥 Gestion des Utilisateurs')
        .setDescription(
            `**Contrôle sur ${users.size} utilisateur(s)**\n\n` +
            `🔍 **Recherche avancée d'utilisateurs**\n` +
            `📊 **Analyse comportementale**\n` +
            `🚫 **Gestion de la blacklist**\n` +
            `🔨 **Bans globaux**\n\n` +
            `*Utilise les boutons pour des actions spécifiques*`
        )
        .setColor('#43B581')
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    const userButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('owner_user_search')
                .setLabel('🔍 Rechercher User')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('owner_user_blacklist')
                .setLabel('🚫 Blacklist')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('owner_user_global_ban')
                .setLabel('🔨 Ban Global')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('owner_back_main')
                .setLabel('🔙 Retour')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.update({
        embeds: [usersEmbed],
        components: [userButtons]
    });
}

/**
 * Gérer les actions des boutons
 * @param {ButtonInteraction} interaction - L'interaction de bouton
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function handleButtonAction(interaction, client) {
    switch (interaction.customId) {
        case 'owner_emergency_stop':
            await handleEmergencyStop(interaction, client);
            break;
        case 'owner_reload_all':
            await handleReloadAll(interaction, client);
            break;
        case 'owner_backup_all':
            await handleBackupAll(interaction, client);
            break;
        case 'owner_logs':
            await handleShowLogs(interaction, client);
            break;
        case 'owner_back_main':
            await showMainPanel(interaction);
            break;
        default:
            await interaction.reply({ content: '🚧 Fonctionnalité en développement !', ephemeral: true });
    }
}

/**
 * Gérer l'arrêt d'urgence
 * @param {ButtonInteraction} interaction - L'interaction
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function handleEmergencyStop(interaction, client) {
    const confirmEmbed = KofuSignature.createWarningEmbed(
        '🚨 ARRÊT D\'URGENCE',
        '⚠️ **ATTENTION !** Tu es sur le point d\'arrêter complètement le bot.\n\n' +
        '**Conséquences:**\n' +
        '• Le bot sera déconnecté de Discord\n' +
        '• Toutes les fonctionnalités seront interrompues\n' +
        '• Un redémarrage manuel sera nécessaire\n\n' +
        '**Es-tu sûr de vouloir continuer ?**'
    );
    
    const confirmButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('owner_emergency_confirm')
                .setLabel('🚨 CONFIRMER L\'ARRÊT')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('owner_emergency_cancel')
                .setLabel('❌ Annuler')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.update({
        embeds: [confirmEmbed],
        components: [confirmButtons]
    });
    
    // Gérer la confirmation
    const confirmCollector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 30000 // 30 secondes
    });
    
    confirmCollector.on('collect', async i => {
        if (i.customId === 'owner_emergency_confirm') {
            // Logger l'arrêt d'urgence
            client.logger.logOwnerAction(
                i.user,
                'EMERGENCY_STOP',
                { reason: 'Manual emergency stop by owner', timestamp: new Date() }
            );
            
            const shutdownEmbed = KofuSignature.createErrorEmbed(
                '🚨 ARRÊT D\'URGENCE ACTIVÉ',
                'Le bot va s\'arrêter dans 5 secondes...\n\n**Arrêt initié par:** ' + i.user.tag
            );
            
            await i.update({ embeds: [shutdownEmbed], components: [] });
            
            console.log(`🚨 [Kofu] ARRÊT D'URGENCE initié par ${i.user.tag}`);
            
            // Arrêter le bot après 5 secondes
            setTimeout(() => {
                process.exit(0);
            }, 5000);
            
        } else {
            await showMainPanel(i);
        }
    });
}

/**
 * Formater l'uptime
 * @param {number} uptime - Uptime en millisecondes
 * @returns {string} Uptime formaté
 * @author Kofu
 */
function formatUptime(uptime) {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days}j ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else {
        return `${minutes}m ${seconds % 60}s`;
    }
}

// Fonctions supplémentaires (simplifiées pour l'exemple)
async function handleReloadAll(interaction, client) {
    await interaction.reply({ content: '🔄 Rechargement en cours...', ephemeral: true });
}

async function handleBackupAll(interaction, client) {
    await interaction.reply({ content: '💾 Backup global en cours...', ephemeral: true });
}

async function handleShowLogs(interaction, client) {
    await interaction.reply({ content: '📝 Affichage des logs récents...', ephemeral: true });
}

async function showSystemPanel(interaction, client) {
    await interaction.reply({ content: '🔧 Panel système en développement...', ephemeral: true });
}

async function showDatabasePanel(interaction, client) {
    await interaction.reply({ content: '💾 Panel base de données en développement...', ephemeral: true });
}

async function showSecurityPanel(interaction, client) {
    await interaction.reply({ content: '🛡️ Panel sécurité en développement...', ephemeral: true });
}

async function showAnalyticsPanel(interaction, client) {
    await interaction.reply({ content: '📊 Panel analytics en développement...', ephemeral: true });
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */