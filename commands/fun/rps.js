/**
 * ====================================
 * COMMANDE: /rps
 * ====================================
 * 
 * Pierre-Papier-Ciseaux contre le bot
 * Jeu interactif avec statistiques
 * 
 * @author Kofu (github.com/kofudev)
 * @category Fun
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('✂️ Jouer à Pierre-Papier-Ciseaux')
        .addUserOption(option =>
            option.setName('adversaire')
                .setDescription('Défier un autre utilisateur (optionnel)')
                .setRequired(false)
        ),
    
    category: 'fun',
    cooldown: 3,
    
    /**
     * Exécution de la commande rps
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const opponent = interaction.options.getUser('adversaire');
        
        if (opponent) {
            // Défi contre un autre utilisateur
            await handlePlayerVsPlayer(interaction, opponent);
        } else {
            // Jeu contre le bot
            await handlePlayerVsBot(interaction);
        }
    }
};

/**
 * Gérer le jeu contre le bot
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @author Kofu
 */
async function handlePlayerVsBot(interaction) {
    // Récupérer les statistiques du joueur
    const userData = interaction.client.database.getUser(interaction.user.id);
    const rpsStats = userData.games?.rps || {
        wins: 0,
        losses: 0,
        draws: 0,
        totalGames: 0,
        winStreak: 0,
        bestStreak: 0
    };
    
    // Créer l'embed de jeu
    const gameEmbed = new EmbedBuilder()
        .setTitle('✂️ Pierre-Papier-Ciseaux')
        .setDescription(
            '**Choisis ton coup !**\n\n' +
            '🪨 **Pierre** bat Ciseaux\n' +
            '📄 **Papier** bat Pierre\n' +
            '✂️ **Ciseaux** bat Papier'
        )
        .setColor('#FF6B6B')
        .addFields(
            { name: '🏆 Victoires', value: `${rpsStats.wins}`, inline: true },
            { name: '💀 Défaites', value: `${rpsStats.losses}`, inline: true },
            { name: '🤝 Égalités', value: `${rpsStats.draws}`, inline: true },
            { name: '📊 Total', value: `${rpsStats.totalGames} parties`, inline: true },
            { name: '🔥 Série actuelle', value: `${rpsStats.winStreak}`, inline: true },
            { name: '⭐ Meilleure série', value: `${rpsStats.bestStreak}`, inline: true }
        )
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    // Créer les boutons
    const gameButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('rps_rock')
                .setLabel('Pierre')
                .setEmoji('🪨')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('rps_paper')
                .setLabel('Papier')
                .setEmoji('📄')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('rps_scissors')
                .setLabel('Ciseaux')
                .setEmoji('✂️')
                .setStyle(ButtonStyle.Primary)
        );
    
    await interaction.reply({
        embeds: [gameEmbed],
        components: [gameButtons]
    });
    
    // Gérer les clics sur les boutons
    const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 30000 // 30 secondes
    });
    
    collector.on('collect', async i => {
        const playerChoice = i.customId.replace('rps_', '');
        const botChoice = getBotChoice();
        const result = determineWinner(playerChoice, botChoice);
        
        // Mettre à jour les statistiques
        updateRpsStats(interaction.client, interaction.user.id, result);
        
        // Créer l'embed de résultat
        const resultEmbed = await createResultEmbed(interaction.user, playerChoice, botChoice, result, interaction.client);
        
        // Désactiver les boutons
        const disabledButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('rps_rock')
                    .setLabel('Pierre')
                    .setEmoji('🪨')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('rps_paper')
                    .setLabel('Papier')
                    .setEmoji('📄')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('rps_scissors')
                    .setLabel('Ciseaux')
                    .setEmoji('✂️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
        
        await i.update({
            embeds: [resultEmbed],
            components: [disabledButtons]
        });
        
        collector.stop();
    });
    
    collector.on('end', (collected) => {
        if (collected.size === 0) {
            // Timeout
            const timeoutEmbed = KofuSignature.createWarningEmbed(
                'Temps écoulé !',
                'Tu as mis trop de temps à choisir. La partie est annulée.'
            );
            
            const disabledButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('rps_rock')
                        .setLabel('Pierre')
                        .setEmoji('🪨')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('rps_paper')
                        .setLabel('Papier')
                        .setEmoji('📄')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('rps_scissors')
                        .setLabel('Ciseaux')
                        .setEmoji('✂️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
            
            interaction.editReply({
                embeds: [timeoutEmbed],
                components: [disabledButtons]
            }).catch(() => {});
        }
    });
}

/**
 * Gérer le jeu entre deux joueurs
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {User} opponent - L'adversaire
 * @author Kofu
 */
async function handlePlayerVsPlayer(interaction, opponent) {
    // Vérifier que l'adversaire n'est pas le même utilisateur
    if (opponent.id === interaction.user.id) {
        const errorEmbed = KofuSignature.createErrorEmbed(
            'Adversaire invalide !',
            'Tu ne peux pas te défier toi-même ! 🤔'
        );
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
    
    // Vérifier que l'adversaire n'est pas un bot
    if (opponent.bot) {
        const errorEmbed = KofuSignature.createErrorEmbed(
            'Adversaire invalide !',
            'Tu ne peux pas défier un bot ! Utilise la commande sans adversaire pour jouer contre moi.'
        );
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
    
    // Créer l'embed de défi
    const challengeEmbed = new EmbedBuilder()
        .setTitle('⚔️ Défi Pierre-Papier-Ciseaux !')
        .setDescription(`**${interaction.user.displayName}** défie **${opponent.displayName}** !`)
        .setColor('#E74C3C')
        .addFields({
            name: '🎮 Comment jouer',
            value: `${opponent.toString()}, clique sur "Accepter" pour accepter le défi !\nVous choisirez ensuite vos coups en privé.`,
            inline: false
        })
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    // Boutons d'acceptation/refus
    const challengeButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('rps_accept')
                .setLabel('Accepter')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('rps_decline')
                .setLabel('Refuser')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger)
        );
    
    await interaction.reply({
        embeds: [challengeEmbed],
        components: [challengeButtons]
    });
    
    // Gérer la réponse au défi
    const challengeCollector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === opponent.id,
        time: 60000 // 1 minute
    });
    
    challengeCollector.on('collect', async i => {
        if (i.customId === 'rps_accept') {
            await startPvPGame(interaction, i, opponent);
        } else if (i.customId === 'rps_decline') {
            const declineEmbed = KofuSignature.createWarningEmbed(
                'Défi refusé !',
                `${opponent.displayName} a refusé le défi.`
            );
            
            await i.update({
                embeds: [declineEmbed],
                components: []
            });
        }
        
        challengeCollector.stop();
    });
    
    challengeCollector.on('end', (collected) => {
        if (collected.size === 0) {
            const timeoutEmbed = KofuSignature.createWarningEmbed(
                'Défi expiré !',
                `${opponent.displayName} n'a pas répondu au défi.`
            );
            
            interaction.editReply({
                embeds: [timeoutEmbed],
                components: []
            }).catch(() => {});
        }
    });
}

/**
 * Démarrer une partie PvP
 * @param {ChatInputCommandInteraction} interaction - L'interaction originale
 * @param {ButtonInteraction} buttonInteraction - L'interaction du bouton
 * @param {User} opponent - L'adversaire
 * @author Kofu
 */
async function startPvPGame(interaction, buttonInteraction, opponent) {
    const gameEmbed = new EmbedBuilder()
        .setTitle('⚔️ Partie en cours !')
        .setDescription(
            `**${interaction.user.displayName}** VS **${opponent.displayName}**\n\n` +
            'Chacun doit choisir son coup en privé.\nVous avez 30 secondes !'
        )
        .setColor('#F39C12')
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    await buttonInteraction.update({
        embeds: [gameEmbed],
        components: []
    });
    
    // Envoyer les choix en privé
    const choices = {};
    
    // Envoyer à chaque joueur
    await sendPrivateChoice(interaction.user, interaction.client, choices, 'player1');
    await sendPrivateChoice(opponent, interaction.client, choices, 'player2');
    
    // Attendre les choix et révéler le résultat
    setTimeout(async () => {
        await revealPvPResult(interaction, interaction.user, opponent, choices);
    }, 35000); // 35 secondes pour laisser le temps
}

/**
 * Envoyer le choix privé à un joueur
 * @param {User} user - Utilisateur
 * @param {Client} client - Client Discord
 * @param {object} choices - Objet des choix
 * @param {string} playerKey - Clé du joueur
 * @author Kofu
 */
async function sendPrivateChoice(user, client, choices, playerKey) {
    try {
        const choiceEmbed = new EmbedBuilder()
            .setTitle('✂️ Ton choix secret')
            .setDescription('Choisis ton coup pour la partie !')
            .setColor('#3498DB')
            .setFooter(KofuSignature.getKofuFooter());
        
        const choiceButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`pvp_rock_${playerKey}`)
                    .setLabel('Pierre')
                    .setEmoji('🪨')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`pvp_paper_${playerKey}`)
                    .setLabel('Papier')
                    .setEmoji('📄')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`pvp_scissors_${playerKey}`)
                    .setLabel('Ciseaux')
                    .setEmoji('✂️')
                    .setStyle(ButtonStyle.Primary)
            );
        
        const dmMessage = await user.send({
            embeds: [choiceEmbed],
            components: [choiceButtons]
        });
        
        // Collecter le choix
        const choiceCollector = dmMessage.createMessageComponentCollector({
            filter: i => i.user.id === user.id,
            time: 30000
        });
        
        choiceCollector.on('collect', async i => {
            const choice = i.customId.split('_')[1]; // rock, paper, scissors
            choices[playerKey] = choice;
            
            const confirmEmbed = new EmbedBuilder()
                .setTitle('✅ Choix enregistré !')
                .setDescription(`Tu as choisi **${getChoiceName(choice)}** !`)
                .setColor('#00FF00')
                .setFooter(KofuSignature.getKofuFooter());
            
            await i.update({
                embeds: [confirmEmbed],
                components: []
            });
            
            choiceCollector.stop();
        });
        
    } catch (error) {
        console.error(`❌ [Kofu] Erreur envoi choix privé à ${user.tag}:`, error);
    }
}

/**
 * Révéler le résultat PvP
 * @param {ChatInputCommandInteraction} interaction - L'interaction originale
 * @param {User} player1 - Joueur 1
 * @param {User} player2 - Joueur 2
 * @param {object} choices - Choix des joueurs
 * @author Kofu
 */
async function revealPvPResult(interaction, player1, player2, choices) {
    const choice1 = choices.player1;
    const choice2 = choices.player2;
    
    if (!choice1 || !choice2) {
        const incompleteEmbed = KofuSignature.createWarningEmbed(
            'Partie annulée !',
            'Un ou plusieurs joueurs n\'ont pas fait leur choix à temps.'
        );
        
        return interaction.editReply({
            embeds: [incompleteEmbed],
            components: []
        });
    }
    
    // Déterminer le gagnant
    const result = determineWinner(choice1, choice2);
    let winner, loser, resultText, resultColor;
    
    if (result === 'win') {
        winner = player1;
        loser = player2;
        resultText = `🏆 **${player1.displayName}** gagne !`;
        resultColor = '#00FF00';
    } else if (result === 'lose') {
        winner = player2;
        loser = player1;
        resultText = `🏆 **${player2.displayName}** gagne !`;
        resultColor = '#00FF00';
    } else {
        resultText = '🤝 **Égalité !**';
        resultColor = '#FFD700';
    }
    
    // Créer l'embed de résultat
    const resultEmbed = new EmbedBuilder()
        .setTitle('⚔️ Résultat de la partie !')
        .setDescription(resultText)
        .setColor(resultColor)
        .addFields(
            { name: `${getChoiceEmoji(choice1)} ${player1.displayName}`, value: getChoiceName(choice1), inline: true },
            { name: '🆚', value: 'VS', inline: true },
            { name: `${getChoiceEmoji(choice2)} ${player2.displayName}`, value: getChoiceName(choice2), inline: true }
        )
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    if (result !== 'draw') {
        resultEmbed.addFields({
            name: '📝 Explication',
            value: getWinExplanation(choice1, choice2, result === 'win'),
            inline: false
        });
    }
    
    await interaction.editReply({
        embeds: [resultEmbed],
        components: []
    });
    
    console.log(`✂️ [Kofu] Partie PvP: ${player1.tag} (${choice1}) vs ${player2.tag} (${choice2}) - Résultat: ${result}`);
}

/**
 * Obtenir le choix du bot
 * @returns {string} Choix du bot
 * @author Kofu
 */
function getBotChoice() {
    const choices = ['rock', 'paper', 'scissors'];
    return choices[Math.floor(Math.random() * choices.length)];
}

/**
 * Déterminer le gagnant
 * @param {string} playerChoice - Choix du joueur
 * @param {string} opponentChoice - Choix de l'adversaire
 * @returns {string} Résultat (win, lose, draw)
 * @author Kofu
 */
function determineWinner(playerChoice, opponentChoice) {
    if (playerChoice === opponentChoice) return 'draw';
    
    const winConditions = {
        rock: 'scissors',
        paper: 'rock',
        scissors: 'paper'
    };
    
    return winConditions[playerChoice] === opponentChoice ? 'win' : 'lose';
}

/**
 * Mettre à jour les statistiques RPS
 * @param {Client} client - Client Discord
 * @param {string} userId - ID de l'utilisateur
 * @param {string} result - Résultat de la partie
 * @author Kofu
 */
function updateRpsStats(client, userId, result) {
    const userData = client.database.getUser(userId);
    
    if (!userData.games) userData.games = {};
    if (!userData.games.rps) {
        userData.games.rps = {
            wins: 0,
            losses: 0,
            draws: 0,
            totalGames: 0,
            winStreak: 0,
            bestStreak: 0
        };
    }
    
    const rpsStats = userData.games.rps;
    rpsStats.totalGames++;
    
    if (result === 'win') {
        rpsStats.wins++;
        rpsStats.winStreak++;
        if (rpsStats.winStreak > rpsStats.bestStreak) {
            rpsStats.bestStreak = rpsStats.winStreak;
        }
    } else if (result === 'lose') {
        rpsStats.losses++;
        rpsStats.winStreak = 0;
    } else {
        rpsStats.draws++;
        // Les égalités ne cassent pas la série
    }
    
    client.database.setUser(userId, userData);
}

/**
 * Créer l'embed de résultat
 * @param {User} user - Utilisateur
 * @param {string} playerChoice - Choix du joueur
 * @param {string} botChoice - Choix du bot
 * @param {string} result - Résultat
 * @param {Client} client - Client Discord
 * @returns {EmbedBuilder} Embed de résultat
 * @author Kofu
 */
async function createResultEmbed(user, playerChoice, botChoice, result, client) {
    const userData = client.database.getUser(user.id);
    const rpsStats = userData.games?.rps || {};
    
    let title, color, description;
    
    if (result === 'win') {
        title = '🏆 Tu as gagné !';
        color = '#00FF00';
        description = 'Félicitations ! Tu as battu le bot !';
    } else if (result === 'lose') {
        title = '💀 Tu as perdu !';
        color = '#FF0000';
        description = 'Dommage ! Le bot t\'a eu cette fois !';
    } else {
        title = '🤝 Égalité !';
        color = '#FFD700';
        description = 'Vous avez choisi la même chose !';
    }
    
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .addFields(
            { name: `${getChoiceEmoji(playerChoice)} Ton choix`, value: getChoiceName(playerChoice), inline: true },
            { name: '🆚', value: 'VS', inline: true },
            { name: `${getChoiceEmoji(botChoice)} Mon choix`, value: getChoiceName(botChoice), inline: true }
        )
        .addFields(
            { name: '🏆 Victoires', value: `${rpsStats.wins || 0}`, inline: true },
            { name: '💀 Défaites', value: `${rpsStats.losses || 0}`, inline: true },
            { name: '🤝 Égalités', value: `${rpsStats.draws || 0}`, inline: true },
            { name: '📊 Total', value: `${rpsStats.totalGames || 0} parties`, inline: true },
            { name: '🔥 Série actuelle', value: `${rpsStats.winStreak || 0}`, inline: true },
            { name: '⭐ Meilleure série', value: `${rpsStats.bestStreak || 0}`, inline: true }
        )
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    if (result !== 'draw') {
        embed.addFields({
            name: '📝 Explication',
            value: getWinExplanation(playerChoice, botChoice, result === 'win'),
            inline: false
        });
    }
    
    return embed;
}

/**
 * Obtenir l'emoji d'un choix
 * @param {string} choice - Choix
 * @returns {string} Emoji
 * @author Kofu
 */
function getChoiceEmoji(choice) {
    const emojis = {
        rock: '🪨',
        paper: '📄',
        scissors: '✂️'
    };
    return emojis[choice] || '❓';
}

/**
 * Obtenir le nom d'un choix
 * @param {string} choice - Choix
 * @returns {string} Nom
 * @author Kofu
 */
function getChoiceName(choice) {
    const names = {
        rock: 'Pierre',
        paper: 'Papier',
        scissors: 'Ciseaux'
    };
    return names[choice] || 'Inconnu';
}

/**
 * Obtenir l'explication de la victoire
 * @param {string} choice1 - Premier choix
 * @param {string} choice2 - Deuxième choix
 * @param {boolean} player1Wins - Si le joueur 1 gagne
 * @returns {string} Explication
 * @author Kofu
 */
function getWinExplanation(choice1, choice2, player1Wins) {
    const explanations = {
        'rock-scissors': 'La Pierre écrase les Ciseaux',
        'paper-rock': 'Le Papier enveloppe la Pierre',
        'scissors-paper': 'Les Ciseaux coupent le Papier'
    };
    
    const winningChoice = player1Wins ? choice1 : choice2;
    const losingChoice = player1Wins ? choice2 : choice1;
    const key = `${winningChoice}-${losingChoice}`;
    
    return explanations[key] || 'Logique du jeu';
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */