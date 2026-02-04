/**
 * ====================================
 * COMMANDE: /unmute
 * ====================================
 * 
 * Retirer le mute d'un membre
 * Annule le timeout Discord
 * 
 * @author Kofu (github.com/kofudev)
 * @category Moderation
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('🔊 Retirer le mute d\'un membre')
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Membre à démuter')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du démute')
                .setRequired(false)
                .setMaxLength(512)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    category: 'moderation',
    cooldown: 3,
    guildOnly: true,
    permissions: ['ModerateMembers'],
    botPermissions: ['ModerateMembers'],
    
    /**
     * Exécution de la commande unmute
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const targetUser = interaction.options.getUser('membre');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
        
        // Vérifications de sécurité
        const securityCheck = await performSecurityChecks(interaction, targetUser);
        if (!securityCheck.success) {
            return interaction.reply({ embeds: [securityCheck.embed], ephemeral: true });
        }
        
        const targetMember = securityCheck.member;
        
        // Vérifier si l'utilisateur est actuellement muet
        if (!targetMember.communicationDisabledUntil || targetMember.communicationDisabledUntil <= new Date()) {
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Utilisateur pas muet !',
                `**${targetUser.tag}** n'est pas actuellement en timeout.`
            );
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        try {
            // Créer l'embed de confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle('🔊 Démute en cours...')
                .setDescription(`Retrait du timeout de ${targetUser.tag} en cours...`)
                .setColor('#43B581')
                .setFooter(KofuSignature.getKofuFooter())
                .setTimestamp();
            
            await interaction.reply({ embeds: [confirmEmbed] });
            
            // Sauvegarder les infos du mute avant de le retirer
            const originalEndDate = targetMember.communicationDisabledUntil;
            
            // Envoyer un MP à l'utilisateur avant le démute (si possible)
            await sendUnmuteNotification(targetUser, interaction.guild, reason, interaction.user);
            
            // Effectuer le démute
            await targetMember.timeout(null, `${reason} | Modérateur: ${interaction.user.tag}`);
            
            // Mettre à jour la base de données
            await updateMuteInDatabase(interaction, targetUser, reason);
            
            // Créer l'embed de succès
            const successEmbed = KofuSignature.createSuccessEmbed(
                'Membre démuté !',
                `**${targetUser.tag}** peut maintenant parler à nouveau.`
            );
            
            successEmbed.addFields(
                { name: '👤 Utilisateur démuté', value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '🕐 Était muet jusqu\'au', value: `<t:${Math.floor(originalEndDate.getTime() / 1000)}:F>`, inline: true },
                { name: '📅 Démuté le', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '⏱️ Temps restant économisé', value: calculateTimeSaved(originalEndDate), inline: true }
            );
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Logger l'action
            interaction.client.logger.logModeration(
                interaction.user,
                'UNMUTE',
                targetUser,
                {
                    guild: interaction.guild,
                    reason: reason,
                    originalEndDate: originalEndDate
                }
            );
            
            // Envoyer dans le salon de logs si configuré
            await sendToModerationLogs(interaction, targetUser, reason, originalEndDate);
            
            console.log(`🔊 [Kofu] ${targetUser.tag} démuté sur ${interaction.guild.name} par ${interaction.user.tag}`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur lors du démute:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur lors du démute !',
                `Impossible de démuter ${targetUser.tag}.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

/**
 * Effectuer les vérifications de sécurité
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {User} targetUser - L'utilisateur cible
 * @returns {object} Résultat des vérifications
 * @author Kofu
 */
async function performSecurityChecks(interaction, targetUser) {
    // Vérifier que l'utilisateur n'essaie pas de se démuter lui-même
    if (targetUser.id === interaction.user.id) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Action impossible !',
                'Tu ne peux pas te démuter toi-même ! 🤔'
            )
        };
    }
    
    // Vérifier que ce n'est pas le bot
    if (targetUser.id === interaction.client.user.id) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Action impossible !',
                'Je ne peux pas me démuter moi-même ! 😅'
            )
        };
    }
    
    // Vérifier que l'utilisateur est sur le serveur
    let targetMember;
    try {
        targetMember = await interaction.guild.members.fetch(targetUser.id);
    } catch (error) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Utilisateur introuvable !',
                'Cet utilisateur n\'est pas sur le serveur.'
            )
        };
    }
    
    return { success: true, member: targetMember };
}

/**
 * Calculer le temps économisé
 * @param {Date} originalEndDate - Date de fin originale du mute
 * @returns {string} Temps économisé formaté
 * @author Kofu
 */
function calculateTimeSaved(originalEndDate) {
    const now = new Date();
    const timeSaved = originalEndDate.getTime() - now.getTime();
    
    if (timeSaved <= 0) {
        return 'Le mute était déjà expiré';
    }
    
    const seconds = Math.floor(timeSaved / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days} jour(s) ${hours % 24} heure(s)`;
    } else if (hours > 0) {
        return `${hours} heure(s) ${minutes % 60} minute(s)`;
    } else if (minutes > 0) {
        return `${minutes} minute(s)`;
    } else {
        return `${seconds} seconde(s)`;
    }
}

/**
 * Envoyer une notification de démute à l'utilisateur
 * @param {User} user - L'utilisateur à notifier
 * @param {Guild} guild - Le serveur
 * @param {string} reason - Raison du démute
 * @param {User} moderator - Le modérateur
 * @author Kofu
 */
async function sendUnmuteNotification(user, guild, reason, moderator) {
    try {
        const notificationEmbed = new EmbedBuilder()
            .setTitle('🔊 Tu peux maintenant parler !')
            .setDescription(`Ton timeout a été retiré sur le serveur **${guild.name}**.`)
            .setColor('#43B581')
            .addFields(
                { name: '🏛️ Serveur', value: guild.name, inline: true },
                { name: '🛡️ Modérateur', value: moderator.tag, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '✅ Information', value: 'Tu peux maintenant envoyer des messages et parler en vocal à nouveau !', inline: false }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await user.send({ embeds: [notificationEmbed] });
        console.log(`📨 [Kofu] Notification de démute envoyée à ${user.tag}`);
        
    } catch (error) {
        console.log(`⚠️ [Kofu] Impossible d'envoyer la notification à ${user.tag}: ${error.message}`);
    }
}

/**
 * Mettre à jour le mute dans la base de données
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {User} targetUser - L'utilisateur démuté
 * @param {string} reason - Raison du démute
 * @author Kofu
 */
async function updateMuteInDatabase(interaction, targetUser, reason) {
    try {
        // Marquer le mute comme inactif dans la base de données
        const mutesData = interaction.client.database.read('sanctions/mutes.json') || { mutes: [], lastUpdated: new Date() };
        
        // Trouver le mute actif le plus récent pour cet utilisateur sur ce serveur
        const activeMute = mutesData.mutes
            .filter(m => m.userId === targetUser.id && m.guildId === interaction.guild.id && m.active)
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];
        
        if (activeMute) {
            activeMute.active = false;
            activeMute.unmuteDate = new Date();
            activeMute.unmutedBy = interaction.user.id;
            activeMute.unmuteReason = reason;
        }
        
        mutesData.lastUpdated = new Date();
        interaction.client.database.write('sanctions/mutes.json', mutesData);
        
        console.log(`💾 [Kofu] Démute sauvegardé en base de données pour ${targetUser.tag}`);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur sauvegarde démute:', error);
    }
}

/**
 * Envoyer le log dans le salon de modération
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {User} targetUser - L'utilisateur démuté
 * @param {string} reason - Raison du démute
 * @param {Date} originalEndDate - Date de fin originale
 * @author Kofu
 */
async function sendToModerationLogs(interaction, targetUser, reason, originalEndDate) {
    try {
        const guildData = interaction.client.database.getGuild(interaction.guild.id);
        const logChannelId = guildData.logs.moderation;
        
        if (!logChannelId) return;
        
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;
        
        const logEmbed = new EmbedBuilder()
            .setTitle('🔊 Membre Démuté')
            .setColor('#43B581')
            .addFields(
                { name: '👤 Utilisateur', value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '🕐 Était muet jusqu\'au', value: `<t:${Math.floor(originalEndDate.getTime() / 1000)}:F>`, inline: true },
                { name: '📅 Démuté le', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '⏱️ Temps économisé', value: calculateTimeSaved(originalEndDate), inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await logChannel.send({ embeds: [logEmbed] });
        console.log(`📝 [Kofu] Log de démute envoyé dans ${logChannel.name}`);
        
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