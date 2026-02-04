/**
 * ====================================
 * COMMANDE: /unban
 * ====================================
 * 
 * Débannir un utilisateur
 * Retirer un ban permanent ou temporaire
 * 
 * @author Kofu (github.com/kofudev)
 * @category Moderation
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('🔓 Débannir un utilisateur')
        .addStringOption(option =>
            option.setName('utilisateur')
                .setDescription('ID ou nom#discriminant de l\'utilisateur à débannir')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du déban')
                .setRequired(false)
                .setMaxLength(512)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    category: 'moderation',
    cooldown: 3,
    guildOnly: true,
    permissions: ['BanMembers'],
    botPermissions: ['BanMembers'],
    
    /**
     * Exécution de la commande unban
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const userInput = interaction.options.getString('utilisateur');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
        
        try {
            // Créer l'embed de recherche
            const searchEmbed = new EmbedBuilder()
                .setTitle('🔍 Recherche en cours...')
                .setDescription(`Recherche de l'utilisateur banni: \`${userInput}\``)
                .setColor('#FAA61A')
                .setFooter(KofuSignature.getKofuFooter())
                .setTimestamp();
            
            await interaction.reply({ embeds: [searchEmbed] });
            
            // Récupérer la liste des bans
            const bans = await interaction.guild.bans.fetch();
            
            if (bans.size === 0) {
                const errorEmbed = KofuSignature.createErrorEmbed(
                    'Aucun ban trouvé !',
                    'Il n\'y a aucun utilisateur banni sur ce serveur.'
                );
                return interaction.editReply({ embeds: [errorEmbed] });
            }
            
            // Chercher l'utilisateur banni
            let targetBan = null;
            
            // Recherche par ID
            if (/^\d{17,19}$/.test(userInput)) {
                targetBan = bans.get(userInput);
            } else {
                // Recherche par nom#discriminant ou nom d'utilisateur
                targetBan = bans.find(ban => {
                    const user = ban.user;
                    return user.tag.toLowerCase() === userInput.toLowerCase() ||
                           user.username.toLowerCase() === userInput.toLowerCase() ||
                           user.displayName?.toLowerCase() === userInput.toLowerCase();
                });
            }
            
            if (!targetBan) {
                const errorEmbed = KofuSignature.createErrorEmbed(
                    'Utilisateur non trouvé !',
                    `Aucun utilisateur banni correspondant à \`${userInput}\` n'a été trouvé.\n\n` +
                    '**Formats acceptés:**\n' +
                    '• ID utilisateur: `123456789012345678`\n' +
                    '• Nom complet: `Utilisateur#1234`\n' +
                    '• Nom d\'utilisateur: `Utilisateur`'
                );
                return interaction.editReply({ embeds: [errorEmbed] });
            }
            
            const targetUser = targetBan.user;
            
            // Créer l'embed de confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle('🔓 Déban en cours...')
                .setDescription(`Déban de ${targetUser.tag} en cours...`)
                .setColor('#43B581')
                .setFooter(KofuSignature.getKofuFooter())
                .setTimestamp();
            
            await interaction.editReply({ embeds: [confirmEmbed] });
            
            // Envoyer un MP à l'utilisateur avant le déban (si possible)
            await sendUnbanNotification(targetUser, interaction.guild, reason, interaction.user);
            
            // Effectuer le déban
            await interaction.guild.members.unban(targetUser.id, `${reason} | Modérateur: ${interaction.user.tag}`);
            
            // Mettre à jour la base de données
            await updateBanInDatabase(interaction, targetUser, reason);
            
            // Créer l'embed de succès
            const successEmbed = KofuSignature.createSuccessEmbed(
                'Utilisateur débanni !',
                `**${targetUser.tag}** a été débanni avec succès.`
            );
            
            successEmbed.addFields(
                { name: '👤 Utilisateur débanni', value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '📝 Raison du déban', value: reason, inline: false },
                { name: '📝 Raison du ban original', value: targetBan.reason || 'Aucune raison spécifiée', inline: false },
                { name: '📅 Débanni le', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '💡 Information', value: 'L\'utilisateur peut maintenant rejoindre le serveur à nouveau.', inline: false }
            );
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Logger l'action
            interaction.client.logger.logModeration(
                interaction.user,
                'UNBAN',
                targetUser,
                {
                    guild: interaction.guild,
                    reason: reason,
                    originalReason: targetBan.reason
                }
            );
            
            // Envoyer dans le salon de logs si configuré
            await sendToModerationLogs(interaction, targetUser, reason, targetBan.reason);
            
            console.log(`🔓 [Kofu] ${targetUser.tag} débanni sur ${interaction.guild.name} par ${interaction.user.tag}`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur lors du déban:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur lors du déban !',
                `Impossible de débannir l'utilisateur.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

/**
 * Envoyer une notification de déban à l'utilisateur
 * @param {User} user - L'utilisateur à notifier
 * @param {Guild} guild - Le serveur
 * @param {string} reason - Raison du déban
 * @param {User} moderator - Le modérateur
 * @author Kofu
 */
async function sendUnbanNotification(user, guild, reason, moderator) {
    try {
        const notificationEmbed = new EmbedBuilder()
            .setTitle('🔓 Tu as été débanni !')
            .setDescription(`Ton ban a été retiré du serveur **${guild.name}**.`)
            .setColor('#43B581')
            .addFields(
                { name: '🏛️ Serveur', value: guild.name, inline: true },
                { name: '🛡️ Modérateur', value: moderator.tag, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '✅ Information', value: 'Tu peux maintenant rejoindre le serveur à nouveau ! Assure-toi de respecter les règles.', inline: false },
                { name: '🔗 Lien d\'invitation', value: `[Rejoindre ${guild.name}](https://discord.gg/invite)`, inline: false }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await user.send({ embeds: [notificationEmbed] });
        console.log(`📨 [Kofu] Notification de déban envoyée à ${user.tag}`);
        
    } catch (error) {
        console.log(`⚠️ [Kofu] Impossible d'envoyer la notification à ${user.tag}: ${error.message}`);
    }
}

/**
 * Mettre à jour le ban dans la base de données
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {User} targetUser - L'utilisateur débanni
 * @param {string} reason - Raison du déban
 * @author Kofu
 */
async function updateBanInDatabase(interaction, targetUser, reason) {
    try {
        // Marquer le ban comme inactif dans la base de données
        const bansData = interaction.client.database.read('sanctions/bans.json') || { bans: [], lastUpdated: new Date() };
        
        // Trouver le ban actif le plus récent pour cet utilisateur sur ce serveur
        const activeBan = bansData.bans
            .filter(b => b.userId === targetUser.id && b.guildId === interaction.guild.id && b.active)
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];
        
        if (activeBan) {
            activeBan.active = false;
            activeBan.unbanDate = new Date();
            activeBan.unbannedBy = interaction.user.id;
            activeBan.unbanReason = reason;
        }
        
        bansData.lastUpdated = new Date();
        interaction.client.database.write('sanctions/bans.json', bansData);
        
        console.log(`💾 [Kofu] Déban sauvegardé en base de données pour ${targetUser.tag}`);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur sauvegarde déban:', error);
    }
}

/**
 * Envoyer le log dans le salon de modération
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {User} targetUser - L'utilisateur débanni
 * @param {string} reason - Raison du déban
 * @param {string} originalReason - Raison du ban original
 * @author Kofu
 */
async function sendToModerationLogs(interaction, targetUser, reason, originalReason) {
    try {
        const guildData = interaction.client.database.getGuild(interaction.guild.id);
        const logChannelId = guildData.logs.moderation;
        
        if (!logChannelId) return;
        
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;
        
        const logEmbed = new EmbedBuilder()
            .setTitle('🔓 Utilisateur Débanni')
            .setColor('#43B581')
            .addFields(
                { name: '👤 Utilisateur', value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '📝 Raison du déban', value: reason, inline: false },
                { name: '📝 Raison du ban original', value: originalReason || 'Aucune raison spécifiée', inline: false },
                { name: '📅 Débanni le', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await logChannel.send({ embeds: [logEmbed] });
        console.log(`📝 [Kofu] Log de déban envoyé dans ${logChannel.name}`);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur envoi log modération:', error);
    }
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */