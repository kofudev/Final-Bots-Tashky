/**
 * ====================================
 * COMMANDE: /mute
 * ====================================
 * 
 * Rendre muet un membre avec durée personnalisable
 * Système de timeout Discord natif
 * 
 * @author Kofu (github.com/kofudev)
 * @category Moderation
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('🔇 Rendre muet un membre')
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Membre à rendre muet')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('duree')
                .setDescription('Durée du mute (ex: 10m, 1h, 1d)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du mute')
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
     * Exécution de la commande mute
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const targetUser = interaction.options.getUser('membre');
        const duration = interaction.options.getString('duree') || '10m';
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
        
        // Vérifications de sécurité
        const securityCheck = await performSecurityChecks(interaction, targetUser);
        if (!securityCheck.success) {
            return interaction.reply({ embeds: [securityCheck.embed], ephemeral: true });
        }
        
        const targetMember = securityCheck.member;
        
        // Vérifier si l'utilisateur est déjà muet
        if (targetMember.communicationDisabledUntil && targetMember.communicationDisabledUntil > new Date()) {
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Utilisateur déjà muet !',
                `**${targetUser.tag}** est déjà en timeout jusqu'au <t:${Math.floor(targetMember.communicationDisabledUntil.getTime() / 1000)}:F>.`
            );
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        try {
            // Parser la durée
            const muteDuration = parseDuration(duration);
            if (!muteDuration || muteDuration > 28 * 24 * 60 * 60 * 1000) { // Max 28 jours
                const errorEmbed = KofuSignature.createErrorEmbed(
                    'Durée invalide !',
                    'La durée doit être au format `10m`, `1h`, `1d` et ne peut pas dépasser 28 jours.\n\n' +
                    '**Exemples valides:**\n' +
                    '• `5m` - 5 minutes\n' +
                    '• `2h` - 2 heures\n' +
                    '• `1d` - 1 jour\n' +
                    '• `7d` - 7 jours'
                );
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            
            // Créer l'embed de confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle('🔇 Mute en cours...')
                .setDescription(`Mise en timeout de ${targetUser.tag} en cours...`)
                .setColor('#FAA61A')
                .setFooter(KofuSignature.getKofuFooter())
                .setTimestamp();
            
            await interaction.reply({ embeds: [confirmEmbed] });
            
            // Calculer la date de fin
            const muteEndDate = new Date(Date.now() + muteDuration);
            
            // Envoyer un MP à l'utilisateur avant le mute (si possible)
            await sendMuteNotification(targetUser, interaction.guild, reason, interaction.user, muteEndDate);
            
            // Effectuer le mute
            await targetMember.timeout(muteDuration, `${reason} | Modérateur: ${interaction.user.tag}`);
            
            // Enregistrer dans la base de données
            await saveMuteToDatabase(interaction, targetUser, reason, muteEndDate);
            
            // Créer l'embed de succès
            const successEmbed = KofuSignature.createSuccessEmbed(
                'Membre rendu muet !',
                `**${targetUser.tag}** a été rendu muet avec succès.`
            );
            
            successEmbed.addFields(
                { name: '👤 Utilisateur muet', value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '⏱️ Durée', value: formatDuration(muteDuration), inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '🕐 Fin du mute', value: `<t:${Math.floor(muteEndDate.getTime() / 1000)}:F>`, inline: true },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            );
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Logger l'action
            interaction.client.logger.logModeration(
                interaction.user,
                'MUTE',
                targetUser,
                {
                    guild: interaction.guild,
                    reason: reason,
                    duration: muteDuration,
                    endDate: muteEndDate
                }
            );
            
            // Envoyer dans le salon de logs si configuré
            await sendToModerationLogs(interaction, targetUser, reason, muteDuration, muteEndDate);
            
            console.log(`🔇 [Kofu] ${targetUser.tag} muet sur ${interaction.guild.name} par ${interaction.user.tag} (${formatDuration(muteDuration)})`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur lors du mute:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur lors du mute !',
                `Impossible de rendre muet ${targetUser.tag}.\n\n**Erreur:** \`${error.message}\``
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
    // Vérifier que l'utilisateur n'essaie pas de se mute lui-même
    if (targetUser.id === interaction.user.id) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Action impossible !',
                'Tu ne peux pas te rendre muet toi-même ! 🤔'
            )
        };
    }
    
    // Vérifier que ce n'est pas le bot
    if (targetUser.id === interaction.client.user.id) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Action impossible !',
                'Je ne peux pas me rendre muet moi-même ! 😅'
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
    
    // Vérifier que l'utilisateur n'est pas le propriétaire du serveur
    if (targetMember.id === interaction.guild.ownerId) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Action impossible !',
                'Tu ne peux pas rendre muet le propriétaire du serveur !'
            )
        };
    }
    
    // Vérifier la hiérarchie des rôles
    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Hiérarchie insuffisante !',
                'Tu ne peux pas rendre muet quelqu\'un ayant un rôle égal ou supérieur au tien !'
            )
        };
    }
    
    // Vérifier que le bot peut mute cet utilisateur
    if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Hiérarchie insuffisante !',
                'Je ne peux pas rendre muet quelqu\'un ayant un rôle égal ou supérieur au mien !'
            )
        };
    }
    
    return { success: true, member: targetMember };
}

/**
 * Parser une durée en format texte
 * @param {string} duration - Durée au format "10m", "1h", "1d"
 * @returns {number|null} Durée en millisecondes ou null si invalide
 * @author Kofu
 */
function parseDuration(duration) {
    const regex = /^(\d+)([smhd])$/i;
    const match = duration.match(regex);
    
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    const multipliers = {
        's': 1000,           // secondes
        'm': 60 * 1000,      // minutes
        'h': 60 * 60 * 1000, // heures
        'd': 24 * 60 * 60 * 1000 // jours
    };
    
    return value * multipliers[unit];
}

/**
 * Formater une durée en format lisible
 * @param {number} duration - Durée en millisecondes
 * @returns {string} Durée formatée
 * @author Kofu
 */
function formatDuration(duration) {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days} jour(s)`;
    } else if (hours > 0) {
        return `${hours} heure(s)`;
    } else if (minutes > 0) {
        return `${minutes} minute(s)`;
    } else {
        return `${seconds} seconde(s)`;
    }
}

/**
 * Envoyer une notification de mute à l'utilisateur
 * @param {User} user - L'utilisateur à notifier
 * @param {Guild} guild - Le serveur
 * @param {string} reason - Raison du mute
 * @param {User} moderator - Le modérateur
 * @param {Date} endDate - Date de fin du mute
 * @author Kofu
 */
async function sendMuteNotification(user, guild, reason, moderator, endDate) {
    try {
        const notificationEmbed = new EmbedBuilder()
            .setTitle('🔇 Tu as été rendu muet !')
            .setDescription(`Tu as été rendu muet sur le serveur **${guild.name}**.`)
            .setColor('#FAA61A')
            .addFields(
                { name: '🏛️ Serveur', value: guild.name, inline: true },
                { name: '🛡️ Modérateur', value: moderator.tag, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '🕐 Fin du mute', value: `<t:${Math.floor(endDate.getTime() / 1000)}:F>`, inline: true },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '💡 Information', value: 'Tu ne pourras pas envoyer de messages ni parler en vocal jusqu\'à la fin du timeout.', inline: false }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await user.send({ embeds: [notificationEmbed] });
        console.log(`📨 [Kofu] Notification de mute envoyée à ${user.tag}`);
        
    } catch (error) {
        console.log(`⚠️ [Kofu] Impossible d'envoyer la notification à ${user.tag}: ${error.message}`);
    }
}

/**
 * Sauvegarder le mute dans la base de données
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {User} targetUser - L'utilisateur muet
 * @param {string} reason - Raison du mute
 * @param {Date} endDate - Date de fin du mute
 * @author Kofu
 */
async function saveMuteToDatabase(interaction, targetUser, reason, endDate) {
    try {
        const muteData = {
            userId: targetUser.id,
            userTag: targetUser.tag,
            guildId: interaction.guild.id,
            guildName: interaction.guild.name,
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            reason: reason,
            startDate: new Date(),
            endDate: endDate,
            timestamp: new Date(),
            type: 'mute',
            active: true
        };
        
        // Ajouter à la liste des mutes
        const mutesData = interaction.client.database.read('sanctions/mutes.json') || { mutes: [], lastUpdated: new Date() };
        mutesData.mutes.push(muteData);
        mutesData.lastUpdated = new Date();
        
        interaction.client.database.write('sanctions/mutes.json', mutesData);
        
        // Mettre à jour les stats de l'utilisateur
        const userData = interaction.client.database.getUser(targetUser.id);
        userData.moderation.totalMutes = (userData.moderation.totalMutes || 0) + 1;
        userData.moderation.mutes = userData.moderation.mutes || [];
        userData.moderation.mutes.push(muteData);
        userData.updatedAt = new Date();
        
        interaction.client.database.setUser(targetUser.id, userData);
        
        console.log(`💾 [Kofu] Mute sauvegardé en base de données pour ${targetUser.tag}`);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur sauvegarde mute:', error);
    }
}

/**
 * Envoyer le log dans le salon de modération
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {User} targetUser - L'utilisateur muet
 * @param {string} reason - Raison du mute
 * @param {number} duration - Durée en millisecondes
 * @param {Date} endDate - Date de fin
 * @author Kofu
 */
async function sendToModerationLogs(interaction, targetUser, reason, duration, endDate) {
    try {
        const guildData = interaction.client.database.getGuild(interaction.guild.id);
        const logChannelId = guildData.logs.moderation;
        
        if (!logChannelId) return;
        
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;
        
        const logEmbed = new EmbedBuilder()
            .setTitle('🔇 Membre Rendu Muet')
            .setColor('#FAA61A')
            .addFields(
                { name: '👤 Utilisateur', value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '⏱️ Durée', value: formatDuration(duration), inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '🕐 Fin du mute', value: `<t:${Math.floor(endDate.getTime() / 1000)}:F>`, inline: true },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await logChannel.send({ embeds: [logEmbed] });
        console.log(`📝 [Kofu] Log de mute envoyé dans ${logChannel.name}`);
        
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