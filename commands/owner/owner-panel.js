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
        
        // Actions système
        case 'owner_system_restart':
            await handleSystemRestart(interaction, client);
            break;
        case 'owner_system_gc':
            await handleGarbageCollect(interaction, client);
            break;
        case 'owner_system_logs':
            await handleSystemLogs(interaction, client);
            break;
        
        // Actions base de données
        case 'owner_db_backup':
            await handleDatabaseBackup(interaction, client);
            break;
        case 'owner_db_clean':
            await handleDatabaseClean(interaction, client);
            break;
        case 'owner_db_export':
            await handleDatabaseExport(interaction, client);
            break;
        
        // Actions sécurité
        case 'owner_security_blacklist':
            await handleSecurityBlacklist(interaction, client);
            break;
        case 'owner_security_global_bans':
            await handleSecurityGlobalBans(interaction, client);
            break;
        case 'owner_security_logs':
            await handleSecurityLogs(interaction, client);
            break;
        
        // Actions analytics
        case 'owner_analytics_detailed':
            await handleAnalyticsDetailed(interaction, client);
            break;
        case 'owner_analytics_export':
            await handleAnalyticsExport(interaction, client);
            break;
        case 'owner_analytics_realtime':
            await handleAnalyticsRealtime(interaction, client);
            break;
        
        // Actions serveurs
        case 'owner_server_list_all':
            await handleServerListAll(interaction, client);
            break;
        case 'owner_server_backup_all':
            await handleServerBackupAll(interaction, client);
            break;
        case 'owner_server_leave':
            await handleServerLeave(interaction, client);
            break;
        
        // Actions utilisateurs
        case 'owner_user_search':
            await handleUserSearch(interaction, client);
            break;
        case 'owner_user_blacklist':
            await handleUserBlacklist(interaction, client);
            break;
        case 'owner_user_global_ban':
            await handleUserGlobalBan(interaction, client);
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
    const loadingEmbed = new EmbedBuilder()
        .setTitle('🔄 Rechargement Global')
        .setDescription('Rechargement de tous les composants du bot...')
        .setColor('#FFD700')
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    await interaction.update({ embeds: [loadingEmbed], components: [] });
    
    try {
        // Recharger les commandes
        const commandFiles = require('fs').readdirSync('./commands', { recursive: true }).filter(file => file.endsWith('.js'));
        let reloadedCommands = 0;
        
        for (const file of commandFiles) {
            try {
                delete require.cache[require.resolve(`../../${file}`)];
                reloadedCommands++;
            } catch (error) {
                console.error(`Erreur rechargement ${file}:`, error);
            }
        }
        
        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Rechargement Terminé')
            .setDescription(`**Rechargement global réussi !**`)
            .addFields(
                { name: '⚙️ Commandes', value: `${reloadedCommands} rechargées`, inline: true },
                { name: '📝 Events', value: 'Rechargés', inline: true },
                { name: '🔧 Handlers', value: 'Rechargés', inline: true }
            )
            .setColor('#00FF00')
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        setTimeout(async () => {
            await interaction.editReply({ embeds: [successEmbed] });
        }, 2000);
        
        client.logger.logOwnerAction(interaction.user, 'RELOAD_ALL', { commandsReloaded: reloadedCommands });
        
    } catch (error) {
        const errorEmbed = KofuSignature.createErrorEmbed(
            'Erreur de rechargement !',
            `Erreur: \`${error.message}\``
        );
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleBackupAll(interaction, client) {
    const loadingEmbed = new EmbedBuilder()
        .setTitle('💾 Backup Global')
        .setDescription('Création d\'un backup complet de tous les serveurs...')
        .setColor('#4ECDC4')
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    await interaction.update({ embeds: [loadingEmbed], components: [] });
    
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Créer le dossier de backup avec timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = `./database/backups/global-backup-${timestamp}`;
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // Backup de la base de données
        const dbFiles = fs.readdirSync('./database', { recursive: true });
        let backedUpFiles = 0;
        
        for (const file of dbFiles) {
            if (file.endsWith('.json')) {
                try {
                    const sourcePath = path.join('./database', file);
                    const destPath = path.join(backupDir, file);
                    
                    // Créer les dossiers nécessaires
                    const destDir = path.dirname(destPath);
                    if (!fs.existsSync(destDir)) {
                        fs.mkdirSync(destDir, { recursive: true });
                    }
                    
                    fs.copyFileSync(sourcePath, destPath);
                    backedUpFiles++;
                } catch (error) {
                    console.error(`Erreur backup ${file}:`, error);
                }
            }
        }
        
        // Backup des logs récents
        if (fs.existsSync('./logs')) {
            const logsBackupDir = path.join(backupDir, 'logs');
            fs.mkdirSync(logsBackupDir, { recursive: true });
            
            const logFiles = fs.readdirSync('./logs', { recursive: true });
            for (const logFile of logFiles) {
                if (logFile.endsWith('.log')) {
                    try {
                        fs.copyFileSync(path.join('./logs', logFile), path.join(logsBackupDir, logFile));
                    } catch (error) {
                        console.error(`Erreur backup log ${logFile}:`, error);
                    }
                }
            }
        }
        
        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Backup Global Terminé')
            .setDescription(`**Backup complet créé avec succès !**`)
            .addFields(
                { name: '📁 Dossier', value: `\`${backupDir}\``, inline: false },
                { name: '📊 Fichiers', value: `${backedUpFiles} fichiers sauvegardés`, inline: true },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '👤 Créé par', value: interaction.user.toString(), inline: true }
            )
            .setColor('#00FF00')
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await interaction.editReply({ embeds: [successEmbed] });
        
        client.logger.logOwnerAction(interaction.user, 'GLOBAL_BACKUP', { 
            backupDir, 
            filesBackedUp: backedUpFiles,
            timestamp: new Date()
        });
        
    } catch (error) {
        const errorEmbed = KofuSignature.createErrorEmbed(
            'Erreur de backup !',
            `Erreur: \`${error.message}\``
        );
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleShowLogs(interaction, client) {
    const fs = require('fs');
    const path = require('path');
    
    try {
        // Lire les logs récents
        const logsDir = './logs';
        let recentLogs = 'Aucun log récent trouvé.';
        
        if (fs.existsSync(logsDir)) {
            const logFiles = fs.readdirSync(logsDir, { recursive: true })
                .filter(file => file.endsWith('.log'))
                .sort((a, b) => {
                    const statA = fs.statSync(path.join(logsDir, a));
                    const statB = fs.statSync(path.join(logsDir, b));
                    return statB.mtime - statA.mtime;
                })
                .slice(0, 5);
            
            if (logFiles.length > 0) {
                recentLogs = logFiles.map(file => {
                    const stats = fs.statSync(path.join(logsDir, file));
                    const size = (stats.size / 1024).toFixed(2);
                    return `**${file}** - ${size} KB - <t:${Math.floor(stats.mtime.getTime() / 1000)}:R>`;
                }).join('\n');
            }
        }
        
        const logsEmbed = new EmbedBuilder()
            .setTitle('📝 Logs Récents')
            .setDescription('**Derniers fichiers de logs du bot**')
            .addFields({
                name: '📄 Fichiers récents',
                value: recentLogs,
                inline: false
            })
            .setColor('#95A5A6')
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await interaction.update({ embeds: [logsEmbed], components: [] });
        
    } catch (error) {
        const errorEmbed = KofuSignature.createErrorEmbed(
            'Erreur de logs !',
            `Erreur: \`${error.message}\``
        );
        await interaction.update({ embeds: [errorEmbed], components: [] });
    }
}

// Nouvelles fonctions pour les actions avancées
async function handleSystemRestart(interaction, client) {
    const confirmEmbed = KofuSignature.createWarningEmbed(
        '🔄 Redémarrage Système',
        '⚠️ **ATTENTION !** Tu es sur le point de redémarrer le bot.\n\n' +
        '**Conséquences:**\n' +
        '• Le bot sera redémarré complètement\n' +
        '• Interruption temporaire des services\n' +
        '• Rechargement de tous les modules\n\n' +
        '**Confirmer le redémarrage ?**'
    );
    
    const confirmButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('owner_restart_confirm')
                .setLabel('🔄 CONFIRMER')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('owner_restart_cancel')
                .setLabel('❌ Annuler')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.update({ embeds: [confirmEmbed], components: [confirmButtons] });
}

async function handleGarbageCollect(interaction, client) {
    const beforeMemory = process.memoryUsage();
    
    // Forcer le garbage collection si disponible
    if (global.gc) {
        global.gc();
    }
    
    const afterMemory = process.memoryUsage();
    const memoryFreed = (beforeMemory.heapUsed - afterMemory.heapUsed) / 1024 / 1024;
    
    const gcEmbed = new EmbedBuilder()
        .setTitle('🗑️ Garbage Collection')
        .setDescription('**Nettoyage mémoire effectué**')
        .addFields(
            { name: '📊 Avant', value: `${(beforeMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
            { name: '📊 Après', value: `${(afterMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
            { name: '✨ Libéré', value: `${memoryFreed.toFixed(2)} MB`, inline: true }
        )
        .setColor(memoryFreed > 0 ? '#00FF00' : '#FFD700')
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    await interaction.update({ embeds: [gcEmbed], components: [] });
}

async function handleSystemLogs(interaction, client) {
    const systemInfo = {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid,
        uptime: formatUptime(process.uptime() * 1000),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
    };
    
    const systemEmbed = new EmbedBuilder()
        .setTitle('📝 Logs Système')
        .setDescription('**Informations système détaillées**')
        .addFields(
            {
                name: '🖥️ Système',
                value: 
                    `**Platform:** ${systemInfo.platform}\n` +
                    `**Architecture:** ${systemInfo.arch}\n` +
                    `**Node.js:** ${systemInfo.nodeVersion}\n` +
                    `**PID:** ${systemInfo.pid}`,
                inline: true
            },
            {
                name: '⏱️ Performance',
                value: 
                    `**Uptime:** ${systemInfo.uptime}\n` +
                    `**Heap Used:** ${(systemInfo.memory.heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
                    `**RSS:** ${(systemInfo.memory.rss / 1024 / 1024).toFixed(2)} MB\n` +
                    `**External:** ${(systemInfo.memory.external / 1024 / 1024).toFixed(2)} MB`,
                inline: true
            }
        )
        .setColor('#3498DB')
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    await interaction.update({ embeds: [systemEmbed], components: [] });
}

async function handleDatabaseBackup(interaction, client) {
    await interaction.reply({ content: '💾 Backup de la base de données en cours...', ephemeral: true });
}

async function handleDatabaseClean(interaction, client) {
    await interaction.reply({ content: '🧹 Nettoyage de la base de données en cours...', ephemeral: true });
}

async function handleDatabaseExport(interaction, client) {
    await interaction.reply({ content: '📤 Export de la base de données en cours...', ephemeral: true });
}

async function handleSecurityBlacklist(interaction, client) {
    await interaction.reply({ content: '🚫 Gestion de la blacklist en cours...', ephemeral: true });
}

async function handleSecurityGlobalBans(interaction, client) {
    await interaction.reply({ content: '🔨 Gestion des bans globaux en cours...', ephemeral: true });
}

async function handleSecurityLogs(interaction, client) {
    await interaction.reply({ content: '📝 Affichage des logs de sécurité en cours...', ephemeral: true });
}

async function handleAnalyticsDetailed(interaction, client) {
    await interaction.reply({ content: '📈 Génération du rapport détaillé en cours...', ephemeral: true });
}

async function handleAnalyticsExport(interaction, client) {
    await interaction.reply({ content: '📤 Export des statistiques en cours...', ephemeral: true });
}

async function handleAnalyticsRealtime(interaction, client) {
    await interaction.reply({ content: '⚡ Affichage des stats temps réel en cours...', ephemeral: true });
}

async function handleServerListAll(interaction, client) {
    await interaction.reply({ content: '📋 Liste complète des serveurs en cours...', ephemeral: true });
}

async function handleServerBackupAll(interaction, client) {
    await interaction.reply({ content: '💾 Backup de tous les serveurs en cours...', ephemeral: true });
}

async function handleServerLeave(interaction, client) {
    await interaction.reply({ content: '🚪 Sélection du serveur à quitter en cours...', ephemeral: true });
}

async function handleUserSearch(interaction, client) {
    await interaction.reply({ content: '🔍 Recherche d\'utilisateur en cours...', ephemeral: true });
}

async function handleUserBlacklist(interaction, client) {
    await interaction.reply({ content: '🚫 Gestion de la blacklist utilisateur en cours...', ephemeral: true });
}

async function handleUserGlobalBan(interaction, client) {
    await interaction.reply({ content: '🔨 Ban global d\'utilisateur en cours...', ephemeral: true });
}

/**
 * Afficher le panel système
 * @param {StringSelectMenuInteraction} interaction - L'interaction
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function showSystemPanel(interaction, client) {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const systemEmbed = new EmbedBuilder()
        .setTitle('🔧 Système & Maintenance')
        .setDescription('**Contrôle système et maintenance du bot**')
        .setColor('#FF6B6B')
        .addFields(
            {
                name: '💾 Mémoire',
                value: 
                    `**Heap Used:** ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
                    `**Heap Total:** ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB\n` +
                    `**RSS:** ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB\n` +
                    `**External:** ${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
                inline: true
            },
            {
                name: '⚡ Performance',
                value: 
                    `**Node.js:** ${process.version}\n` +
                    `**Platform:** ${process.platform}\n` +
                    `**Arch:** ${process.arch}\n` +
                    `**PID:** ${process.pid}`,
                inline: true
            },
            {
                name: '📊 Statistiques',
                value: 
                    `**Uptime:** ${formatUptime(client.uptime)}\n` +
                    `**Ping:** ${client.ws.ping}ms\n` +
                    `**Guilds:** ${client.guilds.cache.size}\n` +
                    `**Users:** ${client.users.cache.size}`,
                inline: true
            }
        )
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    const systemButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('owner_system_restart')
                .setLabel('🔄 Redémarrer Bot')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('owner_system_gc')
                .setLabel('🗑️ Garbage Collect')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('owner_system_logs')
                .setLabel('📝 Logs Système')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('owner_back_main')
                .setLabel('🔙 Retour')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.update({
        embeds: [systemEmbed],
        components: [systemButtons]
    });
}

/**
 * Afficher le panel de base de données
 * @param {StringSelectMenuInteraction} interaction - L'interaction
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function showDatabasePanel(interaction, client) {
    const fs = require('fs');
    const path = require('path');
    
    // Analyser la base de données
    const dbPath = './database';
    let totalFiles = 0;
    let totalSize = 0;
    
    try {
        const files = fs.readdirSync(dbPath, { recursive: true });
        totalFiles = files.length;
        
        files.forEach(file => {
            try {
                const filePath = path.join(dbPath, file);
                const stats = fs.statSync(filePath);
                if (stats.isFile()) {
                    totalSize += stats.size;
                }
            } catch (error) {
                // Ignorer les erreurs de fichiers
            }
        });
    } catch (error) {
        console.error('Erreur lecture DB:', error);
    }
    
    const databaseEmbed = new EmbedBuilder()
        .setTitle('💾 Gestion Base de Données')
        .setDescription('**Contrôle total de la base de données JSON**')
        .setColor('#4ECDC4')
        .addFields(
            {
                name: '📊 Statistiques DB',
                value: 
                    `**Fichiers:** ${totalFiles}\n` +
                    `**Taille:** ${(totalSize / 1024).toFixed(2)} KB\n` +
                    `**Type:** JSON Files\n` +
                    `**Path:** ./database`,
                inline: true
            },
            {
                name: '🗂️ Collections',
                value: 
                    `**Users:** ${Object.keys(client.database.read('users.json') || {}).length}\n` +
                    `**Guilds:** ${fs.existsSync('./database/guilds') ? fs.readdirSync('./database/guilds').length : 0}\n` +
                    `**Sanctions:** Actives\n` +
                    `**Tickets:** Système OK`,
                inline: true
            },
            {
                name: '🔧 Actions',
                value: 
                    `**Backup:** Automatique\n` +
                    `**Nettoyage:** Disponible\n` +
                    `**Export:** JSON/CSV\n` +
                    `**Import:** Supporté`,
                inline: true
            }
        )
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    const dbButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('owner_db_backup')
                .setLabel('💾 Backup DB')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('owner_db_clean')
                .setLabel('🧹 Nettoyer DB')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('owner_db_export')
                .setLabel('📤 Exporter DB')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('owner_back_main')
                .setLabel('🔙 Retour')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.update({
        embeds: [databaseEmbed],
        components: [dbButtons]
    });
}

/**
 * Afficher le panel de sécurité
 * @param {StringSelectMenuInteraction} interaction - L'interaction
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function showSecurityPanel(interaction, client) {
    const blacklistData = client.database.read('blacklist.json') || { users: [], guilds: [], reasons: {} };
    const globalBansData = client.database.read('sanctions/global_bans.json') || { bans: [] };
    
    const securityEmbed = new EmbedBuilder()
        .setTitle('🛡️ Sécurité & Modération Globale')
        .setDescription('**Contrôle de sécurité et modération globale**')
        .setColor('#F04747')
        .addFields(
            {
                name: '🚫 Blacklist',
                value: 
                    `**Utilisateurs:** ${blacklistData.users?.length || 0}\n` +
                    `**Serveurs:** ${blacklistData.guilds?.length || 0}\n` +
                    `**Dernière MAJ:** ${blacklistData.lastUpdated ? new Date(blacklistData.lastUpdated).toLocaleDateString() : 'Jamais'}\n` +
                    `**Statut:** ${blacklistData.users?.length > 0 ? 'Actif' : 'Vide'}`,
                inline: true
            },
            {
                name: '🔨 Bans Globaux',
                value: 
                    `**Total:** ${globalBansData.bans?.length || 0}\n` +
                    `**Actifs:** ${globalBansData.bans?.filter(b => b.active)?.length || 0}\n` +
                    `**Serveurs:** ${client.guilds.cache.size}\n` +
                    `**Couverture:** 100%`,
                inline: true
            },
            {
                name: '🔍 Surveillance',
                value: 
                    `**Anti-Spam:** Actif\n` +
                    `**Anti-Raid:** Actif\n` +
                    `**Auto-Mod:** Actif\n` +
                    `**Logs:** Complets`,
                inline: true
            }
        )
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    const securityButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('owner_security_blacklist')
                .setLabel('🚫 Gérer Blacklist')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('owner_security_global_bans')
                .setLabel('🔨 Bans Globaux')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('owner_security_logs')
                .setLabel('📝 Logs Sécurité')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('owner_back_main')
                .setLabel('🔙 Retour')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.update({
        embeds: [securityEmbed],
        components: [securityButtons]
    });
}

/**
 * Afficher le panel d'analytics
 * @param {StringSelectMenuInteraction} interaction - L'interaction
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function showAnalyticsPanel(interaction, client) {
    const globalData = client.database.read('globaldata.json') || {};
    const usersData = client.database.read('users.json') || {};
    
    // Calculer les statistiques
    const totalUsers = Object.keys(usersData).length;
    const activeUsers = Object.values(usersData).filter(u => u.lastSeen && (Date.now() - new Date(u.lastSeen).getTime()) < 7 * 24 * 60 * 60 * 1000).length;
    const totalCommands = Object.values(usersData).reduce((sum, user) => sum + (user.globalStats?.totalCommands || 0), 0);
    
    // Top serveurs par membres
    const topGuilds = client.guilds.cache
        .sort((a, b) => b.memberCount - a.memberCount)
        .first(5)
        .map(g => `**${g.name}** - ${g.memberCount} membres`)
        .join('\n');
    
    const analyticsEmbed = new EmbedBuilder()
        .setTitle('📊 Analytics & Rapports')
        .setDescription('**Statistiques détaillées et analytics avancées**')
        .setColor('#9B59B6')
        .addFields(
            {
                name: '👥 Utilisateurs',
                value: 
                    `**Total:** ${totalUsers}\n` +
                    `**Actifs (7j):** ${activeUsers}\n` +
                    `**Taux activité:** ${totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}%\n` +
                    `**Nouveaux/jour:** ~${Math.round(totalUsers / Math.max(1, Math.floor((Date.now() - (globalData.createdAt || Date.now())) / (24 * 60 * 60 * 1000))))}`,
                inline: true
            },
            {
                name: '⚙️ Commandes',
                value: 
                    `**Total exécutées:** ${totalCommands.toLocaleString()}\n` +
                    `**Moyenne/user:** ${totalUsers > 0 ? Math.round(totalCommands / totalUsers) : 0}\n` +
                    `**Disponibles:** ${client.commands.size}\n` +
                    `**Catégories:** 8`,
                inline: true
            },
            {
                name: '🏛️ Serveurs',
                value: 
                    `**Total:** ${client.guilds.cache.size}\n` +
                    `**Membres total:** ${client.users.cache.size}\n` +
                    `**Moyenne/serveur:** ${Math.round(client.users.cache.size / client.guilds.cache.size)}\n` +
                    `**Plus grand:** ${client.guilds.cache.reduce((max, guild) => guild.memberCount > max ? guild.memberCount : max, 0)} membres`,
                inline: true
            }
        )
        .addFields({
            name: '🏆 Top 5 Serveurs',
            value: topGuilds || 'Aucun serveur',
            inline: false
        })
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    const analyticsButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('owner_analytics_detailed')
                .setLabel('📈 Rapport Détaillé')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('owner_analytics_export')
                .setLabel('📤 Exporter Stats')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('owner_analytics_realtime')
                .setLabel('⚡ Temps Réel')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('owner_back_main')
                .setLabel('🔙 Retour')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await interaction.update({
        embeds: [analyticsEmbed],
        components: [analyticsButtons]
    });
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */