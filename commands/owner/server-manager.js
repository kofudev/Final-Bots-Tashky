/**
 * ====================================
 * COMMANDE OWNER: /server-manager
 * ====================================
 * 
 * Gestionnaire avancé de serveurs
 * Contrôle total sur tous les serveurs
 * 
 * @author Kofu (github.com/kofudev)
 * @category Owner Commands
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server-manager')
        .setDescription('👑 [OWNER] Gestionnaire avancé de serveurs')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action à effectuer')
                .setRequired(false)
                .addChoices(
                    { name: '📋 Lister tous les serveurs', value: 'list' },
                    { name: '🔍 Analyser un serveur', value: 'analyze' },
                    { name: '💾 Backup serveur', value: 'backup' },
                    { name: '🚪 Quitter serveur', value: 'leave' },
                    { name: '📊 Statistiques', value: 'stats' }
                )
        )
        .addStringOption(option =>
            option.setName('serveur-id')
                .setDescription('ID du serveur (pour actions spécifiques)')
                .setRequired(false)
        ),
    
    category: 'owner',
    cooldown: 0,
    ownerOnly: true,
    
    /**
     * Exécution de la commande server-manager
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        // Vérifier que c'est un owner
        const owners = process.env.BOT_OWNERS ? JSON.parse(process.env.BOT_OWNERS) : [];
        if (!owners.includes(interaction.user.id)) {
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Accès refusé !',
                'Cette commande est réservée aux propriétaires du bot.'
            );
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        const action = interaction.options.getString('action');
        const serverId = interaction.options.getString('serveur-id');
        
        // Logger l'accès
        interaction.client.logger.logOwnerAction(
            interaction.user,
            'SERVER_MANAGER_ACCESS',
            { action, serverId, timestamp: new Date() }
        );
        
        if (!action) {
            await showServerManagerMain(interaction);
        } else {
            await handleServerAction(interaction, action, serverId);
        }
    }
};

/**
 * Afficher le gestionnaire principal
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @author Kofu
 */
async function showServerManagerMain(interaction) {
    const client = interaction.client;
    const guilds = client.guilds.cache;
    
    // Calculer les statistiques
    const totalMembers = guilds.reduce((sum, guild) => sum + guild.memberCount, 0);
    const avgMembers = Math.round(totalMembers / guilds.size);
    const largestGuild = guilds.reduce((max, guild) => guild.memberCount > max.memberCount ? guild : max);
    const smallestGuild = guilds.reduce((min, guild) => guild.memberCount < min.memberCount ? guild : min);
    
    // Top 5 serveurs
    const topGuilds = guilds
        .sort((a, b) => b.memberCount - a.memberCount)
        .first(5)
        .map((guild, index) => `**${index + 1}.** ${guild.name} - ${guild.memberCount} membres`)
        .join('\n');
    
    const managerEmbed = new EmbedBuilder()
        .setTitle('🏛️ Gestionnaire de Serveurs')
        .setDescription(
            '**Contrôle total sur tous les serveurs du bot**\n\n' +
            '🔧 **Fonctionnalités disponibles:**\n' +
            '• Analyse détaillée des serveurs\n' +
            '• Backup et restauration\n' +
            '• Gestion des permissions\n' +
            '• Statistiques avancées\n' +
            '• Actions de modération globale'
        )
        .setColor('#5865F2')
        .addFields(
            {
                name: '📊 Statistiques Globales',
                value: 
                    `🏛️ **Total serveurs:** ${guilds.size}\n` +
                    `👥 **Total membres:** ${totalMembers.toLocaleString()}\n` +
                    `📈 **Moyenne/serveur:** ${avgMembers}\n` +
                    `🏆 **Plus grand:** ${largestGuild.memberCount} membres`,
                inline: true
            },
            {
                name: '📈 Répartition',
                value: 
                    `🔸 **> 1000 membres:** ${guilds.filter(g => g.memberCount > 1000).size}\n` +
                    `🔹 **100-1000 membres:** ${guilds.filter(g => g.memberCount >= 100 && g.memberCount <= 1000).size}\n` +
                    `🔸 **< 100 membres:** ${guilds.filter(g => g.memberCount < 100).size}\n` +
                    `🔹 **Plus petit:** ${smallestGuild.memberCount} membres`,
                inline: true
            }
        )
        .addFields({
            name: '🏆 Top 5 Serveurs',
            value: topGuilds,
            inline: false
        })
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    // Créer le menu d'actions
    const actionMenu = new StringSelectMenuBuilder()
        .setCustomId('server_manager_action')
        .setPlaceholder('🔧 Sélectionne une action...')
        .addOptions([
            {
                label: 'Liste Complète',
                description: 'Afficher tous les serveurs avec pagination',
                value: 'list_all',
                emoji: '📋'
            },
            {
                label: 'Analyser Serveur',
                description: 'Analyse détaillée d\'un serveur spécifique',
                value: 'analyze_server',
                emoji: '🔍'
            },
            {
                label: 'Backup Serveur',
                description: 'Créer un backup complet d\'un serveur',
                value: 'backup_server',
                emoji: '💾'
            },
            {
                label: 'Quitter Serveur',
                description: 'Faire quitter le bot d\'un serveur',
                value: 'leave_server',
                emoji: '🚪'
            },
            {
                label: 'Statistiques Avancées',
                description: 'Rapports et analytics détaillés',
                value: 'advanced_stats',
                emoji: '📊'
            }
        ]);
    
    const quickButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('server_refresh_stats')
                .setLabel('🔄 Actualiser')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('server_backup_all')
                .setLabel('💾 Backup Tous')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('server_export_list')
                .setLabel('📤 Exporter Liste')
                .setStyle(ButtonStyle.Secondary)
        );
    
    const menuRow = new ActionRowBuilder().addComponents(actionMenu);
    
    await interaction.reply({
        embeds: [managerEmbed],
        components: [menuRow, quickButtons],
        ephemeral: true
    });
    
    // Gérer les interactions
    handleServerManagerInteractions(interaction, client);
}

/**
 * Gérer les interactions du gestionnaire
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
function handleServerManagerInteractions(interaction, client) {
    const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 600000 // 10 minutes
    });
    
    collector.on('collect', async i => {
        try {
            if (i.isStringSelectMenu()) {
                const action = i.values[0];
                await handleServerManagerAction(i, action, client);
            } else if (i.isButton()) {
                await handleServerManagerButton(i, client);
            }
        } catch (error) {
            console.error('❌ [Kofu] Erreur server manager:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur du Gestionnaire !',
                `Une erreur est survenue: \`${error.message}\``
            );
            
            await i.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    });
}

/**
 * Gérer les actions du gestionnaire
 * @param {StringSelectMenuInteraction} interaction - L'interaction
 * @param {string} action - Action sélectionnée
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function handleServerManagerAction(interaction, action, client) {
    switch (action) {
        case 'list_all':
            await showServerList(interaction, client);
            break;
        case 'analyze_server':
            await showServerAnalyzer(interaction, client);
            break;
        case 'backup_server':
            await showServerBackup(interaction, client);
            break;
        case 'leave_server':
            await showServerLeave(interaction, client);
            break;
        case 'advanced_stats':
            await showAdvancedStats(interaction, client);
            break;
        default:
            await interaction.reply({ content: '❌ Action inconnue !', ephemeral: true });
    }
}

/**
 * Afficher la liste complète des serveurs
 * @param {StringSelectMenuInteraction} interaction - L'interaction
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function showServerList(interaction, client) {
    const guilds = client.guilds.cache.sort((a, b) => b.memberCount - a.memberCount);
    const guildsPerPage = 10;
    const totalPages = Math.ceil(guilds.size / guildsPerPage);
    let currentPage = 1;
    
    const createListEmbed = (page) => {
        const startIndex = (page - 1) * guildsPerPage;
        const endIndex = Math.min(startIndex + guildsPerPage, guilds.size);
        const pageGuilds = guilds.toJSON().slice(startIndex, endIndex);
        
        const guildList = pageGuilds.map((guild, index) => {
            const globalIndex = startIndex + index + 1;
            const owner = guild.members.cache.get(guild.ownerId);
            return `**${globalIndex}.** ${guild.name}\n` +
                   `   📊 ${guild.memberCount} membres • 🆔 \`${guild.id}\`\n` +
                   `   👑 ${owner ? owner.user.tag : 'Propriétaire inconnu'}\n` +
                   `   📅 Rejoint: <t:${Math.floor(guild.joinedTimestamp / 1000)}:D>`;
        }).join('\n\n');
        
        return new EmbedBuilder()
            .setTitle(`📋 Liste des Serveurs (Page ${page}/${totalPages})`)
            .setDescription(guildList || 'Aucun serveur sur cette page.')
            .setColor('#3498DB')
            .addFields({
                name: '📊 Résumé',
                value: `**Total:** ${guilds.size} serveurs • **Page:** ${page}/${totalPages}`,
                inline: false
            })
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
    };
    
    const createNavigationButtons = (page) => {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('server_list_first')
                    .setLabel('⏮️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 1),
                new ButtonBuilder()
                    .setCustomId('server_list_prev')
                    .setLabel('◀️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 1),
                new ButtonBuilder()
                    .setCustomId('server_list_info')
                    .setLabel(`${page}/${totalPages}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('server_list_next')
                    .setLabel('▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages),
                new ButtonBuilder()
                    .setCustomId('server_list_last')
                    .setLabel('⏭️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages)
            );
    };
    
    await interaction.update({
        embeds: [createListEmbed(currentPage)],
        components: [createNavigationButtons(currentPage)]
    });
    
    // Gérer la pagination
    const listCollector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id && i.customId.startsWith('server_list_'),
        time: 300000
    });
    
    listCollector.on('collect', async i => {
        if (i.customId === 'server_list_first') currentPage = 1;
        else if (i.customId === 'server_list_prev') currentPage = Math.max(1, currentPage - 1);
        else if (i.customId === 'server_list_next') currentPage = Math.min(totalPages, currentPage + 1);
        else if (i.customId === 'server_list_last') currentPage = totalPages;
        
        await i.update({
            embeds: [createListEmbed(currentPage)],
            components: [createNavigationButtons(currentPage)]
        });
    });
}

/**
 * Gérer les actions spécifiques
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {string} action - Action à effectuer
 * @param {string} serverId - ID du serveur
 * @author Kofu
 */
async function handleServerAction(interaction, action, serverId) {
    switch (action) {
        case 'list':
            await showServerManagerMain(interaction);
            break;
        case 'analyze':
            if (!serverId) {
                return interaction.reply({ content: '❌ ID du serveur requis pour l\'analyse !', ephemeral: true });
            }
            await analyzeSpecificServer(interaction, serverId);
            break;
        case 'backup':
            if (!serverId) {
                return interaction.reply({ content: '❌ ID du serveur requis pour le backup !', ephemeral: true });
            }
            await backupSpecificServer(interaction, serverId);
            break;
        case 'leave':
            if (!serverId) {
                return interaction.reply({ content: '❌ ID du serveur requis pour quitter !', ephemeral: true });
            }
            await leaveSpecificServer(interaction, serverId);
            break;
        case 'stats':
            await showServerStats(interaction);
            break;
        default:
            await showServerManagerMain(interaction);
    }
}

// Fonctions simplifiées pour les actions spécifiques
async function showServerAnalyzer(interaction, client) {
    await interaction.reply({ content: '🔍 Analyseur de serveur en développement...', ephemeral: true });
}

async function showServerBackup(interaction, client) {
    await interaction.reply({ content: '💾 Backup de serveur en développement...', ephemeral: true });
}

async function showServerLeave(interaction, client) {
    await interaction.reply({ content: '🚪 Quitter serveur en développement...', ephemeral: true });
}

async function showAdvancedStats(interaction, client) {
    await interaction.reply({ content: '📊 Statistiques avancées en développement...', ephemeral: true });
}

async function handleServerManagerButton(interaction, client) {
    await interaction.reply({ content: '🔧 Action en développement...', ephemeral: true });
}

async function analyzeSpecificServer(interaction, serverId) {
    await interaction.reply({ content: `🔍 Analyse du serveur ${serverId} en cours...`, ephemeral: true });
}

async function backupSpecificServer(interaction, serverId) {
    await interaction.reply({ content: `💾 Backup du serveur ${serverId} en cours...`, ephemeral: true });
}

async function leaveSpecificServer(interaction, serverId) {
    await interaction.reply({ content: `🚪 Quitter le serveur ${serverId} en cours...`, ephemeral: true });
}

async function showServerStats(interaction) {
    await interaction.reply({ content: '📊 Statistiques des serveurs en cours...', ephemeral: true });
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */