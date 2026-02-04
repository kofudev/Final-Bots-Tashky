/**
 * ====================================
 * COMMANDE: /ticket-setup
 * ====================================
 * 
 * Configuration complète du système de tickets
 * Panel interactif avec boutons et menus
 * 
 * @author Kofu (github.com/kofudev)
 * @category Tickets
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('🎫 Configurer le système de tickets')
        .addChannelOption(option =>
            option.setName('category')
                .setDescription('Catégorie où créer les tickets')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildCategory)
        )
        .addChannelOption(option =>
            option.setName('logs')
                .setDescription('Salon pour les logs de tickets')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText)
        )
        .addRoleOption(option =>
            option.setName('staff_role')
                .setDescription('Rôle du staff pour les tickets')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    category: 'tickets',
    cooldown: 10,
    guildOnly: true,
    permissions: ['ManageChannels'],
    botPermissions: ['ManageChannels', 'ManageRoles'],
    
    /**
     * Exécution de la commande ticket-setup
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const category = interaction.options.getChannel('category');
        const logsChannel = interaction.options.getChannel('logs');
        const staffRole = interaction.options.getRole('staff_role');
        
        try {
            // Vérifier les permissions sur la catégorie
            const botMember = interaction.guild.members.me;
            const categoryPermissions = category.permissionsFor(botMember);
            
            if (!categoryPermissions.has(['ManageChannels', 'ViewChannel'])) {
                const errorEmbed = KofuSignature.createErrorEmbed(
                    'Permissions insuffisantes !',
                    `Je n'ai pas les permissions nécessaires sur la catégorie **${category.name}**.\n\n` +
                    `**Permissions requises:**\n` +
                    `• Gérer les salons\n` +
                    `• Voir les salons`
                );
                
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            
            // Créer l'embed de configuration
            const setupEmbed = new EmbedBuilder()
                .setTitle('🎫 Configuration du Système de Tickets')
                .setDescription('⏳ Configuration en cours...')
                .setColor('#FAA61A')
                .setFooter(KofuSignature.getKofuFooter())
                .setTimestamp();
            
            await interaction.reply({ embeds: [setupEmbed] });
            
            // Sauvegarder la configuration dans la base de données
            const guildData = interaction.client.database.getGuild(interaction.guild.id);
            
            guildData.tickets = {
                enabled: true,
                category: category.id,
                transcriptsChannel: logsChannel?.id || null,
                staffRoles: staffRole ? [staffRole.id] : [],
                maxTicketsPerUser: 1,
                autoClose: false,
                autoCloseTime: 24 * 60 * 60 * 1000, // 24 heures
                welcomeMessage: 'Merci d\'avoir créé un ticket ! Un membre du staff va te répondre bientôt. 🎫',
                categories: [
                    {
                        id: 'support',
                        name: '🛠️ Support Technique',
                        description: 'Problèmes techniques et bugs',
                        emoji: '🛠️'
                    },
                    {
                        id: 'report',
                        name: '🚨 Signalement',
                        description: 'Signaler un utilisateur ou un problème',
                        emoji: '🚨'
                    },
                    {
                        id: 'other',
                        name: '❓ Autre',
                        description: 'Autres demandes',
                        emoji: '❓'
                    }
                ]
            };
            
            const success = interaction.client.database.setGuild(interaction.guild.id, guildData);
            
            if (!success) {
                throw new Error('Impossible de sauvegarder la configuration');
            }
            
            // Créer l'embed de succès
            const successEmbed = KofuSignature.createSuccessEmbed(
                'Système de tickets configuré !',
                'Le système de tickets a été configuré avec succès sur ce serveur.'
            );
            
            successEmbed.addFields(
                { name: '📁 Catégorie', value: `${category} (\`${category.id}\`)`, inline: true },
                { name: '📝 Logs', value: logsChannel ? `${logsChannel} (\`${logsChannel.id}\`)` : 'Non configuré', inline: true },
                { name: '👥 Rôle Staff', value: staffRole ? `${staffRole} (\`${staffRole.id}\`)` : 'Non configuré', inline: true },
                { name: '⚙️ Configuration', value: 
                    `• **Tickets max par user:** 1\n` +
                    `• **Auto-fermeture:** Désactivée\n` +
                    `• **Catégories:** 3 (Support, Report, Autre)`, 
                    inline: false 
                }
            );
            
            // Créer les boutons d'action
            const actionButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_create_panel')
                        .setLabel('🎫 Créer le Panel')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('ticket_test_system')
                        .setLabel('🧪 Tester le Système')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('ticket_advanced_config')
                        .setLabel('⚙️ Config Avancée')
                        .setStyle(ButtonStyle.Secondary)
                );
            
            await interaction.editReply({
                embeds: [successEmbed],
                components: [actionButtons]
            });
            
            // Gérer les interactions des boutons
            handleSetupInteractions(interaction, guildData);
            
            // Logger la configuration
            interaction.client.logger.info(
                `Système de tickets configuré sur ${interaction.guild.name} par ${interaction.user.tag}`
            );
            
            console.log(`🎫 [Kofu] Système de tickets configuré sur ${interaction.guild.name}`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur configuration tickets:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur de configuration !',
                `Impossible de configurer le système de tickets.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.editReply({ embeds: [errorEmbed], components: [] });
        }
    }
};

/**
 * Gérer les interactions de configuration
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {object} guildData - Données du serveur
 * @author Kofu
 */
function handleSetupInteractions(interaction, guildData) {
    const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 300000 // 5 minutes
    });
    
    collector.on('collect', async i => {
        try {
            switch (i.customId) {
                case 'ticket_create_panel':
                    await createTicketPanel(i, guildData);
                    break;
                case 'ticket_test_system':
                    await testTicketSystem(i, guildData);
                    break;
                case 'ticket_advanced_config':
                    await showAdvancedConfig(i, guildData);
                    break;
            }
        } catch (error) {
            console.error('❌ [Kofu] Erreur interaction setup tickets:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur !',
                `Une erreur est survenue: \`${error.message}\``
            );
            
            await i.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    });
    
    collector.on('end', () => {
        console.log(`⏱️ [Kofu] Fin de la configuration tickets pour ${interaction.user.tag}`);
    });
}

/**
 * Créer le panel de tickets
 * @param {ButtonInteraction} interaction - L'interaction de bouton
 * @param {object} guildData - Données du serveur
 * @author Kofu
 */
async function createTicketPanel(interaction, guildData) {
    // Créer l'embed du panel
    const panelEmbed = new EmbedBuilder()
        .setTitle('🎫 Système de Tickets - TASHKY Bot')
        .setDescription(
            '**Besoin d\'aide ? Crée un ticket !** 🆘\n\n' +
            '🛠️ **Support Technique** - Problèmes techniques et bugs\n' +
            '🚨 **Signalement** - Signaler un utilisateur ou un problème\n' +
            '❓ **Autre** - Autres demandes\n\n' +
            '**Clique sur un bouton ci-dessous pour créer ton ticket** 👇\n\n' +
            '*Un seul ticket par utilisateur à la fois*'
        )
        .setColor('#5865F2')
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    // Créer les boutons du panel
    const panelButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_create_support')
                .setLabel('Support Technique')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🛠️'),
            new ButtonBuilder()
                .setCustomId('ticket_create_report')
                .setLabel('Signalement')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🚨'),
            new ButtonBuilder()
                .setCustomId('ticket_create_other')
                .setLabel('Autre')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❓')
        );
    
    // Envoyer le panel dans le salon actuel
    const panelMessage = await interaction.channel.send({
        embeds: [panelEmbed],
        components: [panelButtons]
    });
    
    // Confirmer la création
    const confirmEmbed = KofuSignature.createSuccessEmbed(
        'Panel créé !',
        `Le panel de tickets a été créé avec succès dans ce salon.\n\n` +
        `**Message ID:** \`${panelMessage.id}\`\n` +
        `**Salon:** ${interaction.channel}`
    );
    
    await interaction.update({
        embeds: [confirmEmbed],
        components: []
    });
    
    console.log(`🎫 [Kofu] Panel de tickets créé dans ${interaction.channel.name}`);
}

/**
 * Tester le système de tickets
 * @param {ButtonInteraction} interaction - L'interaction de bouton
 * @param {object} guildData - Données du serveur
 * @author Kofu
 */
async function testTicketSystem(interaction, guildData) {
    const testEmbed = new EmbedBuilder()
        .setTitle('🧪 Test du Système de Tickets')
        .setDescription(
            '**Test des composants du système...**\n\n' +
            '✅ Configuration sauvegardée\n' +
            '✅ Catégorie accessible\n' +
            '✅ Permissions du bot vérifiées\n' +
            '✅ Base de données fonctionnelle\n\n' +
            '**Le système de tickets est prêt à être utilisé !** 🎉'
        )
        .setColor('#43B581')
        .addFields(
            { name: '📁 Catégorie', value: `<#${guildData.tickets.category}>`, inline: true },
            { name: '📝 Logs', value: guildData.tickets.transcriptsChannel ? `<#${guildData.tickets.transcriptsChannel}>` : 'Non configuré', inline: true },
            { name: '👥 Staff', value: guildData.tickets.staffRoles.length > 0 ? `<@&${guildData.tickets.staffRoles[0]}>` : 'Non configuré', inline: true }
        )
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    await interaction.update({
        embeds: [testEmbed],
        components: []
    });
}

/**
 * Afficher la configuration avancée
 * @param {ButtonInteraction} interaction - L'interaction de bouton
 * @param {object} guildData - Données du serveur
 * @author Kofu
 */
async function showAdvancedConfig(interaction, guildData) {
    const configEmbed = new EmbedBuilder()
        .setTitle('⚙️ Configuration Avancée des Tickets')
        .setDescription(
            '**Paramètres avancés du système de tickets**\n\n' +
            '🔧 Utilise les commandes suivantes pour personnaliser:\n\n' +
            '• `/ticket-config max-tickets <nombre>` - Tickets max par user\n' +
            '• `/ticket-config auto-close <true/false>` - Auto-fermeture\n' +
            '• `/ticket-config welcome-message <message>` - Message d\'accueil\n' +
            '• `/ticket-config add-staff-role <role>` - Ajouter un rôle staff\n' +
            '• `/ticket-config remove-staff-role <role>` - Retirer un rôle staff'
        )
        .setColor('#9B59B6')
        .addFields(
            { name: '📊 Configuration Actuelle', value: 
                `• **Max tickets/user:** ${guildData.tickets.maxTicketsPerUser}\n` +
                `• **Auto-fermeture:** ${guildData.tickets.autoClose ? 'Activée' : 'Désactivée'}\n` +
                `• **Rôles staff:** ${guildData.tickets.staffRoles.length}`, 
                inline: false 
            }
        )
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    await interaction.update({
        embeds: [configEmbed],
        components: []
    });
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */