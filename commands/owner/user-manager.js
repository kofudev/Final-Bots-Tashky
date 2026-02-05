/**
 * ====================================
 * COMMANDE OWNER: /user-manager
 * ====================================
 * 
 * Gestionnaire avancé d'utilisateurs
 * Contrôle total sur tous les utilisateurs
 * 
 * @author Kofu (github.com/kofudev)
 * @category Owner Commands
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user-manager')
        .setDescription('👑 [OWNER] Gestionnaire avancé d\'utilisateurs')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur à analyser/gérer')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action à effectuer')
                .setRequired(false)
                .addChoices(
                    { name: '🔍 Analyser utilisateur', value: 'analyze' },
                    { name: '🚫 Blacklist utilisateur', value: 'blacklist' },
                    { name: '🔨 Ban global', value: 'globalban' },
                    { name: '📊 Statistiques', value: 'stats' },
                    { name: '🧹 Nettoyer données', value: 'cleanup' }
                )
        ),
    
    category: 'owner',
    cooldown: 0,
    ownerOnly: true,
    
    /**
     * Exécution de la commande user-manager
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
        
        const targetUser = interaction.options.getUser('utilisateur');
        const action = interaction.options.getString('action');
        
        // Logger l'accès
        interaction.client.logger.logOwnerAction(
            interaction.user,
            'USER_MANAGER_ACCESS',
            { 
                targetUser: targetUser ? { id: targetUser.id, tag: targetUser.tag } : null,
                action,
                timestamp: new Date()
            }
        );
        
        if (targetUser && action) {
            await handleUserAction(interaction, targetUser, action);
        } else if (targetUser) {
            await showUserDetails(interaction, targetUser);
        } else {
            await showUserManagerMain(interaction);
        }
    }
};

/**
 * Afficher le gestionnaire principal
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @author Kofu
 */
async function showUserManagerMain(interaction) {
    const client = interaction.client;
    const users = client.users.cache;
    const usersData = client.database.read('users.json') || {};
    const blacklistData = client.database.read('blacklist.json') || { users: [] };
    const globalBansData = client.database.read('sanctions/global_bans.json') || { bans: [] };
    
    // Calculer les statistiques
    const totalUsers = users.size;
    const registeredUsers = Object.keys(usersData).length;
    const blacklistedUsers = blacklistData.users?.length || 0;
    const globallyBannedUsers = globalBansData.bans?.filter(b => b.active)?.length || 0;
    
    // Analyser l'activité
    const activeUsers = Object.values(usersData).filter(u => 
        u.lastSeen && (Date.now() - new Date(u.lastSeen).getTime()) < 7 * 24 * 60 * 60 * 1000
    ).length;
    
    // Top utilisateurs par commandes
    const topUsers = Object.entries(usersData)
        .filter(([id, data]) => data.globalStats?.totalCommands > 0)
        .sort(([,a], [,b]) => (b.globalStats?.totalCommands || 0) - (a.globalStats?.totalCommands || 0))
        .slice(0, 5)
        .map(([id, data], index) => {
            const user = client.users.cache.get(id);
            const username = user ? user.tag : data.username || 'Utilisateur inconnu';
            return `**${index + 1}.** ${username} - ${data.globalStats.totalCommands} commandes`;
        })
        .join('\n');
    
    const managerEmbed = new EmbedBuilder()
        .setTitle('👥 Gestionnaire d\'Utilisateurs')
        .setDescription(
            '**Contrôle total sur tous les utilisateurs du bot**\n\n' +
            '🔧 **Fonctionnalités disponibles:**\n' +
            '• Analyse comportementale détaillée\n' +
            '• Gestion de la blacklist globale\n' +
            '• Bans globaux multi-serveurs\n' +
            '• Statistiques et rapports\n' +
            '• Nettoyage des données utilisateur'
        )
        .setColor('#43B581')
        .addFields(
            {
                name: '📊 Statistiques Globales',
                value: 
                    `👥 **Total utilisateurs:** ${totalUsers.toLocaleString()}\n` +
                    `📝 **Enregistrés:** ${registeredUsers.toLocaleString()}\n` +
                    `✅ **Actifs (7j):** ${activeUsers.toLocaleString()}\n` +
                    `📈 **Taux activité:** ${registeredUsers > 0 ? Math.round((activeUsers / registeredUsers) * 100) : 0}%`,
                inline: true
            },
            {
                name: '🛡️ Sécurité',
                value: 
                    `🚫 **Blacklistés:** ${blacklistedUsers}\n` +
                    `🔨 **Bans globaux:** ${globallyBannedUsers}\n` +
                    `⚠️ **Signalements:** 0\n` +
                    `🔍 **Surveillance:** Actif`,
                inline: true
            }
        )
        .addFields({
            name: '🏆 Top 5 Utilisateurs (Commandes)',
            value: topUsers || 'Aucune donnée disponible',
            inline: false
        })
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    // Créer le menu d'actions
    const actionMenu = new StringSelectMenuBuilder()
        .setCustomId('user_manager_action')
        .setPlaceholder('🔧 Sélectionne une action...')
        .addOptions([
            {
                label: 'Rechercher Utilisateur',
                description: 'Recherche avancée d\'utilisateurs',
                value: 'search_user',
                emoji: '🔍'
            },
            {
                label: 'Analyser Comportement',
                description: 'Analyse comportementale détaillée',
                value: 'analyze_behavior',
                emoji: '📊'
            },
            {
                label: 'Gérer Blacklist',
                description: 'Gestion de la blacklist globale',
                value: 'manage_blacklist',
                emoji: '🚫'
            },
            {
                label: 'Bans Globaux',
                description: 'Gestion des bans multi-serveurs',
                value: 'global_bans',
                emoji: '🔨'
            },
            {
                label: 'Nettoyage Données',
                description: 'Nettoyer les données utilisateur',
                value: 'cleanup_data',
                emoji: '🧹'
            },
            {
                label: 'Rapports Avancés',
                description: 'Générer des rapports détaillés',
                value: 'advanced_reports',
                emoji: '📈'
            }
        ]);
    
    const quickButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('user_refresh_stats')
                .setLabel('🔄 Actualiser')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('user_export_data')
                .setLabel('📤 Exporter Données')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('user_security_scan')
                .setLabel('🔍 Scan Sécurité')
                .setStyle(ButtonStyle.Danger)
        );
    
    const menuRow = new ActionRowBuilder().addComponents(actionMenu);
    
    await interaction.reply({
        embeds: [managerEmbed],
        components: [menuRow, quickButtons],
        ephemeral: true
    });
    
    // Gérer les interactions
    handleUserManagerInteractions(interaction, client);
}

/**
 * Afficher les détails d'un utilisateur
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {User} targetUser - Utilisateur cible
 * @author Kofu
 */
async function showUserDetails(interaction, targetUser) {
    const client = interaction.client;
    const userData = client.database.getUser(targetUser.id);
    const blacklistData = client.database.read('blacklist.json') || { users: [] };
    const globalBansData = client.database.read('sanctions/global_bans.json') || { bans: [] };
    
    // Vérifier le statut de sécurité
    const isBlacklisted = blacklistData.users?.includes(targetUser.id) || false;
    const globalBan = globalBansData.bans?.find(b => b.userId === targetUser.id && b.active) || null;
    
    // Calculer les statistiques
    const totalCommands = userData.globalStats?.totalCommands || 0;
    const totalServers = userData.servers?.length || 0;
    const accountAge = Math.floor((Date.now() - targetUser.createdTimestamp) / (24 * 60 * 60 * 1000));
    const lastSeen = userData.lastSeen ? new Date(userData.lastSeen) : null;
    
    // Analyser l'activité récente
    const recentActivity = lastSeen ? 
        (Date.now() - lastSeen.getTime()) < 24 * 60 * 60 * 1000 ? '🟢 Très récente' :
        (Date.now() - lastSeen.getTime()) < 7 * 24 * 60 * 60 * 1000 ? '🟡 Cette semaine' :
        (Date.now() - lastSeen.getTime()) < 30 * 24 * 60 * 60 * 1000 ? '🟠 Ce mois' :
        '🔴 Ancienne' : '⚫ Jamais vu';
    
    const userEmbed = new EmbedBuilder()
        .setTitle(`👤 Analyse Utilisateur - ${targetUser.tag}`)
        .setDescription(`**Analyse complète de l'utilisateur**`)
        .setColor(isBlacklisted ? '#F04747' : globalBan ? '#FF6B6B' : '#43B581')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            {
                name: '📋 Informations de Base',
                value: 
                    `**Nom:** ${targetUser.tag}\n` +
                    `**ID:** \`${targetUser.id}\`\n` +
                    `**Créé:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:D>\n` +
                    `**Âge compte:** ${accountAge} jours`,
                inline: true
            },
            {
                name: '📊 Activité',
                value: 
                    `**Commandes:** ${totalCommands.toLocaleString()}\n` +
                    `**Serveurs:** ${totalServers}\n` +
                    `**Dernière activité:** ${recentActivity}\n` +
                    `**Statut:** ${lastSeen ? `<t:${Math.floor(lastSeen.getTime() / 1000)}:R>` : 'Jamais vu'}`,
                inline: true
            },
            {
                name: '🛡️ Sécurité',
                value: 
                    `**Blacklist:** ${isBlacklisted ? '🚫 OUI' : '✅ Non'}\n` +
                    `**Ban Global:** ${globalBan ? '🔨 OUI' : '✅ Non'}\n` +
                    `**Signalements:** 0\n` +
                    `**Niveau risque:** ${calculateRiskLevel(userData, isBlacklisted, globalBan)}`,
                inline: true
            }
        )
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    // Ajouter des détails sur les sanctions si applicable
    if (isBlacklisted || globalBan) {
        let sanctionDetails = '';
        
        if (isBlacklisted) {
            const blacklistReason = blacklistData.reasons?.[targetUser.id] || 'Raison non spécifiée';
            sanctionDetails += `🚫 **Blacklist:** ${blacklistReason}\n`;
        }
        
        if (globalBan) {
            sanctionDetails += `🔨 **Ban Global:** ${globalBan.reason}\n`;
            sanctionDetails += `📅 **Date:** <t:${Math.floor(new Date(globalBan.timestamp).getTime() / 1000)}:F>\n`;
            sanctionDetails += `👤 **Par:** ${globalBan.moderatorTag}`;
        }
        
        userEmbed.addFields({
            name: '⚠️ Sanctions Actives',
            value: sanctionDetails,
            inline: false
        });
    }
    
    // Boutons d'action
    const actionButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`user_analyze_${targetUser.id}`)
                .setLabel('🔍 Analyse Complète')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`user_blacklist_${targetUser.id}`)
                .setLabel(isBlacklisted ? '✅ Retirer Blacklist' : '🚫 Blacklister')
                .setStyle(isBlacklisted ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`user_globalban_${targetUser.id}`)
                .setLabel(globalBan ? '✅ Retirer Ban' : '🔨 Ban Global')
                .setStyle(globalBan ? ButtonStyle.Success : ButtonStyle.Danger)
        );
    
    await interaction.reply({
        embeds: [userEmbed],
        components: [actionButtons],
        ephemeral: true
    });
}

/**
 * Calculer le niveau de risque d'un utilisateur
 * @param {object} userData - Données utilisateur
 * @param {boolean} isBlacklisted - Si l'utilisateur est blacklisté
 * @param {object} globalBan - Ban global actif
 * @returns {string} Niveau de risque
 * @author Kofu
 */
function calculateRiskLevel(userData, isBlacklisted, globalBan) {
    if (isBlacklisted || globalBan) return '🔴 ÉLEVÉ';
    
    const totalCommands = userData.globalStats?.totalCommands || 0;
    const accountAge = userData.createdAt ? 
        Math.floor((Date.now() - new Date(userData.createdAt).getTime()) / (24 * 60 * 60 * 1000)) : 0;
    
    if (accountAge < 7) return '🟡 MOYEN (Compte récent)';
    if (totalCommands > 1000) return '🟢 FAIBLE (Utilisateur actif)';
    if (totalCommands > 100) return '🟢 FAIBLE';
    
    return '🟡 MOYEN';
}

/**
 * Gérer les interactions du gestionnaire
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
function handleUserManagerInteractions(interaction, client) {
    const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 600000 // 10 minutes
    });
    
    collector.on('collect', async i => {
        try {
            if (i.isStringSelectMenu()) {
                const action = i.values[0];
                await handleUserManagerAction(i, action, client);
            } else if (i.isButton()) {
                await handleUserManagerButton(i, client);
            }
        } catch (error) {
            console.error('❌ [Kofu] Erreur user manager:', error);
            
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
async function handleUserManagerAction(interaction, action, client) {
    switch (action) {
        case 'search_user':
            await showUserSearch(interaction, client);
            break;
        case 'analyze_behavior':
            await showBehaviorAnalysis(interaction, client);
            break;
        case 'manage_blacklist':
            await showBlacklistManager(interaction, client);
            break;
        case 'global_bans':
            await showGlobalBansManager(interaction, client);
            break;
        case 'cleanup_data':
            await showDataCleanup(interaction, client);
            break;
        case 'advanced_reports':
            await showAdvancedReports(interaction, client);
            break;
        default:
            await interaction.reply({ content: '❌ Action inconnue !', ephemeral: true });
    }
}

/**
 * Gérer une action spécifique sur un utilisateur
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {User} targetUser - Utilisateur cible
 * @param {string} action - Action à effectuer
 * @author Kofu
 */
async function handleUserAction(interaction, targetUser, action) {
    switch (action) {
        case 'analyze':
            await showUserDetails(interaction, targetUser);
            break;
        case 'blacklist':
            await toggleUserBlacklist(interaction, targetUser);
            break;
        case 'globalban':
            await toggleUserGlobalBan(interaction, targetUser);
            break;
        case 'stats':
            await showUserStats(interaction, targetUser);
            break;
        case 'cleanup':
            await cleanupUserData(interaction, targetUser);
            break;
        default:
            await showUserDetails(interaction, targetUser);
    }
}

// Fonctions simplifiées pour les actions spécifiques
async function showUserSearch(interaction, client) {
    await interaction.reply({ content: '🔍 Recherche d\'utilisateur en développement...', ephemeral: true });
}

async function showBehaviorAnalysis(interaction, client) {
    await interaction.reply({ content: '📊 Analyse comportementale en développement...', ephemeral: true });
}

async function showBlacklistManager(interaction, client) {
    await interaction.reply({ content: '🚫 Gestionnaire de blacklist en développement...', ephemeral: true });
}

async function showGlobalBansManager(interaction, client) {
    await interaction.reply({ content: '🔨 Gestionnaire de bans globaux en développement...', ephemeral: true });
}

async function showDataCleanup(interaction, client) {
    await interaction.reply({ content: '🧹 Nettoyage de données en développement...', ephemeral: true });
}

async function showAdvancedReports(interaction, client) {
    await interaction.reply({ content: '📈 Rapports avancés en développement...', ephemeral: true });
}

async function handleUserManagerButton(interaction, client) {
    await interaction.reply({ content: '🔧 Action en développement...', ephemeral: true });
}

async function toggleUserBlacklist(interaction, targetUser) {
    await interaction.reply({ content: `🚫 Gestion blacklist pour ${targetUser.tag} en cours...`, ephemeral: true });
}

async function toggleUserGlobalBan(interaction, targetUser) {
    await interaction.reply({ content: `🔨 Gestion ban global pour ${targetUser.tag} en cours...`, ephemeral: true });
}

async function showUserStats(interaction, targetUser) {
    await interaction.reply({ content: `📊 Statistiques de ${targetUser.tag} en cours...`, ephemeral: true });
}

async function cleanupUserData(interaction, targetUser) {
    await interaction.reply({ content: `🧹 Nettoyage des données de ${targetUser.tag} en cours...`, ephemeral: true });
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */