/**
 * ====================================
 * ÉVÉNEMENT: GUILD CREATE
 * ====================================
 * 
 * Déclenché quand le bot rejoint un nouveau serveur
 * Configuration automatique et message de bienvenue
 * 
 * @author Kofu (github.com/kofudev)
 * ====================================
 */

const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    name: Events.GuildCreate,
    
    /**
     * Exécution de l'événement guildCreate
     * @param {Guild} guild - Le serveur rejoint
     * @param {Client} client - Le client Discord
     * @author Kofu
     */
    async execute(guild, client) {
        console.log(`🎉 [Kofu] Nouveau serveur rejoint: ${guild.name} (${guild.id}) - ${guild.memberCount} membres`);
        
        try {
            // Créer la configuration par défaut pour le serveur
            await createDefaultGuildConfig(guild, client);
            
            // Envoyer un message de bienvenue
            await sendWelcomeMessage(guild, client);
            
            // Mettre à jour les statistiques globales
            await updateGlobalStats(client);
            
            // Logger l'événement
            client.logger.info(`Nouveau serveur rejoint: ${guild.name} (${guild.memberCount} membres)`);
            
            // Notifier les owners si configuré
            await notifyOwners(guild, client);
            
        } catch (error) {
            console.error(`❌ [Kofu] Erreur lors du traitement du nouveau serveur ${guild.name}:`, error);
            client.logger.error('Erreur guildCreate', error);
        }
    }
};

/**
 * Créer la configuration par défaut pour le serveur
 * @param {Guild} guild - Le serveur
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function createDefaultGuildConfig(guild, client) {
    try {
        // Récupérer le propriétaire du serveur
        const owner = await guild.fetchOwner();
        
        // Créer la configuration par défaut
        const defaultConfig = client.database.getDefaultGuildConfig(guild.id);
        defaultConfig.guildName = guild.name;
        defaultConfig.ownerId = owner.id;
        defaultConfig.createdAt = new Date();
        defaultConfig.updatedAt = new Date();
        
        // Sauvegarder la configuration
        const success = client.database.setGuild(guild.id, defaultConfig);
        
        if (success) {
            console.log(`✅ [Kofu] Configuration créée pour ${guild.name}`);
        } else {
            console.error(`❌ [Kofu] Impossible de créer la configuration pour ${guild.name}`);
        }
        
    } catch (error) {
        console.error(`❌ [Kofu] Erreur création config pour ${guild.name}:`, error);
    }
}

/**
 * Envoyer un message de bienvenue
 * @param {Guild} guild - Le serveur
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function sendWelcomeMessage(guild, client) {
    try {
        // Trouver un salon où envoyer le message
        const channel = findSuitableChannel(guild);
        
        if (!channel) {
            console.log(`⚠️ [Kofu] Aucun salon trouvé pour envoyer le message de bienvenue sur ${guild.name}`);
            return;
        }
        
        // Créer l'embed de bienvenue
        const welcomeEmbed = new EmbedBuilder()
            .setTitle('🎉 Merci d\'avoir ajouté TASHKY Bot !')
            .setDescription(
                `**Salut ${guild.name} !** 👋\\n\\n` +
                `Je suis **TASHKY Bot**, un bot Discord multifonction créé avec ❤️ par **Kofu**.\\n\\n` +
                `🛡️ **Modération avancée** - Ban, kick, warn, clear et plus !\\n` +
                `🎫 **Système de tickets** - Support client professionnel\\n` +
                `📊 **Logs détaillés** - Suivez tout ce qui se passe\\n` +
                `🌐 **Multilingue** - Français et Anglais supportés\\n` +
                `⚙️ **Personnalisable** - Adaptez-moi à vos besoins\\n\\n` +
                `**Commencez par utiliser \`/help\` pour découvrir toutes mes fonctionnalités !** 🚀`
            )
            .setColor('#5865F2')
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                {
                    name: '🚀 Démarrage Rapide',
                    value: 
                        `• \`/help\` - Voir toutes les commandes\\n` +
                        `• \`/language\` - Changer la langue\\n` +
                        `• \`/ticket-setup\` - Configurer les tickets\\n` +
                        `• \`/config\` - Configurer le bot`,
                    inline: true
                },
                {
                    name: '📊 Statistiques',
                    value: 
                        `🏛️ **Serveurs:** ${client.guilds.cache.size}\\n` +
                        `👥 **Utilisateurs:** ${client.users.cache.size}\\n` +
                        `⚙️ **Commandes:** ${client.commands.size}`,
                    inline: true
                },
                {
                    name: '🔗 Liens Utiles',
                    value: 
                        `[📖 Documentation](https://github.com/kofudev/tashky-bot)\\n` +
                        `[💬 Support](https://discord.gg/support)\\n` +
                        `[⭐ GitHub](https://github.com/kofudev)`,
                    inline: false
                }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Créer les boutons d'action
        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('📚 Guide de Démarrage')
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId('welcome_guide'),
                new ButtonBuilder()
                    .setLabel('⚙️ Configuration')
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId('welcome_config'),
                new ButtonBuilder()
                    .setLabel('💬 Support')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/support'),
                new ButtonBuilder()
                    .setLabel('⭐ GitHub')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://github.com/kofudev/tashky-bot')
            );
        
        // Envoyer le message
        await channel.send({
            embeds: [welcomeEmbed],
            components: [actionButtons]
        });
        
        console.log(`📨 [Kofu] Message de bienvenue envoyé dans ${channel.name} sur ${guild.name}`);
        
    } catch (error) {
        console.error(`❌ [Kofu] Erreur envoi message bienvenue sur ${guild.name}:`, error);
    }
}

/**
 * Trouver un salon approprié pour envoyer le message
 * @param {Guild} guild - Le serveur
 * @returns {TextChannel|null} Le salon trouvé ou null
 * @author Kofu
 */
function findSuitableChannel(guild) {
    // Ordre de préférence pour les salons
    const preferredNames = [
        'general', 'général', 'accueil', 'welcome',
        'bot', 'bots', 'commands', 'commandes',
        'chat', 'discussion', 'salon-principal'
    ];
    
    // Chercher par nom préféré
    for (const name of preferredNames) {
        const channel = guild.channels.cache.find(ch => 
            ch.type === 0 && // TextChannel
            ch.name.toLowerCase().includes(name) &&
            ch.permissionsFor(guild.members.me)?.has(['SendMessages', 'EmbedLinks'])
        );
        
        if (channel) return channel;
    }
    
    // Chercher le premier salon où le bot peut écrire
    const channel = guild.channels.cache.find(ch =>
        ch.type === 0 && // TextChannel
        ch.permissionsFor(guild.members.me)?.has(['SendMessages', 'EmbedLinks'])
    );
    
    return channel || null;
}

/**
 * Mettre à jour les statistiques globales
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function updateGlobalStats(client) {
    try {
        const globalData = client.database.read('globaldata.json') || client.database.getDefaultGlobalData();
        
        globalData.statistics.totalGuilds = client.guilds.cache.size;
        globalData.statistics.totalUsers = client.users.cache.size;
        globalData.lastUpdated = new Date();
        
        client.database.write('globaldata.json', globalData);
        
        console.log(`📊 [Kofu] Stats mises à jour: ${client.guilds.cache.size} serveurs, ${client.users.cache.size} utilisateurs`);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur mise à jour stats globales:', error);
    }
}

/**
 * Notifier les owners du nouveau serveur
 * @param {Guild} guild - Le serveur
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function notifyOwners(guild, client) {
    try {
        const owners = process.env.BOT_OWNERS ? JSON.parse(process.env.BOT_OWNERS) : [];
        
        if (owners.length === 0) return;
        
        // Récupérer des infos sur le serveur
        const owner = await guild.fetchOwner();
        const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);
        
        // Créer l'embed de notification
        const notificationEmbed = new EmbedBuilder()
            .setTitle('🎉 Nouveau Serveur Rejoint !')
            .setDescription(`TASHKY Bot a rejoint un nouveau serveur !`)
            .setColor('#43B581')
            .setThumbnail(guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL())
            .addFields(
                { name: '🏛️ Serveur', value: `**${guild.name}**\\n\`${guild.id}\``, inline: true },
                { name: '👑 Propriétaire', value: `**${owner.user.tag}**\\n\`${owner.id}\``, inline: true },
                { name: '👥 Membres', value: `\`${guild.memberCount}\``, inline: true },
                { name: '📅 Créé le', value: `<t:${createdTimestamp}:F>`, inline: true },
                { name: '📊 Total serveurs', value: `\`${client.guilds.cache.size}\``, inline: true },
                { name: '📈 Croissance', value: `+1 serveur`, inline: true }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Envoyer à tous les owners
        for (const ownerId of owners) {
            try {
                const ownerUser = await client.users.fetch(ownerId);
                await ownerUser.send({ embeds: [notificationEmbed] });
                console.log(`📨 [Kofu] Notification envoyée à l'owner ${ownerUser.tag}`);
            } catch (error) {
                console.log(`⚠️ [Kofu] Impossible d'envoyer la notification à l'owner ${ownerId}: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur notification owners:', error);
    }
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */