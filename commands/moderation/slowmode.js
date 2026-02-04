/**
 * ====================================
 * COMMANDE: /slowmode
 * ====================================
 * 
 * Gérer le mode lent d'un salon
 * Limiter la fréquence des messages
 * 
 * @author Kofu (github.com/kofudev)
 * @category Moderation
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('⏱️ Gérer le mode lent d\'un salon')
        .addIntegerOption(option =>
            option.setName('duree')
                .setDescription('Durée en secondes entre chaque message (0 pour désactiver)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600) // 6 heures max
        )
        .addChannelOption(option =>
            option.setName('salon')
                .setDescription('Salon à modifier (salon actuel par défaut)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildNews, ChannelType.GuildForum)
        )
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du changement de slowmode')
                .setRequired(false)
                .setMaxLength(512)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    category: 'moderation',
    cooldown: 3,
    guildOnly: true,
    permissions: ['ManageChannels'],
    botPermissions: ['ManageChannels'],
    
    /**
     * Exécution de la commande slowmode
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const duration = interaction.options.getInteger('duree');
        const targetChannel = interaction.options.getChannel('salon') || interaction.channel;
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
        
        // Vérifications de sécurité
        const securityCheck = performSecurityChecks(interaction, targetChannel, duration);
        if (!securityCheck.success) {
            return interaction.reply({ embeds: [securityCheck.embed], ephemeral: true });
        }
        
        try {
            // Créer l'embed de confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle('⏱️ Modification du slowmode...')
                .setDescription(`Modification du mode lent de ${targetChannel} en cours...`)
                .setColor('#FAA61A')
                .setFooter(KofuSignature.getKofuFooter())
                .setTimestamp();
            
            await interaction.reply({ embeds: [confirmEmbed] });
            
            // Sauvegarder l'ancien slowmode
            const oldSlowmode = targetChannel.rateLimitPerUser;
            
            // Appliquer le nouveau slowmode
            await targetChannel.setRateLimitPerUser(
                duration,
                `${reason} | Modérateur: ${interaction.user.tag}`
            );
            
            // Enregistrer dans la base de données
            await saveSlowmodeToDatabase(interaction, targetChannel, duration, oldSlowmode, reason);
            
            // Créer l'embed de succès
            const successEmbed = KofuSignature.createSuccessEmbed(
                'Slowmode modifié !',
                `Le mode lent de ${targetChannel} a été modifié avec succès.`
            );
            
            successEmbed.addFields(
                { name: '📺 Salon', value: `${targetChannel.name}\n\`${targetChannel.id}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '⏱️ Nouveau slowmode', value: formatSlowmode(duration), inline: true },
                { name: '⏱️ Ancien slowmode', value: formatSlowmode(oldSlowmode), inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            );
            
            // Ajouter des informations supplémentaires selon le cas
            if (duration === 0) {
                successEmbed.addFields({
                    name: '✅ Information',
                    value: 'Le mode lent a été désactivé. Les utilisateurs peuvent maintenant envoyer des messages sans délai.',
                    inline: false
                });
            } else {
                successEmbed.addFields({
                    name: '⏳ Information',
                    value: `Les utilisateurs devront attendre ${formatSlowmode(duration)} entre chaque message.`,
                    inline: false
                });
            }
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Logger l'action
            interaction.client.logger.logModeration(
                interaction.user,
                'SLOWMODE',
                null,
                {
                    guild: interaction.guild,
                    channel: targetChannel,
                    reason: reason,
                    newDuration: duration,
                    oldDuration: oldSlowmode
                }
            );
            
            // Envoyer dans le salon de logs si configuré
            await sendToModerationLogs(interaction, targetChannel, duration, oldSlowmode, reason);
            
            console.log(`⏱️ [Kofu] Slowmode modifié dans #${targetChannel.name} sur ${interaction.guild.name} par ${interaction.user.tag} (${formatSlowmode(duration)})`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur lors de la modification du slowmode:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur lors de la modification !',
                `Impossible de modifier le slowmode de ${targetChannel}.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

/**
 * Effectuer les vérifications de sécurité
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {Channel} targetChannel - Le salon cible
 * @param {number} duration - Durée du slowmode
 * @returns {object} Résultat des vérifications
 * @author Kofu
 */
function performSecurityChecks(interaction, targetChannel, duration) {
    // Vérifier que le salon est dans le même serveur
    if (targetChannel.guild.id !== interaction.guild.id) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Salon invalide !',
                'Tu ne peux pas modifier le slowmode d\'un salon d\'un autre serveur !'
            )
        };
    }
    
    // Vérifier le type de salon
    const validChannelTypes = [ChannelType.GuildText, ChannelType.GuildNews, ChannelType.GuildForum];
    if (!validChannelTypes.includes(targetChannel.type)) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Type de salon invalide !',
                'Le slowmode ne peut être appliqué qu\'aux salons textuels, d\'annonces ou de forum.'
            )
        };
    }
    
    // Vérifier que l'utilisateur a les permissions sur ce salon
    if (!targetChannel.permissionsFor(interaction.member).has(PermissionFlagsBits.ManageChannels)) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Permissions insuffisantes !',
                `Tu n'as pas la permission de gérer le salon ${targetChannel} !`
            )
        };
    }
    
    // Vérifier que le bot a les permissions sur ce salon
    if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageChannels)) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Permissions insuffisantes !',
                `Je n'ai pas la permission de gérer le salon ${targetChannel} !`
            )
        };
    }
    
    // Vérifier que la durée est valide
    if (duration < 0 || duration > 21600) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Durée invalide !',
                'La durée du slowmode doit être entre 0 et 21600 secondes (6 heures).\n\n' +
                '**Exemples:**\n' +
                '• `0` - Désactiver le slowmode\n' +
                '• `5` - 5 secondes\n' +
                '• `30` - 30 secondes\n' +
                '• `300` - 5 minutes\n' +
                '• `3600` - 1 heure'
            )
        };
    }
    
    return { success: true };
}

/**
 * Formater la durée du slowmode
 * @param {number} seconds - Durée en secondes
 * @returns {string} Durée formatée
 * @author Kofu
 */
function formatSlowmode(seconds) {
    if (seconds === 0) {
        return 'Désactivé';
    }
    
    if (seconds < 60) {
        return `${seconds} seconde(s)`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
        if (remainingSeconds === 0) {
            return `${minutes} minute(s)`;
        } else {
            return `${minutes} minute(s) ${remainingSeconds} seconde(s)`;
        }
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
        return `${hours} heure(s)`;
    } else {
        return `${hours} heure(s) ${remainingMinutes} minute(s)`;
    }
}

/**
 * Sauvegarder le changement de slowmode dans la base de données
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {Channel} targetChannel - Le salon modifié
 * @param {number} newDuration - Nouvelle durée
 * @param {number} oldDuration - Ancienne durée
 * @param {string} reason - Raison du changement
 * @author Kofu
 */
async function saveSlowmodeToDatabase(interaction, targetChannel, newDuration, oldDuration, reason) {
    try {
        const slowmodeData = {
            channelId: targetChannel.id,
            channelName: targetChannel.name,
            guildId: interaction.guild.id,
            guildName: interaction.guild.name,
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            reason: reason,
            newDuration: newDuration,
            oldDuration: oldDuration,
            timestamp: new Date(),
            type: 'slowmode'
        };
        
        // Ajouter à l'historique des modifications de salon
        const channelData = interaction.client.database.read('channels/modifications.json') || { modifications: [], lastUpdated: new Date() };
        channelData.modifications.push(slowmodeData);
        channelData.lastUpdated = new Date();
        
        interaction.client.database.write('channels/modifications.json', channelData);
        
        console.log(`💾 [Kofu] Modification slowmode sauvegardée en base de données pour #${targetChannel.name}`);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur sauvegarde slowmode:', error);
    }
}

/**
 * Envoyer le log dans le salon de modération
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {Channel} targetChannel - Le salon modifié
 * @param {number} newDuration - Nouvelle durée
 * @param {number} oldDuration - Ancienne durée
 * @param {string} reason - Raison du changement
 * @author Kofu
 */
async function sendToModerationLogs(interaction, targetChannel, newDuration, oldDuration, reason) {
    try {
        const guildData = interaction.client.database.getGuild(interaction.guild.id);
        const logChannelId = guildData.logs.moderation;
        
        if (!logChannelId) return;
        
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;
        
        const logEmbed = new EmbedBuilder()
            .setTitle('⏱️ Slowmode Modifié')
            .setColor('#FAA61A')
            .addFields(
                { name: '📺 Salon', value: `${targetChannel.name}\n\`${targetChannel.id}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '⏱️ Nouveau slowmode', value: formatSlowmode(newDuration), inline: true },
                { name: '⏱️ Ancien slowmode', value: formatSlowmode(oldDuration), inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Définir la couleur selon l'action
        if (newDuration === 0 && oldDuration > 0) {
            logEmbed.setColor('#43B581'); // Vert pour désactivation
        } else if (newDuration > 0 && oldDuration === 0) {
            logEmbed.setColor('#F04747'); // Rouge pour activation
        } else {
            logEmbed.setColor('#FAA61A'); // Orange pour modification
        }
        
        await logChannel.send({ embeds: [logEmbed] });
        console.log(`📝 [Kofu] Log de slowmode envoyé dans ${logChannel.name}`);
        
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