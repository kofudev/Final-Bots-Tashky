/**
 * ====================================
 * COMMANDE: /trivia
 * ====================================
 * 
 * Quiz de culture générale
 * Questions par catégories avec scores
 * 
 * @author Kofu (github.com/kofudev)
 * @category Fun
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('🧠 Quiz de culture générale')
        .addStringOption(option =>
            option.setName('categorie')
                .setDescription('Catégorie de questions')
                .setRequired(false)
                .addChoices(
                    { name: '🎮 Gaming', value: 'gaming' },
                    { name: '🎬 Cinéma', value: 'movies' },
                    { name: '🎵 Musique', value: 'music' },
                    { name: '🌍 Géographie', value: 'geography' },
                    { name: '🔬 Sciences', value: 'science' },
                    { name: '📚 Histoire', value: 'history' },
                    { name: '🏃 Sport', value: 'sports' },
                    { name: '🎭 Général', value: 'general' }
                )
        )
        .addStringOption(option =>
            option.setName('difficulte')
                .setDescription('Niveau de difficulté')
                .setRequired(false)
                .addChoices(
                    { name: '🟢 Facile', value: 'easy' },
                    { name: '🟡 Moyen', value: 'medium' },
                    { name: '🔴 Difficile', value: 'hard' }
                )
        ),
    
    category: 'fun',
    cooldown: 10,
    
    /**
     * Exécution de la commande trivia
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const category = interaction.options.getString('categorie') || 'random';
        const difficulty = interaction.options.getString('difficulte') || 'medium';
        
        // Récupérer les statistiques du joueur
        const userData = interaction.client.database.getUser(interaction.user.id);
        const triviaStats = userData.games?.trivia || {
            totalQuestions: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            streak: 0,
            bestStreak: 0,
            categories: {}
        };
        
        // Sélectionner une question
        const question = getRandomQuestion(category, difficulty);
        
        // Créer l'embed de question
        const questionEmbed = new EmbedBuilder()
            .setTitle('🧠 Quiz TASHKY')
            .setDescription(`**${question.question}**`)
            .setColor('#3498DB')
            .addFields(
                { name: '📂 Catégorie', value: getCategoryName(question.category), inline: true },
                { name: '⚡ Difficulté', value: getDifficultyName(question.difficulty), inline: true },
                { name: '⏱️ Temps', value: '30 secondes', inline: true }
            )
            .addFields(
                { name: '📊 Tes statistiques', value: `✅ ${triviaStats.correctAnswers} | ❌ ${triviaStats.wrongAnswers} | 🔥 ${triviaStats.streak}`, inline: false }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Créer les boutons de réponse
        const answerButtons = new ActionRowBuilder();
        const answers = [...question.incorrectAnswers, question.correctAnswer];
        shuffleArray(answers);
        
        answers.forEach((answer, index) => {
            answerButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId(`trivia_${index}`)
                    .setLabel(answer)
                    .setStyle(ButtonStyle.Primary)
            );
        });
        
        await interaction.reply({
            embeds: [questionEmbed],
            components: [answerButtons]
        });
        
        // Gérer les réponses
        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 30000 // 30 secondes
        });
        
        collector.on('collect', async i => {
            const selectedAnswer = answers[parseInt(i.customId.split('_')[1])];
            const isCorrect = selectedAnswer === question.correctAnswer;
            
            // Mettre à jour les statistiques
            updateTriviaStats(interaction.client, interaction.user.id, question.category, isCorrect);
            
            // Créer l'embed de résultat
            const resultEmbed = await createResultEmbed(interaction.user, question, selectedAnswer, isCorrect, interaction.client);
            
            // Désactiver les boutons et colorer la bonne réponse
            const resultButtons = new ActionRowBuilder();
            answers.forEach((answer, index) => {
                let style = ButtonStyle.Secondary;
                let emoji = '';
                
                if (answer === question.correctAnswer) {
                    style = ButtonStyle.Success;
                    emoji = '✅';
                } else if (answer === selectedAnswer && !isCorrect) {
                    style = ButtonStyle.Danger;
                    emoji = '❌';
                }
                
                resultButtons.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`trivia_result_${index}`)
                        .setLabel(answer)
                        .setEmoji(emoji)
                        .setStyle(style)
                        .setDisabled(true)
                );
            });
            
            await i.update({
                embeds: [resultEmbed],
                components: [resultButtons]
            });
            
            collector.stop();
        });
        
        collector.on('end', (collected) => {
            if (collected.size === 0) {
                // Timeout
                const timeoutEmbed = KofuSignature.createWarningEmbed(
                    'Temps écoulé !',
                    `Tu n'as pas répondu à temps !\n\n**Bonne réponse:** ${question.correctAnswer}`
                );
                
                // Mettre à jour les stats (mauvaise réponse)
                updateTriviaStats(interaction.client, interaction.user.id, question.category, false);
                
                const disabledButtons = new ActionRowBuilder();
                const answers = [...question.incorrectAnswers, question.correctAnswer];
                shuffleArray(answers);
                
                answers.forEach((answer, index) => {
                    disabledButtons.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`trivia_timeout_${index}`)
                            .setLabel(answer)
                            .setStyle(answer === question.correctAnswer ? ButtonStyle.Success : ButtonStyle.Secondary)
                            .setEmoji(answer === question.correctAnswer ? '✅' : '')
                            .setDisabled(true)
                    );
                });
                
                interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: [disabledButtons]
                }).catch(() => {});
            }
        });
        
        console.log(`🧠 [Kofu] ${interaction.user.tag} a commencé un trivia (${question.category}/${question.difficulty})`);
    }
};

/**
 * Obtenir une question aléatoire
 * @param {string} category - Catégorie
 * @param {string} difficulty - Difficulté
 * @returns {object} Question sélectionnée
 * @author Kofu
 */
function getRandomQuestion(category, difficulty) {
    const questions = {
        gaming: {
            easy: [
                {
                    question: "Quel est le personnage principal de la série Super Mario ?",
                    correctAnswer: "Mario",
                    incorrectAnswers: ["Luigi", "Bowser", "Peach"]
                },
                {
                    question: "Dans quel jeu trouve-t-on des Pokémon ?",
                    correctAnswer: "Pokémon",
                    incorrectAnswers: ["Digimon", "Yu-Gi-Oh", "Dragon Ball"]
                }
            ],
            medium: [
                {
                    question: "Quelle entreprise a créé la console PlayStation ?",
                    correctAnswer: "Sony",
                    incorrectAnswers: ["Microsoft", "Nintendo", "Sega"]
                },
                {
                    question: "Dans Minecraft, avec quoi peut-on faire du pain ?",
                    correctAnswer: "Blé",
                    incorrectAnswers: ["Avoine", "Orge", "Riz"]
                }
            ],
            hard: [
                {
                    question: "Quel est le nom du créateur de Minecraft ?",
                    correctAnswer: "Notch",
                    incorrectAnswers: ["Jeb", "Dinnerbone", "Grum"]
                }
            ]
        },
        movies: {
            easy: [
                {
                    question: "Qui a réalisé le film Titanic ?",
                    correctAnswer: "James Cameron",
                    incorrectAnswers: ["Steven Spielberg", "Christopher Nolan", "Martin Scorsese"]
                }
            ],
            medium: [
                {
                    question: "Dans quel film trouve-t-on la phrase 'Que la Force soit avec toi' ?",
                    correctAnswer: "Star Wars",
                    incorrectAnswers: ["Star Trek", "Blade Runner", "Matrix"]
                }
            ],
            hard: [
                {
                    question: "Quel film a remporté l'Oscar du meilleur film en 2020 ?",
                    correctAnswer: "Parasite",
                    incorrectAnswers: ["1917", "Joker", "Once Upon a Time in Hollywood"]
                }
            ]
        },
        science: {
            easy: [
                {
                    question: "Combien de planètes y a-t-il dans notre système solaire ?",
                    correctAnswer: "8",
                    incorrectAnswers: ["7", "9", "10"]
                }
            ],
            medium: [
                {
                    question: "Quel est le symbole chimique de l'or ?",
                    correctAnswer: "Au",
                    incorrectAnswers: ["Ag", "Fe", "Cu"]
                }
            ],
            hard: [
                {
                    question: "Quelle est la vitesse de la lumière dans le vide ?",
                    correctAnswer: "299 792 458 m/s",
                    incorrectAnswers: ["300 000 000 m/s", "299 000 000 m/s", "298 792 458 m/s"]
                }
            ]
        },
        general: {
            easy: [
                {
                    question: "Quelle est la capitale de la France ?",
                    correctAnswer: "Paris",
                    incorrectAnswers: ["Lyon", "Marseille", "Toulouse"]
                }
            ],
            medium: [
                {
                    question: "Combien de continents y a-t-il sur Terre ?",
                    correctAnswer: "7",
                    incorrectAnswers: ["5", "6", "8"]
                }
            ],
            hard: [
                {
                    question: "Quel est le plus petit pays du monde ?",
                    correctAnswer: "Vatican",
                    incorrectAnswers: ["Monaco", "Nauru", "Saint-Marin"]
                }
            ]
        }
    };
    
    // Sélectionner une catégorie
    let selectedCategory = category;
    if (category === 'random') {
        const categories = Object.keys(questions);
        selectedCategory = categories[Math.floor(Math.random() * categories.length)];
    }
    
    // Sélectionner une question
    const categoryQuestions = questions[selectedCategory] || questions.general;
    const difficultyQuestions = categoryQuestions[difficulty] || categoryQuestions.medium;
    const question = difficultyQuestions[Math.floor(Math.random() * difficultyQuestions.length)];
    
    return {
        ...question,
        category: selectedCategory,
        difficulty: difficulty
    };
}

/**
 * Mélanger un tableau
 * @param {Array} array - Tableau à mélanger
 * @author Kofu
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Mettre à jour les statistiques de trivia
 * @param {Client} client - Client Discord
 * @param {string} userId - ID de l'utilisateur
 * @param {string} category - Catégorie de la question
 * @param {boolean} isCorrect - Si la réponse est correcte
 * @author Kofu
 */
function updateTriviaStats(client, userId, category, isCorrect) {
    const userData = client.database.getUser(userId);
    
    if (!userData.games) userData.games = {};
    if (!userData.games.trivia) {
        userData.games.trivia = {
            totalQuestions: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            streak: 0,
            bestStreak: 0,
            categories: {}
        };
    }
    
    const triviaStats = userData.games.trivia;
    triviaStats.totalQuestions++;
    
    if (!triviaStats.categories[category]) {
        triviaStats.categories[category] = {
            correct: 0,
            wrong: 0,
            total: 0
        };
    }
    
    triviaStats.categories[category].total++;
    
    if (isCorrect) {
        triviaStats.correctAnswers++;
        triviaStats.categories[category].correct++;
        triviaStats.streak++;
        
        if (triviaStats.streak > triviaStats.bestStreak) {
            triviaStats.bestStreak = triviaStats.streak;
        }
    } else {
        triviaStats.wrongAnswers++;
        triviaStats.categories[category].wrong++;
        triviaStats.streak = 0;
    }
    
    client.database.setUser(userId, userData);
}

/**
 * Créer l'embed de résultat
 * @param {User} user - Utilisateur
 * @param {object} question - Question
 * @param {string} selectedAnswer - Réponse sélectionnée
 * @param {boolean} isCorrect - Si la réponse est correcte
 * @param {Client} client - Client Discord
 * @returns {EmbedBuilder} Embed de résultat
 * @author Kofu
 */
async function createResultEmbed(user, question, selectedAnswer, isCorrect, client) {
    const userData = client.database.getUser(user.id);
    const triviaStats = userData.games?.trivia || {};
    
    let title, color, description;
    
    if (isCorrect) {
        title = '✅ Bonne réponse !';
        color = '#00FF00';
        description = 'Félicitations ! Tu as trouvé la bonne réponse !';
    } else {
        title = '❌ Mauvaise réponse !';
        color = '#FF0000';
        description = `Dommage ! La bonne réponse était **${question.correctAnswer}**.`;
    }
    
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .addFields(
            { name: '❓ Question', value: question.question, inline: false },
            { name: '💭 Ta réponse', value: selectedAnswer, inline: true },
            { name: '✅ Bonne réponse', value: question.correctAnswer, inline: true },
            { name: '📂 Catégorie', value: getCategoryName(question.category), inline: true }
        )
        .addFields(
            { name: '📊 Tes statistiques', value: 
                `✅ **Bonnes:** ${triviaStats.correctAnswers || 0}\n` +
                `❌ **Mauvaises:** ${triviaStats.wrongAnswers || 0}\n` +
                `📈 **Précision:** ${triviaStats.totalQuestions > 0 ? Math.round((triviaStats.correctAnswers / triviaStats.totalQuestions) * 100) : 0}%\n` +
                `🔥 **Série:** ${triviaStats.streak || 0}\n` +
                `⭐ **Meilleure série:** ${triviaStats.bestStreak || 0}`,
                inline: true
            }
        )
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    return embed;
}

/**
 * Obtenir le nom d'une catégorie
 * @param {string} category - Catégorie
 * @returns {string} Nom de la catégorie
 * @author Kofu
 */
function getCategoryName(category) {
    const names = {
        gaming: '🎮 Gaming',
        movies: '🎬 Cinéma',
        music: '🎵 Musique',
        geography: '🌍 Géographie',
        science: '🔬 Sciences',
        history: '📚 Histoire',
        sports: '🏃 Sport',
        general: '🎭 Général'
    };
    
    return names[category] || '🎭 Général';
}

/**
 * Obtenir le nom d'une difficulté
 * @param {string} difficulty - Difficulté
 * @returns {string} Nom de la difficulté
 * @author Kofu
 */
function getDifficultyName(difficulty) {
    const names = {
        easy: '🟢 Facile',
        medium: '🟡 Moyen',
        hard: '🔴 Difficile'
    };
    
    return names[difficulty] || '🟡 Moyen';
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */