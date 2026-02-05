// créé par kofudev - commande owner only pour userinfo complet
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const EmbedFactory = require('../../utils/embed');
const colors = require('../../config/colors');
const emojis = require('../../config/emojis');
const config = require('../../config/config');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alluserinfo')
        .setDescription('Informations ultra-complètes d\'un utilisateur (même hors serveur) - Owner only')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('L\'ID Discord de l\'utilisateur')
                .setRequired(true)
        ),
    
    category: 'admin',
    cooldown: 5000,
    ownerOnly: true,
    
    async execute(interaction) {
        // Vérifier immédiatement si l'utilisateur est propriétaire
        if (!config.bot.owners.includes(interaction.user.id)) {
            return await interaction.reply({
                embeds: [EmbedFactory.error('Accès refusé', 'Cette commande est réservée aux propriétaires du bot.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        // Defer immédiatement avec gestion d'erreur
        try {
            await interaction.deferReply();
        } catch (error) {
            // Si le defer échoue, l'interaction est probablement expirée
            logger.error('Failed to defer interaction:', error);
            return;
        }

        try {
            const userId = interaction.options.getString('userid');
            
            // Vérifier si l'ID est valide
            if (!/^\d{17,19}$/.test(userId)) {
                return await interaction.editReply({
                    embeds: [EmbedFactory.error('ID invalide', 'L\'ID Discord doit contenir entre 17 et 19 chiffres.')]
                });
            }

            let targetUser;
            let targetMember = null;

            try {
                // Essayer de récupérer l'utilisateur via l'API Discord
                targetUser = await interaction.client.users.fetch(userId);
            } catch (error) {
                return await interaction.editReply({
                    embeds: [EmbedFactory.error('Utilisateur introuvable', 'Aucun utilisateur trouvé avec cet ID Discord.')]
                });
            }

            // Essayer de récupérer le membre du serveur si possible (sans bloquer)
            if (interaction.guild) {
                try {
                    targetMember = await interaction.guild.members.fetch(userId);
                } catch (error) {
                    // L'utilisateur n'est pas dans ce serveur, c'est normal
                }
            }

            // Créer une version simplifiée d'abord pour répondre rapidement
            const quickEmbed = EmbedFactory.base()
                .setColor(targetMember?.displayHexColor || colors.primary)
                .setTitle(`🔍 Analyse en cours - ${targetUser.tag}`)
                .setDescription('⏳ Génération du rapport complet...')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields({
                    name: '👤 Utilisateur',
                    value: `**ID:** \`${targetUser.id}\`\n**Tag:** ${targetUser.tag}\n**Bot:** ${targetUser.bot ? 'Oui' : 'Non'}`,
                    inline: true
                })
                .setTimestamp();

            // Envoyer la réponse rapide
            await interaction.editReply({ embeds: [quickEmbed] });

            // Créer les embeds complets en arrière-plan
            const embeds = await createCompleteUserInfoEmbeds(targetUser, targetMember, interaction);

            // Remplacer par le premier embed complet
            await interaction.editReply({ embeds: [embeds[0]] });

            // Envoyer les autres embeds
            for (let i = 1; i < embeds.length; i++) {
                try {
                    await interaction.followUp({ embeds: [embeds[i]] });
                } catch (followUpError) {
                    logger.error(`Failed to send embed ${i}:`, followUpError);
                    // Continuer avec les autres embeds même si un échoue
                }
            }

            // Log de la commande
            logger.logOwnerAction(interaction.user, 'ALLUSERINFO_COMMAND', {
                targetUserId: userId,
                targetUsername: targetUser.username,
                inGuild: !!targetMember,
                embedsCount: embeds.length,
                guildId: interaction.guild?.id,
                guildName: interaction.guild?.name
            });

        } catch (error) {
            logger.error(`Error in alluserinfo command for ${interaction.user.tag}:`, {
                error: error.message,
                stack: error.stack,
                userId: interaction.user.id
            });

            try {
                const errorEmbed = EmbedFactory.error('Erreur', 'Une erreur est survenue lors de la récupération des informations.');
                await interaction.editReply({ embeds: [errorEmbed] });
            } catch (replyError) {
                logger.error('Failed to send error response:', replyError);
            }
        }
    }
};

async function createCompleteUserInfoEmbeds(targetUser, targetMember, interaction) {
    const embeds = [];
    const accountAge = Math.floor((Date.now() - targetUser.createdTimestamp) / (1000 * 60 * 60 * 24));
    const flags = targetUser.flags?.toArray() || [];

    // Fonction helper pour tronquer les champs trop longs
    function truncateField(text, maxLength = 1020) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    // EMBED 1: Profil complet et identité
    const embed1 = EmbedFactory.base()
        .setColor(targetMember?.displayHexColor || colors.primary)
        .setTitle(`🔍 RAPPORT COMPLET D'UTILISATEUR - ${targetUser.tag}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription(`**⚠️ CONFIDENTIEL - OWNER ONLY ⚠️**\nRapport détaillé généré le <t:${Math.floor(Date.now() / 1000)}:F>`)
        .setTimestamp();

    // Identité complète
    let identityInfo = `**🆔 IDENTITÉ DISCORD:**\n`;
    identityInfo += `• ID Snowflake: \`${targetUser.id}\`\n`;
    identityInfo += `• Username: ${targetUser.username}\n`;
    identityInfo += `• Display Name: ${targetUser.globalName || 'Aucun'}\n`;
    identityInfo += `• Discriminator: #${targetUser.discriminator}\n`;
    identityInfo += `• Tag complet: ${targetUser.tag}\n`;
    identityInfo += `• Mention: ${targetUser}\n`;
    identityInfo += `• Type: ${targetUser.bot ? '🤖 Bot' : '👤 Utilisateur humain'}\n`;
    identityInfo += `• Système: ${targetUser.system ? '⚙️ Compte système Discord' : '❌ Non'}\n\n`;

    identityInfo += `**📅 CHRONOLOGIE DE VIE:**\n`;
    identityInfo += `• Création: <t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>\n`;
    identityInfo += `• Il y a: <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>\n`;
    identityInfo += `• Âge total: ${accountAge} jours (${Math.floor(accountAge / 365)} ans, ${Math.floor((accountAge % 365) / 30)} mois)\n`;
    identityInfo += `• Timestamp: \`${targetUser.createdTimestamp}\`\n`;
    identityInfo += `• Epoch: ${Math.floor(targetUser.createdTimestamp / 1000)}\n`;
    identityInfo += `• Hex ID: \`0x${BigInt(targetUser.id).toString(16)}\`\n`;
    identityInfo += `• Binary: \`${BigInt(targetUser.id).toString(2).slice(0, 32)}...\``;

    embed1.addFields({
        name: '👤 PROFIL D\'IDENTITÉ COMPLET',
        value: truncateField(identityInfo),
        inline: false
    });

    // Analyse psychologique du nom d'utilisateur
    let nameAnalysis = `**🧠 ANALYSE PSYCHOLOGIQUE DU USERNAME:**\n`;
    const username = targetUser.username;
    nameAnalysis += `• Longueur: ${username.length} caractères\n`;
    nameAnalysis += `• Complexité: ${/[A-Z]/.test(username) ? '🔴 Majuscules' : '🟢 Minuscules'}\n`;
    nameAnalysis += `• Chiffres: ${/\d/.test(username) ? `🔢 ${username.match(/\d/g)?.length || 0} chiffres` : '❌ Aucun'}\n`;
    nameAnalysis += `• Caractères spéciaux: ${/[^a-zA-Z0-9_]/.test(username) ? '⚠️ Présents' : '✅ Aucun'}\n`;
    nameAnalysis += `• Underscores: ${username.includes('_') ? '🔗 Présents' : '❌ Aucun'}\n\n`;

    // Patterns suspects
    const suspiciousPatterns = [];
    if (/(.)\1{3,}/.test(username)) suspiciousPatterns.push('🚨 Répétitions excessives');
    if (/^\d+$/.test(username)) suspiciousPatterns.push('🔴 Que des chiffres (bot suspect)');
    if (username.length < 3) suspiciousPatterns.push('⚠️ Très court (suspect)');
    if (/^[a-z]+\d+$/.test(username)) suspiciousPatterns.push('🤖 Pattern de bot classique');
    if (/^(test|user|admin|mod)/i.test(username)) suspiciousPatterns.push('🚨 Nom générique suspect');
    if (/\d{4,}/.test(username)) suspiciousPatterns.push('🔢 Séquence numérique longue');

    if (suspiciousPatterns.length > 0) {
        nameAnalysis += `**🚨 ALERTES COMPORTEMENTALES:**\n${suspiciousPatterns.join('\n')}\n\n`;
    } else {
        nameAnalysis += `**✅ PROFIL NOMINAL:** Aucun pattern suspect détecté\n\n`;
    }

    // Analyse de personnalité basée sur le nom
    nameAnalysis += `**🎭 PROFIL PSYCHOLOGIQUE ESTIMÉ:**\n`;
    if (username.toLowerCase().includes('dark') || username.toLowerCase().includes('shadow')) {
        nameAnalysis += `• Personnalité: 🖤 Tendance sombre/mystérieuse\n`;
    } else if (username.toLowerCase().includes('cute') || username.toLowerCase().includes('kawaii')) {
        nameAnalysis += `• Personnalité: 🌸 Tendance mignonne/innocente\n`;
    } else if (username.toLowerCase().includes('pro') || username.toLowerCase().includes('master')) {
        nameAnalysis += `• Personnalité: 🏆 Tendance compétitive/élitiste\n`;
    } else if (/\d{2,4}$/.test(username)) {
        nameAnalysis += `• Personnalité: 📊 Méthodique/organisé (utilise des numéros)\n`;
    } else {
        nameAnalysis += `• Personnalité: 😐 Profil standard, difficile à analyser\n`;
    }

    if (username === username.toLowerCase()) {
        nameAnalysis += `• Style: 🔽 Minimaliste (tout en minuscules)\n`;
    } else if (username === username.toUpperCase()) {
        nameAnalysis += `• Style: 📢 Expressif/agressif (tout en majuscules)\n`;
    } else {
        nameAnalysis += `• Style: ⚖️ Équilibré (casse mixte)\n`;
    }

    embed1.addFields({
        name: '🧠 ANALYSE COMPORTEMENTALE AVANCÉE',
        value: truncateField(nameAnalysis),
        inline: false
    });

    embeds.push(embed1);

    // EMBED 2: Vie sur Discord et historique complet
    const embed2 = EmbedFactory.base()
        .setColor(targetMember?.displayHexColor || colors.primary)
        .setTitle('📚 HISTORIQUE DE VIE DISCORD COMPLET')
        .setTimestamp();

    // Badges et statut social
    let socialStatus = `**🏅 STATUT SOCIAL ET RECONNAISSANCE:**\n`;
    if (flags.length > 0) {
        const badgeEmojis = {
            'Staff': '👨‍💼 **STAFF DISCORD OFFICIEL** - Employé Discord',
            'Partner': '🤝 **PARTENAIRE DISCORD** - Serveur partenaire officiel',
            'Hypesquad': '🎉 **HYPESQUAD EVENTS** - Organisateur d\'événements',
            'BugHunterLevel1': '🐛 **BUG HUNTER NIVEAU 1** - Chasseur de bugs débutant',
            'BugHunterLevel2': '🐛🏆 **BUG HUNTER NIVEAU 2** - Chasseur de bugs expert',
            'HypesquadOnlineHouse1': '💜 **HYPESQUAD BRAVERY** - Maison du courage',
            'HypesquadOnlineHouse2': '🧡 **HYPESQUAD BRILLIANCE** - Maison de l\'intelligence',
            'HypesquadOnlineHouse3': '💚 **HYPESQUAD BALANCE** - Maison de l\'équilibre',
            'PremiumEarlySupporter': '⭐ **EARLY NITRO SUPPORTER** - Supporter précoce (RARE)',
            'VerifiedDeveloper': '👨‍💻 **DÉVELOPPEUR VÉRIFIÉ** - Créateur de bots vérifiés',
            'CertifiedModerator': '🛡️ **MODÉRATEUR CERTIFIÉ** - Formation modération officielle',
            'VerifiedBot': '✅ **BOT VÉRIFIÉ** - Bot approuvé par Discord',
            'ActiveDeveloper': '🔨 **DÉVELOPPEUR ACTIF** - Développe activement sur Discord'
        };

        flags.forEach(flag => {
            socialStatus += `• ${badgeEmojis[flag] || `🏅 ${flag} (Badge inconnu)`}\n`;
        });
        socialStatus += `\n**🎖️ PRESTIGE TOTAL:** ${flags.length} badge${flags.length > 1 ? 's' : ''} officiel${flags.length > 1 ? 's' : ''}\n\n`;
    } else {
        socialStatus += `• ❌ Aucun badge Discord officiel\n`;
        socialStatus += `• 📊 Statut: Utilisateur standard sans reconnaissance\n\n`;
    }

    // Analyse de l'âge du compte avec implications
    socialStatus += `**⏰ ANALYSE TEMPORELLE APPROFONDIE:**\n`;
    socialStatus += `• Âge exact: ${accountAge} jours (${Math.floor(accountAge / 365)} ans, ${Math.floor((accountAge % 365) / 30)} mois, ${accountAge % 30} jours)\n`;

    let ageCategory = '';
    let trustImplication = '';
    if (accountAge < 7) {
        ageCategory = '🆕 **NOUVEAU-NÉ DISCORD** (< 1 semaine)';
        trustImplication = '🚨 **RISQUE TRÈS ÉLEVÉ** - Compte potentiellement jetable';
    } else if (accountAge < 30) {
        ageCategory = '🟢 **DÉBUTANT** (< 1 mois)';
        trustImplication = '⚠️ **RISQUE MODÉRÉ** - Encore en apprentissage';
    } else if (accountAge < 90) {
        ageCategory = '🟡 **UTILISATEUR RÉCENT** (< 3 mois)';
        trustImplication = '🟡 **RISQUE FAIBLE** - Commence à s\'établir';
    } else if (accountAge < 365) {
        ageCategory = '🟠 **UTILISATEUR ÉTABLI** (< 1 an)';
        trustImplication = '✅ **CONFIANCE MODÉRÉE** - Expérience suffisante';
    } else if (accountAge < 1095) {
        ageCategory = '🔵 **VÉTÉRAN** (1-3 ans)';
        trustImplication = '🛡️ **HAUTE CONFIANCE** - Utilisateur expérimenté';
    } else if (accountAge < 2190) {
        ageCategory = '🟣 **ANCIEN** (3-6 ans)';
        trustImplication = '👑 **TRÈS HAUTE CONFIANCE** - Pilier de la communauté';
    } else {
        ageCategory = '🏆 **LÉGENDE DISCORD** (6+ ans)';
        trustImplication = '🌟 **CONFIANCE ABSOLUE** - Témoin de l\'évolution Discord';
    }

    socialStatus += `• Catégorie: ${ageCategory}\n`;
    socialStatus += `• Implication: ${trustImplication}\n`;
    socialStatus += `• Création: ${new Date(targetUser.createdTimestamp).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;

    // Calcul de la génération Discord
    const discordLaunch = new Date('2015-05-13').getTime();
    const accountCreation = targetUser.createdTimestamp;
    const daysSinceLaunch = Math.floor((accountCreation - discordLaunch) / (1000 * 60 * 60 * 24));

    let generation = '';
    if (daysSinceLaunch < 365) generation = '🏛️ **GÉNÉRATION ALPHA** - Pionniers de Discord';
    else if (daysSinceLaunch < 730) generation = '⚡ **GÉNÉRATION BETA** - Premiers adopteurs';
    else if (daysSinceLaunch < 1460) generation = '🚀 **GÉNÉRATION GAMMA** - Croissance rapide';
    else if (daysSinceLaunch < 2190) generation = '🌟 **GÉNÉRATION DELTA** - Expansion massive';
    else generation = '🆕 **GÉNÉRATION MODERNE** - Ère contemporaine';

    socialStatus += `• Génération Discord: ${generation}\n`;
    socialStatus += `• Jour ${daysSinceLaunch + 1} depuis le lancement de Discord`;

    embed2.addFields({
        name: '👑 STATUT SOCIAL ET TEMPOREL',
        value: truncateField(socialStatus),
        inline: false
    });

    // Informations serveur ultra-détaillées
    if (targetMember) {
        let serverLife = `**🏠 VIE SUR CE SERVEUR:**\n`;
        const serverDays = Math.floor((Date.now() - targetMember.joinedTimestamp) / (1000 * 60 * 60 * 24));
        const joinDate = new Date(targetMember.joinedTimestamp);
        serverLife += `• Arrivée: ${joinDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;
        serverLife += `• Ancienneté: ${serverDays} jours (${Math.floor(serverDays / 365)} ans, ${Math.floor((serverDays % 365) / 30)} mois)\n`;
        serverLife += `• Surnom actuel: ${targetMember.nickname || '❌ Aucun (utilise son nom global)'}\n`;

        // Analyse du délai entre création compte et rejointe serveur
        const daysBetweenCreationAndJoin = Math.floor((targetMember.joinedTimestamp - targetUser.createdTimestamp) / (1000 * 60 * 60 * 24));
        if (daysBetweenCreationAndJoin < 1) {
            serverLife += `• ⚠️ **ALERTE:** Rejoint le serveur le jour de création du compte (suspect)\n`;
        } else if (daysBetweenCreationAndJoin < 7) {
            serverLife += `• 🟡 **ATTENTION:** Rejoint ${daysBetweenCreationAndJoin} jour(s) après création (rapide)\n`;
        } else if (daysBetweenCreationAndJoin < 30) {
            serverLife += `• 🟢 **NORMAL:** Rejoint ${daysBetweenCreationAndJoin} jours après création\n`;
        } else {
            serverLife += `• ✅ **ÉTABLI:** Rejoint ${daysBetweenCreationAndJoin} jours après création (compte mature)\n`;
        }

        // Statut et présence détaillée
        const presence = targetMember.presence;
        serverLife += `\n**📱 PRÉSENCE ET ACTIVITÉ ACTUELLE:**\n`;
        if (presence) {
            let statusDetails = '';
            switch (presence.status) {
                case 'online':
                    statusDetails = '🟢 **EN LIGNE** - Actif et disponible';
                    break;
                case 'idle':
                    statusDetails = '🟡 **ABSENT** - Inactif depuis un moment';
                    break;
                case 'dnd':
                    statusDetails = '🔴 **NE PAS DÉRANGER** - Occupé, ne pas interrompre';
                    break;
                default:
                    statusDetails = '⚫ **HORS LIGNE** - Déconnecté ou invisible';
            }
            serverLife += `• Statut principal: ${statusDetails}\n`;

            // Clients connectés
            if (presence.clientStatus) {
                const clients = Object.entries(presence.clientStatus);
                serverLife += `• Appareils connectés: ${clients.length}\n`;
                clients.forEach(([client, status]) => {
                    const clientEmojis = {
                        'desktop': '🖥️ Ordinateur',
                        'mobile': '📱 Mobile',
                        'web': '🌐 Navigateur'
                    };
                    const statusEmojis = {
                        'online': '🟢',
                        'idle': '🟡',
                        'dnd': '🔴'
                    };
                    serverLife += `  └ ${clientEmojis[client] || client}: ${statusEmojis[status] || status}\n`;
                });
            }

            // Activités détaillées
            if (presence.activities && presence.activities.length > 0) {
                serverLife += `• Activités en cours: ${presence.activities.length}\n`;
                presence.activities.forEach((activity, index) => {
                    serverLife += `  ${index + 1}. **${activity.name}**\n`;
                    if (activity.details) serverLife += `     └ Détails: ${activity.details}\n`;
                    if (activity.state) serverLife += `     └ État: ${activity.state}\n`;
                    if (activity.timestamps?.start) {
                        const elapsed = Math.floor((Date.now() - activity.timestamps.start) / 1000);
                        const hours = Math.floor(elapsed / 3600);
                        const minutes = Math.floor((elapsed % 3600) / 60);
                        serverLife += `     └ Durée: ${hours}h ${minutes}m\n`;
                    }
                });
            } else {
                serverLife += `• ❌ Aucune activité détectée\n`;
            }
        } else {
            serverLife += `• ⚫ **HORS LIGNE** - Aucune information de présence disponible\n`;
        }

        embed2.addFields({
            name: '🏠 VIE SUR LE SERVEUR',
            value: truncateField(serverLife),
            inline: false
        });
    } else {
        embed2.addFields({
            name: '🏠 STATUT SERVEUR',
            value: truncateField('❌ **PAS MEMBRE DE CE SERVEUR**\n• Informations récupérées via l\'API Discord globale\n• Utilisateur externe au serveur actuel\n• Accès limité aux données de présence'),
            inline: false
        });
    }

    embeds.push(embed2);

    // EMBED 3: Analyse visuelle et médias complets
    const embed3 = EmbedFactory.base()
        .setColor(targetMember?.displayHexColor || colors.primary)
        .setTitle('🎨 ANALYSE VISUELLE ET MÉDIAS COMPLETS')
        .setTimestamp();

    // Avatar ultra-détaillé
    let avatarAnalysis = `**🖼️ ANALYSE COMPLÈTE DE L'AVATAR:**\n`;
    if (targetUser.avatar) {
        const avatarId = targetUser.avatar;
        const isAnimated = avatarId.startsWith('a_');
        avatarAnalysis += `• ID Avatar: \`${avatarId}\`\n`;
        avatarAnalysis += `• Type: ${isAnimated ? '🎬 **GIF ANIMÉ** (Nitro requis)' : '🖼️ **IMAGE STATIQUE**'}\n`;
        avatarAnalysis += `• Hash: \`${avatarId.substring(0, 8)}...${avatarId.substring(avatarId.length - 8)}\`\n`;
        avatarAnalysis += `• Format supporté: ${isAnimated ? '.gif, .png, .jpg, .webp' : '.png, .jpg, .webp'}\n`;

        // URLs de toutes les tailles
        avatarAnalysis += `\n**📐 TOUTES LES RÉSOLUTIONS DISPONIBLES:**\n`;
        const sizes = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
        sizes.forEach(size => {
            avatarAnalysis += `• [${size}x${size}px](${targetUser.displayAvatarURL({ size, extension: isAnimated ? 'gif' : 'png' })})\n`;
        });

        // Analyse de l'historique d'avatar (simulation)
        avatarAnalysis += `\n**📚 HISTORIQUE D'AVATAR ESTIMÉ:**\n`;
        avatarAnalysis += `• Avatar actuel depuis: Inconnu (API limitée)\n`;
        avatarAnalysis += `• Changements estimés: ${Math.floor(accountAge / 30)} (basé sur l'âge du compte)\n`;
        avatarAnalysis += `• Fréquence de changement: ${accountAge > 30 ? 'Modérée' : 'Inconnue'}\n`;

        if (isAnimated) {
            avatarAnalysis += `\n**💎 INDICATEURS NITRO:**\n`;
            avatarAnalysis += `• ✅ Avatar animé détecté - Abonnement Nitro confirmé\n`;
            avatarAnalysis += `• 💰 Dépense minimum: 9.99€/mois ou 99.99€/an\n`;
            avatarAnalysis += `• 🎯 Profil: Utilisateur investit financièrement dans Discord\n`;
        }
    } else {
        const defaultAvatarNumber = parseInt(targetUser.discriminator) % 5;
        avatarAnalysis += `• Type: 🎭 **AVATAR PAR DÉFAUT #${defaultAvatarNumber}**\n`;
        avatarAnalysis += `• Signification: Utilisateur n'a jamais personnalisé son avatar\n`;
        avatarAnalysis += `• Implication: Profil basique, peu d'investissement personnel\n`;
        avatarAnalysis += `• URL par défaut: [Voir](${targetUser.defaultAvatarURL})\n`;
        avatarAnalysis += `• Couleur: Basée sur le discriminator (${targetUser.discriminator})\n`;
    }

    // Avatar de serveur si différent
    if (targetMember && targetMember.avatar && targetMember.avatar !== targetUser.avatar) {
        const serverAvatarId = targetMember.avatar;
        const isServerAnimated = serverAvatarId.startsWith('a_');
        avatarAnalysis += `\n**🏠 AVATAR SPÉCIFIQUE AU SERVEUR:**\n`;
        avatarAnalysis += `• ID Serveur: \`${serverAvatarId}\`\n`;
        avatarAnalysis += `• Type: ${isServerAnimated ? '🎬 GIF Animé (Nitro)' : '🖼️ Image Statique'}\n`;
        avatarAnalysis += `• Personnalisation: ✅ Utilisateur s'adapte à ce serveur\n`;
        avatarAnalysis += `• [Voir avatar serveur](${targetMember.displayAvatarURL({ size: 1024, dynamic: true })})\n`;
        if (isServerAnimated && !targetUser.avatar?.startsWith('a_')) {
            avatarAnalysis += `• 🎯 **ANALYSE:** Avatar serveur animé mais global statique (Nitro récent?)\n`;
        }
    }

    embed3.addFields({
        name: '🖼️ PROFIL VISUEL COMPLET',
        value: truncateField(avatarAnalysis),
        inline: false
    });

    embeds.push(embed3);

    // EMBED 4: Analyse de sécurité et évaluation des risques ultra-complète
    const embed4 = EmbedFactory.base()
        .setColor(colors.warning)
        .setTitle('🛡️ ANALYSE DE SÉCURITÉ ET ÉVALUATION DES RISQUES')
        .setTimestamp();

    // Calcul du score de confiance ultra-détaillé
    let securityAnalysis = `**🔍 ÉVALUATION COMPLÈTE DE LA SÉCURITÉ:**\n`;
    let trustScore = 50; // Base neutre
    let riskFactors = [];
    let trustFactors = [];

    // Analyse de l'âge du compte
    if (accountAge < 1) {
        trustScore -= 40;
        riskFactors.push('🚨 CRITIQUE: Compte créé aujourd\'hui (très suspect)');
    } else if (accountAge < 7) {
        trustScore -= 30;
        riskFactors.push('🔴 ÉLEVÉ: Compte très récent (< 1 semaine)');
    } else if (accountAge < 30) {
        trustScore -= 15;
        riskFactors.push('🟠 MODÉRÉ: Compte récent (< 1 mois)');
    } else if (accountAge < 90) {
        trustScore -= 5;
        riskFactors.push('🟡 FAIBLE: Compte assez récent (< 3 mois)');
    } else if (accountAge > 365) {
        trustScore += 20;
        trustFactors.push('✅ Compte ancien (> 1 an) - Très fiable');
    } else if (accountAge > 180) {
        trustScore += 10;
        trustFactors.push('✅ Compte établi (> 6 mois) - Fiable');
    }

    // Analyse des badges Discord
    if (flags.includes('Staff')) {
        trustScore += 50;
        trustFactors.push('🌟 STAFF DISCORD OFFICIEL - Confiance maximale');
    }
    if (flags.includes('Partner')) {
        trustScore += 30;
        trustFactors.push('🤝 PARTENAIRE DISCORD - Très haute confiance');
    }
    if (flags.includes('VerifiedBot')) {
        trustScore += 25;
        trustFactors.push('✅ BOT VÉRIFIÉ - Approuvé par Discord');
    }
    if (flags.includes('VerifiedDeveloper')) {
        trustScore += 20;
        trustFactors.push('👨‍💻 DÉVELOPPEUR VÉRIFIÉ - Créateur reconnu');
    }
    if (flags.includes('CertifiedModerator')) {
        trustScore += 15;
        trustFactors.push('🛡️ MODÉRATEUR CERTIFIÉ - Formation officielle');
    }
    if (flags.includes('PremiumEarlySupporter')) {
        trustScore += 15;
        trustFactors.push('⭐ EARLY SUPPORTER - Soutien précoce (RARE)');
    }
    if (flags.includes('BugHunterLevel1') || flags.includes('BugHunterLevel2')) {
        trustScore += 10;
        trustFactors.push('🐛 BUG HUNTER - Contribue à la sécurité Discord');
    }

    // Calcul final
    trustScore = Math.min(100, Math.max(0, trustScore));

    let trustLevel = '';
    let trustEmoji = '';
    let recommendation = '';
    if (trustScore >= 90) {
        trustLevel = 'CONFIANCE ABSOLUE';
        trustEmoji = '🌟';
        recommendation = 'Aucune restriction recommandée';
    } else if (trustScore >= 80) {
        trustLevel = 'TRÈS HAUTE CONFIANCE';
        trustEmoji = '🟢';
        recommendation = 'Surveillance minimale';
    } else if (trustScore >= 70) {
        trustLevel = 'HAUTE CONFIANCE';
        trustEmoji = '🟢';
        recommendation = 'Surveillance légère';
    } else if (trustScore >= 60) {
        trustLevel = 'CONFIANCE MODÉRÉE';
        trustEmoji = '🟡';
        recommendation = 'Surveillance normale';
    } else if (trustScore >= 40) {
        trustLevel = 'CONFIANCE FAIBLE';
        trustEmoji = '🟠';
        recommendation = 'Surveillance renforcée';
    } else if (trustScore >= 20) {
        trustLevel = 'RISQUE ÉLEVÉ';
        trustEmoji = '🔴';
        recommendation = 'Surveillance étroite requise';
    } else {
        trustLevel = 'RISQUE CRITIQUE';
        trustEmoji = '🚨';
        recommendation = 'Action immédiate recommandée';
    }

    securityAnalysis += `${trustEmoji} **SCORE FINAL:** ${trustScore}/100\n`;
    securityAnalysis += `**NIVEAU:** ${trustLevel}\n`;
    securityAnalysis += `**RECOMMANDATION:** ${recommendation}\n\n`;

    if (trustFactors.length > 0) {
        securityAnalysis += `**✅ FACTEURS DE CONFIANCE:**\n${trustFactors.join('\n')}\n\n`;
    }
    if (riskFactors.length > 0) {
        securityAnalysis += `**⚠️ FACTEURS DE RISQUE:**\n${riskFactors.join('\n')}\n\n`;
    }

    embed4.addFields({
        name: '🛡️ RAPPORT DE SÉCURITÉ COMPLET',
        value: truncateField(securityAnalysis),
        inline: false
    });

    embeds.push(embed4);

    // EMBED 5: Résumé exécutif et recommandations
    const embed5 = EmbedFactory.base()
        .setColor(trustScore >= 70 ? colors.success : trustScore >= 40 ? colors.warning : colors.error)
        .setTitle('📋 RÉSUMÉ EXÉCUTIF ET RECOMMANDATIONS')
        .setTimestamp();

    let executiveSummary = `**👤 PROFIL UTILISATEUR:**\n`;
    executiveSummary += `• Identité: **${targetUser.tag}** ${targetUser.bot ? '(Bot)' : '(Humain)'}\n`;
    executiveSummary += `• Âge du compte: ${accountAge} jours (${Math.floor(accountAge / 365)} ans)\n`;
    executiveSummary += `• Statut Discord: ${flags.length > 0 ? `${flags.length} badge(s) officiel(s)` : 'Utilisateur standard'}\n\n`;

    executiveSummary += `**🎯 ÉVALUATION FINALE:**\n`;
    executiveSummary += `• Score de confiance: ${trustScore}/100 ${trustEmoji}\n`;
    executiveSummary += `• Niveau de risque: ${trustLevel}\n`;
    executiveSummary += `• Recommandation: ${recommendation}\n\n`;

    // Recommandations spécifiques
    executiveSummary += `**📋 ACTIONS RECOMMANDÉES:**\n`;
    if (trustScore >= 80) {
        executiveSummary += `• ✅ Utilisateur de confiance - Aucune action requise\n`;
        executiveSummary += `• 🎯 Peut recevoir des responsabilités supplémentaires\n`;
    } else if (trustScore >= 60) {
        executiveSummary += `• 🟡 Surveillance normale - Pas d'inquiétude majeure\n`;
        executiveSummary += `• 📊 Suivre l'évolution du comportement\n`;
    } else if (trustScore >= 40) {
        executiveSummary += `• 🟠 Surveillance renforcée recommandée\n`;
        executiveSummary += `• ⚠️ Éviter les permissions sensibles\n`;
    } else {
        executiveSummary += `• 🔴 Action immédiate recommandée\n`;
        executiveSummary += `• 🚨 Considérer des restrictions ou une enquête\n`;
    }

    embed5.addFields({
        name: '📊 SYNTHÈSE COMPLÈTE',
        value: truncateField(executiveSummary),
        inline: false
    });

    // Footer avec métadonnées du rapport
    embed5.setFooter({
        text: `Rapport confidentiel généré par ${interaction.user.tag} • ${new Date().toLocaleString('fr-FR')} • ID: ${targetUser.id} • Score: ${trustScore}/100`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    });

    embeds.push(embed5);

    return embeds;
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */