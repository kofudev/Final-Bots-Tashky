/**
 * ====================================
 * COMMANDE: /poll
 * ====================================
 * 
 * Créer des sondages interactifs
 * Système de vote avec résultats en temps réel
 * 
 * @author Kofu (github.com/kofudev)
 * @category Utility
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('📊 Créer un sondage')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Question du sondage')
                .setRequired(true)
                .setMaxLength(200)
        )
        .addStringOption(option =>
            option.setName('option1')
                .setDescription('Première option')
                .setRequired(true)
                .setMaxLength(80)
        )
        .addStringOption(option =>
            option.setName('option2')
                .setDescription('Deuxième option')
                .setRequired(true)
                .setMaxLength(80)
        )
        .addStringOption(option =>
            option.setName('option3')
                .setDescription('Troisième option (optionnel)')
                .setRequired(false)
                .setMaxLength(80)
        )
        .addStringOption(option =>
            option.setName('option4')
                .setDescription('Quatrième option (optionnel)')
                .setRequired(false)
                .setMaxLength(80)
        )
        .addStringOption(option =>
            option.setName('option5')
                .setDescription('Cinquième option (optionnel)')
                .setRequired(false)
                .setMaxLength(80)
        )
        .addIntegerOption(option =>
            option.setName('duree')
                .setDescription('Durée du sondage en minutes (1-1440)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(1440)
        )
        .addBooleanOption(option =>
            option.setName('anonyme')
                .setDescription('Sondage anonyme (ne montre pas qui a voté)')
                .setRequired(false)
        ),
    
    category: 'utility',
    cooldown: 30,
    
    /**
     * Exécution de la commande poll
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const question = interaction.options.getString('question');
        const duration = interaction.options.getInteger('duree') || 60; // 1 heure par défaut
        const anonymous = interaction.options.getBoolean('anonyme') || false;
        
        // Récupérer toutes les options
        const options = [];
        for (let i = 1; i <= 5; i++) {
            const option = interaction.options.getString(`option${i}`);
            if (option) options.push(option);
        }
        
        if (options.length < 2) {
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Options insuffisantes !',
                'Un sondage doit avoir au moins 2 options.'
            );
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        // Créer l'ID unique du sondage
        const pollId = `poll_${Date.now()}_${interaction.user.id}`;
        
        // Initialiser les données du sondage
        const pollData = {
            id: pollId,
            question: question,
            options: options,
            votes: {},
            voters: new Set(),
            createdBy: interaction.user.id,
            createdAt: new Date(),
            endsAt: new Date(Date.now() + duration * 60 * 1000),
            anonymous: anonymous,
            active: true
        };
        
        // Sauvegarder le sondage
        savePoll(interaction.client, pollId, pollData);
        
        // Créer l'embed du sondage
        const pollEmbed = createPollEmbed(pollData, interaction.user);
        const pollButtons = createPollButtons(options, pollId);
        
        await interaction.reply({
            embeds: [pollEmbed],
            components: pollButtons
        });
        
        // Programmer la fin du sondage
        setTimeout(() => {
            endPoll(interaction.client, interaction, pollId);
        }, duration * 60 * 1000);
        
        console.log(`📊 [Kofu] ${interaction.user.tag} a créé un sondage: "${question}" (${duration}min)`);
    }
};

/**
 * Créer l'embed du sondage
 * @param {object} pollData - Données du sondage
 * @param {User} creator - Créateur du sondage
 * @returns {EmbedBuilder} Embed du sondage
 * @author Kofu
 */
function createPollEmbed(pollData, creator) {
    const embed = new EmbedBuilder()
        .setTitle('📊 Sondage')
        .setDescription(`**${pollData.question}**`)
        .setColor('#3498DB')
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    // Calculer les votes
    const totalVotes = Object.values(pollData.votes).reduce((sum, count) => sum + count, 0);
    
    // Ajouter les options avec les résultats
    let optionsText = '';
    pollData.options.forEach((option, index) => {
        const votes = pollData.votes[index] || 0;
        const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
        const bar = createProgressBar(percentage);
        
        optionsText += `**${index + 1}.** ${option}\n`;
        optionsText += `${bar} **${votes}** vote(s) (${percentage}%)\n\n`;
    });
    
    embed.addFields({
        name: '📋 Options',
        value: optionsText || 'Aucun vote pour le moment',
        inline: false
    });
    
    // Informations du sondage
    embed.addFields(
        { name: '👤 Créé par', value: creator.toString(), inline: true },
        { name: '🗳️ Total votes', value: `${totalVotes}`, inline: true },
        { name: '👥 Votants', value: `${pollData.voters.size}`, inline: true },
        { name: '⏰ Se termine', value: `<t:${Math.floor(pollData.endsAt.getTime() / 1000)}:R>`, inline: true },
        { name: '🔒 Type', value: pollData.anonymous ? 'Anonyme' : 'Public', inline: true },
        { name: '📅 Créé', value: `<t:${Math.floor(pollData.createdAt.getTime() / 1000)}:R>`, inline: true }
    );
    
    return embed;
}

/**
 * Créer les boutons du sondage
 * @param {Array} options - Options du sondage
 * @param {string} pollId - ID du sondage
 * @returns {Array<ActionRowBuilder>} Boutons du sondage
 * @author Kofu
 */
function createPollButtons(options, pollId) {
    const rows = [];
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
    
    // Créer les boutons de vote (max 5 par ligne)
    let currentRow = new ActionRowBuilder();
    
    options.forEach((option, index) => {
        if (index > 0 && index % 5 === 0) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
        
        currentRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`${pollId}_vote_${index}`)
                .setLabel(`${index + 1}. ${option.substring(0, 20)}${option.length > 20 ? '...' : ''}`)
                .setEmoji(emojis[index])
                .setStyle(ButtonStyle.Primary)
        );
    });
    
    if (currentRow.components.length > 0) {
        rows.push(currentRow);
    }
    
    // Ajouter les boutons de contrôle
    const controlRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`${pollId}_results`)
                .setLabel('Résultats')
                .setEmoji('📊')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`${pollId}_end`)
                .setLabel('Terminer')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger)
        );
    
    rows.push(controlRow);
    
    return rows;
}

/**
 * Créer une barre de progression
 * @param {number} percentage - Pourcentage
 * @returns {string} Barre de progression
 * @author Kofu
 */
function createProgressBar(percentage) {
    const filledBars = Math.floor(percentage / 10);
    const emptyBars = 10 - filledBars;
    
    return '█'.repeat(filledBars) + '░'.repeat(emptyBars);
}

/**
 * Sauvegarder un sondage
 * @param {Client} client - Client Discord
 * @param {string} pollId - ID du sondage
 * @param {object} pollData - Données du sondage
 * @author Kofu
 */
function savePoll(client, pollId, pollData) {
    try {
        const pollsData = client.database.read('polls.json') || { polls: {}, lastUpdated: new Date() };
        
        // Convertir le Set en Array pour la sérialisation
        const serializedPollData = {
            ...pollData,
            voters: Array.from(pollData.voters)
        };
        
        pollsData.polls[pollId] = serializedPollData;
        pollsData.lastUpdated = new Date();
        
        client.database.write('polls.json', pollsData);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur sauvegarde sondage:', error);
    }
}

/**
 * Récupérer un sondage
 * @param {Client} client - Client Discord
 * @param {string} pollId - ID du sondage
 * @returns {object|null} Données du sondage
 * @author Kofu
 */
function getPoll(client, pollId) {
    try {
        const pollsData = client.database.read('polls.json') || { polls: {} };
        const pollData = pollsData.polls[pollId];
        
        if (pollData) {
            // Reconvertir l'Array en Set
            pollData.voters = new Set(pollData.voters);
            pollData.createdAt = new Date(pollData.createdAt);
            pollData.endsAt = new Date(pollData.endsAt);
        }
        
        return pollData || null;
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur récupération sondage:', error);
        return null;
    }
}

/**
 * Terminer un sondage
 * @param {Client} client - Client Discord
 * @param {ChatInputCommandInteraction} interaction - Interaction originale
 * @param {string} pollId - ID du sondage
 * @author Kofu
 */
async function endPoll(client, interaction, pollId) {
    try {
        const pollData = getPoll(client, pollId);
        if (!pollData || !pollData.active) return;
        
        // Marquer comme terminé
        pollData.active = false;
        savePoll(client, pollId, pollData);
        
        // Créer l'embed de résultats finaux
        const finalEmbed = createFinalResultsEmbed(pollData);
        
        // Désactiver tous les boutons
        const disabledButtons = createDisabledButtons(pollData.options, pollId);
        
        await interaction.editReply({
            embeds: [finalEmbed],
            components: disabledButtons
        });
        
        console.log(`📊 [Kofu] Sondage terminé: ${pollId}`);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur fin de sondage:', error);
    }
}

/**
 * Créer l'embed des résultats finaux
 * @param {object} pollData - Données du sondage
 * @returns {EmbedBuilder} Embed des résultats
 * @author Kofu
 */
function createFinalResultsEmbed(pollData) {
    const embed = new EmbedBuilder()
        .setTitle('📊 Sondage Terminé')
        .setDescription(`**${pollData.question}**`)
        .setColor('#E74C3C')
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    // Calculer les votes et trouver le gagnant
    const totalVotes = Object.values(pollData.votes).reduce((sum, count) => sum + count, 0);
    let winnerIndex = -1;
    let maxVotes = -1;
    
    Object.entries(pollData.votes).forEach(([index, votes]) => {
        if (votes > maxVotes) {
            maxVotes = votes;
            winnerIndex = parseInt(index);
        }
    });
    
    // Résultats détaillés
    let resultsText = '';
    pollData.options.forEach((option, index) => {
        const votes = pollData.votes[index] || 0;
        const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
        const bar = createProgressBar(percentage);
        const isWinner = index === winnerIndex && totalVotes > 0;
        
        resultsText += `${isWinner ? '🏆' : '📊'} **${index + 1}.** ${option}\n`;
        resultsText += `${bar} **${votes}** vote(s) (${percentage}%)${isWinner ? ' **GAGNANT**' : ''}\n\n`;
    });
    
    embed.addFields({
        name: '🏁 Résultats Finaux',
        value: resultsText || 'Aucun vote',
        inline: false
    });
    
    // Statistiques finales
    embed.addFields(
        { name: '🗳️ Total votes', value: `${totalVotes}`, inline: true },
        { name: '👥 Participants', value: `${pollData.voters.size}`, inline: true },
        { name: '⏱️ Durée', value: `${Math.round((Date.now() - pollData.createdAt.getTime()) / 60000)} min`, inline: true }
    );
    
    if (totalVotes > 0 && winnerIndex >= 0) {
        embed.addFields({
            name: '🏆 Option gagnante',
            value: `**${pollData.options[winnerIndex]}** avec ${maxVotes} vote(s) (${Math.round((maxVotes / totalVotes) * 100)}%)`,
            inline: false
        });
    }
    
    return embed;
}

/**
 * Créer les boutons désactivés
 * @param {Array} options - Options du sondage
 * @param {string} pollId - ID du sondage
 * @returns {Array<ActionRowBuilder>} Boutons désactivés
 * @author Kofu
 */
function createDisabledButtons(options, pollId) {
    const rows = [];
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
    
    let currentRow = new ActionRowBuilder();
    
    options.forEach((option, index) => {
        if (index > 0 && index % 5 === 0) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
        
        currentRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`${pollId}_vote_${index}_disabled`)
                .setLabel(`${index + 1}. ${option.substring(0, 20)}${option.length > 20 ? '...' : ''}`)
                .setEmoji(emojis[index])
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );
    });
    
    if (currentRow.components.length > 0) {
        rows.push(currentRow);
    }
    
    return rows;
}

// Gestionnaire d'événements pour les interactions de sondage
// (À ajouter dans interactionCreate.js)

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */