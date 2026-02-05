/**
 * ====================================
 * COMMANDE: /config
 * ====================================
 * 
 * Configuration avancée du serveur
 * Gestion de tous les paramètres
 * 
 * @author Kofu (github.com/kofudev)
 * @category Admin
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('⚙️ Configurer le serveur')
        .addSubcommandGroup(group =>
            group
                .setName('logs')
                .setDescription('Configuration des logs')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('moderation')
                        .setDescription('Configurer le salon de logs de modération')
                        .addChannelOption(option =>
                            option.setName('salon')
                                .setDescription('Salon pour les logs de modération')
                                .setRequired(true)
                                .addChannelTypes(ChannelType.GuildText)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('members')
                        .setDescription('Configurer le salon de logs des membres')
                        .addChannelOption(option =>
                            option.setName('salon')
                                .setDescription('Salon pour les logs des membres')
                                .setRequired(true)
                                .addChannelTypes(ChannelType.GuildText)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('messages')
                        .setDescription('Configurer le salon de logs des messages')
                        .addChannelOption(option =>
                            option.setName('salon')
                                .setDescription('Salon pour les logs des messages')
                                .setRequired(true)
                                .addChannelTypes(ChannelType.GuildText)
                        )
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName('levels')
                .setDescription('Configuration du système de niveaux')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('enable')
                        .setDescription('Activer le système de niveaux')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('disable')
                        .setDescription('Désactiver le système de niveaux')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('channel')
                        .setDescription('Configurer le salon d\'annonces de niveau')
                        .addChannelOption(option =>
                            option.setName('salon')
                                .setDescription('Salon pour les annonces de niveau')
                                .setRequired(true)
                                .addChannelTypes(ChannelType.GuildText)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('ignore')
                        .setDescription('Ignorer un salon pour l\'XP')
                        .addChannelOption(option =>
                            option.setName('salon')
                                .setDescription('Salon à ignorer')
                                .setRequired(true)
                                .addChannelTypes(ChannelType.GuildText)
                        )
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName('economy')
                .setDescription('Configuration du système économique')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('enable')
                        .setDescription('Activer le système économique')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('disable')
                        .setDescription('Désactiver le système économique')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('currency')
                        .setDescription('Changer le nom de la monnaie')
                        .addStringOption(option =>
                            option.setName('nom')
                                .setDescription('Nouveau nom de la monnaie')
                                .setRequired(true)
                                .setMaxLength(20)
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Voir la configuration actuelle')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Réinitialiser la configuration')
                .addStringOption(option =>
                    option.setName('confirmation')
                        .setDescription('Tape "CONFIRMER" pour réinitialiser')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('auto-setup')
                .setDescription('🚀 Configuration automatique complète du serveur')
                .addBooleanOption(option =>
                    option.setName('force')
                        .setDescription('Forcer la reconfiguration même si déjà configuré')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('quick-setup')
                .setDescription('⚡ Configuration rapide avec paramètres recommandés')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    category: 'admin',
    cooldown: 5,
    guildOnly: true,
    permissions: ['Administrator'],
    
    /**
     * Exécution de la commande config
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommandGroup) {
            switch (subcommandGroup) {
                case 'logs':
                    await handleLogsConfig(interaction, subcommand);
                    break;
                case 'levels':
                    await handleLevelsConfig(interaction, subcommand);
                    break;
                case 'economy':
                    await handleEconomyConfig(interaction, subcommand);
                    break;
            }
        } else {
            switch (subcommand) {
                case 'view':
                    await handleViewConfig(interaction);
                    break;
                case 'reset':
                    await handleResetConfig(interaction);
                    break;
                case 'auto-setup':
                    await handleAutoSetup(interaction);
                    break;
                case 'quick-setup':
                    await handleQuickSetup(interaction);
                    break;
            }
        }
    }
};

/**
 * Gérer la configuration des logs
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {string} subcommand - Sous-commande
 * @author Kofu
 */
async function handleLogsConfig(interaction, subcommand) {
    const channel = interaction.options.getChannel('salon');
    const guildData = interaction.client.database.getGuild(interaction.guild.id);
    
    // Vérifier les permissions du bot dans le salon
    const botPermissions = channel.permissionsFor(interaction.client.user);
    if (!botPermissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
        const errorEmbed = KofuSignature.createErrorEmbed(
            'Permissions insuffisantes !',
            `Je n'ai pas les permissions nécessaires dans ${channel.toString()}.\n\n` +
            '**Permissions requises :**\n' +
            '• Voir le salon\n' +
            '• Envoyer des messages\n' +
            '• Intégrer des liens'
        );
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
    
    // Configurer le salon de logs
    if (!guildData.logs) guildData.logs = {};
    guildData.logs[subcommand] = channel.id;
    guildData.updatedAt = new Date();
    
    interaction.client.database.setGuild(interaction.guild.id, guildData);
    
    // Créer l'embed de confirmation
    const successEmbed = KofuSignature.createSuccessEmbed(
        'Configuration mise à jour !',
        `Le salon de logs **${getLogTypeName(subcommand)}** a été configuré sur ${channel.toString()}.`
    );
    
    successEmbed.addFields({
        name: '📝 Types de logs',
        value: getLogTypeDescription(subcommand),
        inline: false
    });
    
    await interaction.reply({ embeds: [successEmbed] });
    
    // Envoyer un message de test dans le salon configuré
    const testEmbed = new EmbedBuilder()
        .setTitle('✅ Salon de logs configuré !')
        .setDescription(`Ce salon a été configuré pour recevoir les **${getLogTypeName(subcommand)}**.`)
        .setColor('#00FF00')
        .addFields(
            { name: '⚙️ Configuré par', value: interaction.user.toString(), inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    await channel.send({ embeds: [testEmbed] });
    
    console.log(`⚙️ [Kofu] ${interaction.user.tag} a configuré les logs ${subcommand} sur ${interaction.guild.name} (${channel.name})`);
}

/**
 * Gérer la configuration des niveaux
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {string} subcommand - Sous-commande
 * @author Kofu
 */
async function handleLevelsConfig(interaction, subcommand) {
    const guildData = interaction.client.database.getGuild(interaction.guild.id);
    
    if (!guildData.levels) {
        guildData.levels = {
            enabled: false,
            xpPerMessage: 15,
            xpPerVoiceMinute: 5,
            levelUpChannel: null,
            xpCooldown: 60,
            ignoredChannels: []
        };
    }
    
    switch (subcommand) {
        case 'enable':
            guildData.levels.enabled = true;
            break;
        case 'disable':
            guildData.levels.enabled = false;
            break;
        case 'channel':
            const channel = interaction.options.getChannel('salon');
            guildData.levels.levelUpChannel = channel.id;
            break;
        case 'ignore':
            const ignoreChannel = interaction.options.getChannel('salon');
            if (!guildData.levels.ignoredChannels.includes(ignoreChannel.id)) {
                guildData.levels.ignoredChannels.push(ignoreChannel.id);
            }
            break;
    }
    
    guildData.updatedAt = new Date();
    interaction.client.database.setGuild(interaction.guild.id, guildData);
    
    // Créer l'embed de confirmation
    let title, description;
    
    switch (subcommand) {
        case 'enable':
            title = '📊 Système de niveaux activé !';
            description = 'Les utilisateurs peuvent maintenant gagner de l\'XP en envoyant des messages et en restant en vocal.';
            break;
        case 'disable':
            title = '📊 Système de niveaux désactivé !';
            description = 'Les utilisateurs ne gagneront plus d\'XP. Les données existantes sont conservées.';
            break;
        case 'channel':
            title = '📢 Salon d\'annonces configuré !';
            description = `Les annonces de niveau seront envoyées dans ${interaction.options.getChannel('salon').toString()}.`;
            break;
        case 'ignore':
            title = '🚫 Salon ignoré !';
            description = `${interaction.options.getChannel('salon').toString()} ne donnera plus d'XP.`;
            break;
    }
    
    const successEmbed = KofuSignature.createSuccessEmbed(title, description);
    
    // Ajouter les paramètres actuels
    successEmbed.addFields({
        name: '⚙️ Configuration actuelle',
        value: 
            `**Activé:** ${guildData.levels.enabled ? '✅ Oui' : '❌ Non'}\n` +
            `**XP par message:** ${guildData.levels.xpPerMessage}-${guildData.levels.xpPerMessage + 10}\n` +
            `**XP vocal:** ${guildData.levels.xpPerVoiceMinute}/min\n` +
            `**Salon d'annonces:** ${guildData.levels.levelUpChannel ? `<#${guildData.levels.levelUpChannel}>` : 'Messages privés'}\n` +
            `**Salons ignorés:** ${guildData.levels.ignoredChannels.length}`,
        inline: false
    });
    
    await interaction.reply({ embeds: [successEmbed] });
    
    console.log(`⚙️ [Kofu] ${interaction.user.tag} a configuré les niveaux sur ${interaction.guild.name} (${subcommand})`);
}

/**
 * Gérer la configuration de l'économie
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {string} subcommand - Sous-commande
 * @author Kofu
 */
async function handleEconomyConfig(interaction, subcommand) {
    const guildData = interaction.client.database.getGuild(interaction.guild.id);
    
    if (!guildData.economy) {
        guildData.economy = {
            enabled: false,
            currency: 'Kofu Coins',
            dailyAmount: 100,
            workAmount: 50,
            bankLimit: 10000,
            transferTax: 5
        };
    }
    
    switch (subcommand) {
        case 'enable':
            guildData.economy.enabled = true;
            break;
        case 'disable':
            guildData.economy.enabled = false;
            break;
        case 'currency':
            const newCurrency = interaction.options.getString('nom');
            guildData.economy.currency = newCurrency;
            break;
    }
    
    guildData.updatedAt = new Date();
    interaction.client.database.setGuild(interaction.guild.id, guildData);
    
    // Créer l'embed de confirmation
    let title, description;
    
    switch (subcommand) {
        case 'enable':
            title = '💰 Système économique activé !';
            description = 'Les utilisateurs peuvent maintenant utiliser les commandes économiques.';
            break;
        case 'disable':
            title = '💰 Système économique désactivé !';
            description = 'Les commandes économiques sont désactivées. Les données sont conservées.';
            break;
        case 'currency':
            title = '💱 Monnaie changée !';
            description = `La monnaie du serveur est maintenant: **${guildData.economy.currency}**`;
            break;
    }
    
    const successEmbed = KofuSignature.createSuccessEmbed(title, description);
    
    // Ajouter les paramètres actuels
    successEmbed.addFields({
        name: '⚙️ Configuration actuelle',
        value: 
            `**Activé:** ${guildData.economy.enabled ? '✅ Oui' : '❌ Non'}\n` +
            `**Monnaie:** ${guildData.economy.currency}\n` +
            `**Daily:** ${guildData.economy.dailyAmount}\n` +
            `**Work:** ${guildData.economy.workAmount}-${guildData.economy.workAmount + 50}\n` +
            `**Limite banque:** ${guildData.economy.bankLimit.toLocaleString('fr-FR')}\n` +
            `**Taxe transfert:** ${guildData.economy.transferTax}%`,
        inline: false
    });
    
    await interaction.reply({ embeds: [successEmbed] });
    
    console.log(`⚙️ [Kofu] ${interaction.user.tag} a configuré l'économie sur ${interaction.guild.name} (${subcommand})`);
}

/**
 * Afficher la configuration actuelle
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @author Kofu
 */
async function handleViewConfig(interaction) {
    const guildData = interaction.client.database.getGuild(interaction.guild.id);
    
    const configEmbed = new EmbedBuilder()
        .setTitle('⚙️ Configuration du Serveur')
        .setDescription(`Configuration actuelle de **${interaction.guild.name}**`)
        .setColor('#5865F2')
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    // Logs
    const logs = guildData.logs || {};
    const logsText = [
        `🛡️ **Modération:** ${logs.moderation ? `<#${logs.moderation}>` : '❌ Non configuré'}`,
        `👥 **Membres:** ${logs.members ? `<#${logs.members}>` : '❌ Non configuré'}`,
        `💬 **Messages:** ${logs.messages ? `<#${logs.messages}>` : '❌ Non configuré'}`,
        `🔊 **Vocal:** ${logs.voice ? `<#${logs.voice}>` : '❌ Non configuré'}`
    ].join('\n');
    
    configEmbed.addFields({
        name: '📝 Logs',
        value: logsText,
        inline: false
    });
    
    // Niveaux
    const levels = guildData.levels || {};
    const levelsText = [
        `**Activé:** ${levels.enabled ? '✅ Oui' : '❌ Non'}`,
        `**XP/message:** ${levels.xpPerMessage || 15}-${(levels.xpPerMessage || 15) + 10}`,
        `**XP vocal:** ${levels.xpPerVoiceMinute || 5}/min`,
        `**Annonces:** ${levels.levelUpChannel ? `<#${levels.levelUpChannel}>` : 'Messages privés'}`,
        `**Salons ignorés:** ${levels.ignoredChannels?.length || 0}`
    ].join('\n');
    
    configEmbed.addFields({
        name: '📊 Niveaux',
        value: levelsText,
        inline: true
    });
    
    // Économie
    const economy = guildData.economy || {};
    const economyText = [
        `**Activé:** ${economy.enabled ? '✅ Oui' : '❌ Non'}`,
        `**Monnaie:** ${economy.currency || 'Kofu Coins'}`,
        `**Daily:** ${economy.dailyAmount || 100}`,
        `**Work:** ${economy.workAmount || 50}-${(economy.workAmount || 50) + 50}`,
        `**Limite banque:** ${(economy.bankLimit || 10000).toLocaleString('fr-FR')}`
    ].join('\n');
    
    configEmbed.addFields({
        name: '💰 Économie',
        value: economyText,
        inline: true
    });
    
    // Informations générales
    configEmbed.addFields({
        name: '📊 Informations',
        value: 
            `**Créé:** <t:${Math.floor((guildData.createdAt || Date.now()) / 1000)}:D>\n` +
            `**Modifié:** <t:${Math.floor((guildData.updatedAt || Date.now()) / 1000)}:R>\n` +
            `**Préfixe:** \`/\` (Slash Commands)\n` +
            `**Langue:** Français`,
        inline: false
    });
    
    await interaction.reply({ embeds: [configEmbed] });
}

/**
 * Réinitialiser la configuration
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @author Kofu
 */
async function handleResetConfig(interaction) {
    const confirmation = interaction.options.getString('confirmation');
    
    if (confirmation !== 'CONFIRMER') {
        const errorEmbed = KofuSignature.createErrorEmbed(
            'Confirmation incorrecte !',
            'Tu dois taper exactement `CONFIRMER` pour réinitialiser la configuration.'
        );
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
    
    // Réinitialiser la configuration
    const defaultGuildData = {
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        logs: {},
        levels: {
            enabled: false,
            xpPerMessage: 15,
            xpPerVoiceMinute: 5,
            levelUpChannel: null,
            xpCooldown: 60,
            ignoredChannels: []
        },
        economy: {
            enabled: false,
            currency: 'Kofu Coins',
            dailyAmount: 100,
            workAmount: 50,
            bankLimit: 10000,
            transferTax: 5
        }
    };
    
    interaction.client.database.setGuild(interaction.guild.id, defaultGuildData);
    
    const successEmbed = KofuSignature.createSuccessEmbed(
        '🔄 Configuration réinitialisée !',
        'Toute la configuration du serveur a été remise aux valeurs par défaut.\n\n' +
        'Utilise `/config` pour reconfigurer le bot selon tes besoins.'
    );
    
    await interaction.reply({ embeds: [successEmbed] });
    
    console.log(`⚙️ [Kofu] ${interaction.user.tag} a réinitialisé la configuration de ${interaction.guild.name}`);
}

/**
 * Obtenir le nom d'un type de log
 * @param {string} logType - Type de log
 * @returns {string} Nom du type
 * @author Kofu
 */
function getLogTypeName(logType) {
    const names = {
        moderation: 'Logs de Modération',
        members: 'Logs des Membres',
        messages: 'Logs des Messages',
        voice: 'Logs Vocaux',
        server: 'Logs du Serveur',
        bot: 'Logs du Bot'
    };
    
    return names[logType] || 'Logs';
}

/**
 * Obtenir la description d'un type de log
 * @param {string} logType - Type de log
 * @returns {string} Description
 * @author Kofu
 */
function getLogTypeDescription(logType) {
    const descriptions = {
        moderation: 'Bans, kicks, warns, mutes, et autres actions de modération',
        members: 'Arrivées, départs, changements de pseudo et de rôles',
        messages: 'Messages supprimés, modifiés, et épinglés',
        voice: 'Connexions, déconnexions, et changements de salon vocal',
        server: 'Modifications du serveur, créations de salons et rôles',
        bot: 'Actions du bot, erreurs, et événements système'
    };
    
    return descriptions[logType] || 'Logs divers';
}

/**
 * Configuration automatique complète du serveur
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @author Kofu
 */
async function handleAutoSetup(interaction) {
    const force = interaction.options.getBoolean('force') || false;
    const guildData = interaction.client.database.getGuild(interaction.guild.id);
    
    // Vérifier si déjà configuré
    if (!force && guildData.autoSetupCompleted) {
        const alreadyConfiguredEmbed = KofuSignature.createWarningEmbed(
            '⚠️ Configuration déjà effectuée !',
            'Ce serveur a déjà été configuré automatiquement.\n\n' +
            'Utilise `/config auto-setup force:true` pour forcer la reconfiguration.'
        );
        return interaction.reply({ embeds: [alreadyConfiguredEmbed], ephemeral: true });
    }
    
    await interaction.deferReply();
    
    const setupEmbed = KofuSignature.createLoadingEmbed(
        '🚀 Configuration automatique en cours...',
        'Création et configuration de tous les éléments nécessaires...'
    );
    await interaction.editReply({ embeds: [setupEmbed] });
    
    const results = [];
    let errors = [];
    
    try {
        // 1. Créer les salons de logs
        const logChannels = await createLogChannels(interaction.guild);
        results.push(`✅ **Salons de logs créés:** ${logChannels.length} salons`);
        
        // Configurer les logs
        if (!guildData.logs) guildData.logs = {};
        logChannels.forEach(channel => {
            guildData.logs[channel.purpose] = channel.id;
        });
        
        // 2. Activer et configurer les systèmes
        // Système de niveaux
        if (!guildData.levels) guildData.levels = {};
        guildData.levels.enabled = true;
        guildData.levels.xpPerMessage = 15;
        guildData.levels.xpPerVoiceMinute = 5;
        guildData.levels.xpCooldown = 60;
        guildData.levels.ignoredChannels = [];
        results.push('✅ **Système de niveaux:** Activé avec paramètres optimaux');
        
        // Système économique
        if (!guildData.economy) guildData.economy = {};
        guildData.economy.enabled = true;
        guildData.economy.currency = 'Kofu Coins';
        guildData.economy.dailyAmount = 100;
        guildData.economy.workAmount = 50;
        guildData.economy.bankLimit = 50000;
        guildData.economy.transferTax = 3;
        results.push('✅ **Système économique:** Activé avec monnaie "Kofu Coins"');
        
        // 3. Créer les rôles de modération
        const modRoles = await createModerationRoles(interaction.guild);
        results.push(`✅ **Rôles de modération:** ${modRoles.length} rôles créés`);
        
        // 4. Configurer les paramètres de sécurité
        if (!guildData.security) guildData.security = {};
        guildData.security.antiSpam = {
            enabled: true,
            maxMessages: 5,
            timeWindow: 5000,
            muteTime: 300000 // 5 minutes
        };
        guildData.security.antiRaid = {
            enabled: true,
            maxJoins: 10,
            timeWindow: 60000 // 1 minute
        };
        results.push('✅ **Sécurité:** Anti-spam et anti-raid configurés');
        
        // 5. Créer un salon de bienvenue
        const welcomeChannel = await createWelcomeChannel(interaction.guild);
        if (welcomeChannel) {
            if (!guildData.welcome) guildData.welcome = {};
            guildData.welcome.enabled = true;
            guildData.welcome.channelId = welcomeChannel.id;
            guildData.welcome.message = `🎉 Bienvenue {user} sur **{server}** !\n\nNous sommes maintenant **{memberCount}** membres !\n\n✨ Utilise \`/help\` pour découvrir toutes mes commandes !`;
            results.push(`✅ **Salon de bienvenue:** ${welcomeChannel.toString()} configuré`);
        }
        
        // 6. Marquer comme configuré
        guildData.autoSetupCompleted = true;
        guildData.autoSetupDate = new Date();
        guildData.updatedAt = new Date();
        
        // Sauvegarder
        interaction.client.database.setGuild(interaction.guild.id, guildData);
        
        // Logger l'action
        interaction.client.logger.logOwnerAction(
            interaction.user,
            'AUTO_SETUP_COMPLETE',
            {
                guildId: interaction.guild.id,
                guildName: interaction.guild.name,
                results: results.length,
                errors: errors.length,
                forced: force
            }
        );
        
    } catch (error) {
        errors.push(`❌ Erreur générale: ${error.message}`);
        interaction.client.logger.error('Erreur auto-setup:', error);
    }
    
    // Créer l'embed de résultat
    const resultEmbed = new EmbedBuilder()
        .setTitle('🚀 Configuration Automatique Terminée !')
        .setDescription(`Configuration complète de **${interaction.guild.name}** effectuée avec succès !`)
        .setColor(errors.length > 0 ? '#FFD700' : '#00FF00')
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    if (results.length > 0) {
        resultEmbed.addFields({
            name: '✅ Éléments Configurés',
            value: results.join('\n'),
            inline: false
        });
    }
    
    if (errors.length > 0) {
        resultEmbed.addFields({
            name: '⚠️ Erreurs Rencontrées',
            value: errors.join('\n'),
            inline: false
        });
    }
    
    resultEmbed.addFields({
        name: '📋 Prochaines Étapes',
        value: 
            '• Utilise `/config view` pour voir la configuration complète\n' +
            '• Personnalise les messages de bienvenue avec `/config welcome`\n' +
            '• Ajuste les paramètres avec les sous-commandes `/config`\n' +
            '• Teste les commandes avec `/help`',
        inline: false
    });
    
    await interaction.editReply({ embeds: [resultEmbed] });
    
    console.log(`🚀 [Kofu] Auto-setup complet effectué sur ${interaction.guild.name} par ${interaction.user.tag}`);
}

/**
 * Configuration rapide avec paramètres recommandés
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @author Kofu
 */
async function handleQuickSetup(interaction) {
    await interaction.deferReply();
    
    const guildData = interaction.client.database.getGuild(interaction.guild.id);
    
    const quickEmbed = KofuSignature.createLoadingEmbed(
        '⚡ Configuration rapide...',
        'Application des paramètres recommandés...'
    );
    await interaction.editReply({ embeds: [quickEmbed] });
    
    // Configuration rapide avec paramètres optimaux
    if (!guildData.levels) guildData.levels = {};
    guildData.levels.enabled = true;
    guildData.levels.xpPerMessage = 20; // Plus généreux
    guildData.levels.xpPerVoiceMinute = 8;
    guildData.levels.xpCooldown = 45; // Plus court
    
    if (!guildData.economy) guildData.economy = {};
    guildData.economy.enabled = true;
    guildData.economy.currency = 'Pièces';
    guildData.economy.dailyAmount = 150; // Plus généreux
    guildData.economy.workAmount = 75;
    guildData.economy.bankLimit = 25000;
    
    if (!guildData.security) guildData.security = {};
    guildData.security.antiSpam = {
        enabled: true,
        maxMessages: 6, // Plus tolérant
        timeWindow: 4000,
        muteTime: 180000 // 3 minutes
    };
    
    guildData.quickSetupCompleted = true;
    guildData.quickSetupDate = new Date();
    guildData.updatedAt = new Date();
    
    interaction.client.database.setGuild(interaction.guild.id, guildData);
    
    const successEmbed = KofuSignature.createSuccessEmbed(
        '⚡ Configuration Rapide Terminée !',
        'Paramètres recommandés appliqués avec succès !'
    );
    
    successEmbed.addFields(
        {
            name: '📊 Niveaux',
            value: '✅ Activé avec XP généreux\n✅ Cooldown réduit à 45s',
            inline: true
        },
        {
            name: '💰 Économie',
            value: '✅ Activé avec "Pièces"\n✅ Récompenses augmentées',
            inline: true
        },
        {
            name: '🛡️ Sécurité',
            value: '✅ Anti-spam modéré\n✅ Protection activée',
            inline: true
        }
    );
    
    await interaction.editReply({ embeds: [successEmbed] });
    
    console.log(`⚡ [Kofu] Quick-setup effectué sur ${interaction.guild.name} par ${interaction.user.tag}`);
}

/**
 * Créer les salons de logs automatiquement
 * @param {Guild} guild - Le serveur Discord
 * @returns {Array} Liste des salons créés
 * @author Kofu
 */
async function createLogChannels(guild) {
    const channels = [];
    
    // Créer une catégorie pour les logs
    let logCategory;
    try {
        logCategory = await guild.channels.create({
            name: '📝・LOGS TASHKY',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: ['ViewChannel']
                },
                {
                    id: guild.members.me,
                    allow: ['ViewChannel', 'SendMessages', 'EmbedLinks']
                }
            ]
        });
    } catch (error) {
        console.log('Erreur création catégorie logs:', error.message);
    }
    
    const logChannelsToCreate = [
        { name: '🛡️・logs-moderation', purpose: 'moderation' },
        { name: '👥・logs-membres', purpose: 'members' },
        { name: '💬・logs-messages', purpose: 'messages' },
        { name: '🔊・logs-vocal', purpose: 'voice' }
    ];
    
    for (const channelInfo of logChannelsToCreate) {
        try {
            const channel = await guild.channels.create({
                name: channelInfo.name,
                type: ChannelType.GuildText,
                parent: logCategory?.id,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: ['ViewChannel', 'SendMessages']
                    },
                    {
                        id: guild.members.me,
                        allow: ['ViewChannel', 'SendMessages', 'EmbedLinks']
                    }
                ]
            });
            
            channels.push({
                id: channel.id,
                name: channel.name,
                purpose: channelInfo.purpose
            });
            
            // Envoyer un message de test
            const testEmbed = new EmbedBuilder()
                .setTitle(`✅ Salon ${channelInfo.purpose} configuré !`)
                .setDescription(`Ce salon recevra tous les logs de type **${channelInfo.purpose}**.`)
                .setColor('#00FF00')
                .setFooter(KofuSignature.getKofuFooter())
                .setTimestamp();
            
            await channel.send({ embeds: [testEmbed] });
            
        } catch (error) {
            console.log(`Erreur création salon ${channelInfo.name}:`, error.message);
        }
    }
    
    return channels;
}

/**
 * Créer les rôles de modération
 * @param {Guild} guild - Le serveur Discord
 * @returns {Array} Liste des rôles créés
 * @author Kofu
 */
async function createModerationRoles(guild) {
    const roles = [];
    
    const rolesToCreate = [
        {
            name: '👑 Admin TASHKY',
            color: '#FF0000',
            permissions: ['Administrator'],
            hoist: true
        },
        {
            name: '🛡️ Modérateur TASHKY',
            color: '#FFA500',
            permissions: ['ManageMessages', 'ManageNicknames', 'KickMembers', 'ModerateMembers'],
            hoist: true
        },
        {
            name: '🔇 Muet TASHKY',
            color: '#808080',
            permissions: [],
            hoist: false
        }
    ];
    
    for (const roleInfo of rolesToCreate) {
        try {
            // Vérifier si le rôle existe déjà
            const existingRole = guild.roles.cache.find(r => r.name === roleInfo.name);
            if (existingRole) continue;
            
            const role = await guild.roles.create({
                name: roleInfo.name,
                color: roleInfo.color,
                permissions: roleInfo.permissions,
                hoist: roleInfo.hoist,
                reason: 'Auto-setup TASHKY Bot'
            });
            
            roles.push({
                id: role.id,
                name: role.name,
                purpose: roleInfo.name.includes('Admin') ? 'admin' : roleInfo.name.includes('Modérateur') ? 'moderator' : 'mute'
            });
            
        } catch (error) {
            console.log(`Erreur création rôle ${roleInfo.name}:`, error.message);
        }
    }
    
    return roles;
}

/**
 * Créer un salon de bienvenue
 * @param {Guild} guild - Le serveur Discord
 * @returns {Channel|null} Le salon créé ou null
 * @author Kofu
 */
async function createWelcomeChannel(guild) {
    try {
        // Vérifier si un salon de bienvenue existe déjà
        const existingChannel = guild.channels.cache.find(c => 
            c.name.includes('bienvenue') || 
            c.name.includes('welcome') || 
            c.name.includes('arrivée')
        );
        
        if (existingChannel) return existingChannel;
        
        const channel = await guild.channels.create({
            name: '👋・bienvenue',
            type: ChannelType.GuildText,
            topic: '🎉 Salon de bienvenue automatique créé par TASHKY Bot',
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: ['SendMessages'],
                    allow: ['ViewChannel', 'ReadMessageHistory']
                },
                {
                    id: guild.members.me,
                    allow: ['ViewChannel', 'SendMessages', 'EmbedLinks']
                }
            ]
        });
        
        // Message d'accueil dans le salon
        const welcomeSetupEmbed = new EmbedBuilder()
            .setTitle('🎉 Salon de Bienvenue Configuré !')
            .setDescription(
                'Ce salon a été automatiquement configuré pour accueillir les nouveaux membres.\n\n' +
                '**Fonctionnalités :**\n' +
                '• Messages de bienvenue automatiques\n' +
                '• Compteur de membres\n' +
                '• Personnalisation via `/config welcome`'
            )
            .setColor('#00FF00')
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await channel.send({ embeds: [welcomeSetupEmbed] });
        
        return channel;
        
    } catch (error) {
        console.log('Erreur création salon bienvenue:', error.message);
        return null;
    }
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */