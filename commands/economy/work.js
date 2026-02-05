/**
 * ====================================
 * COMMANDE: /work
 * ====================================
 * 
 * Travailler pour gagner de l'argent
 * Système de métiers avec progression
 * 
 * @author Kofu (github.com/kofudev)
 * @category Economy
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('💼 Travailler pour gagner des Kofu Coins'),
    
    category: 'economy',
    cooldown: 3600, // 1 heure
    
    /**
     * Exécution de la commande work
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const userData = interaction.client.database.getUser(interaction.user.id);
        
        // Initialiser les données économiques si nécessaire
        if (!userData.economy) {
            userData.economy = {
                coins: 0,
                bank: 0,
                totalEarned: 0,
                totalSpent: 0,
                dailyStreak: 0,
                lastDaily: null,
                lastWork: null,
                job: null,
                jobLevel: 1,
                jobXp: 0,
                level: 1,
                xp: 0
            };
        }
        
        const economyData = userData.economy;
        const lastWork = economyData.lastWork ? new Date(economyData.lastWork) : null;
        const now = new Date();
        
        // Vérifier le cooldown
        if (lastWork && (now.getTime() - lastWork.getTime()) < 3600000) { // 1 heure
            const nextWork = new Date(lastWork.getTime() + 3600000);
            
            const errorEmbed = KofuSignature.createWarningEmbed(
                'Tu as déjà travaillé !',
                `Tu dois attendre avant de pouvoir retravailler.\n\n` +
                `🕐 **Prochain travail:** <t:${Math.floor(nextWork.getTime() / 1000)}:R>`
            );
            
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        // Déterminer le métier si pas encore défini
        if (!economyData.job) {
            economyData.job = getRandomJob();
            economyData.jobLevel = 1;
            economyData.jobXp = 0;
        }
        
        // Animation de travail
        const workingEmbed = new EmbedBuilder()
            .setTitle('💼 Au travail...')
            .setDescription(`Tu travailles en tant que **${economyData.job}**...`)
            .setColor('#FFD700')
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await interaction.reply({ embeds: [workingEmbed] });
        
        // Attendre pour l'effet
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Calculer les gains
        const jobInfo = getJobInfo(economyData.job);
        const baseEarnings = Math.floor(Math.random() * (jobInfo.maxEarnings - jobInfo.minEarnings + 1)) + jobInfo.minEarnings;
        const levelBonus = Math.floor(baseEarnings * (economyData.jobLevel * 0.1));
        const randomEvent = getRandomWorkEvent();
        const eventMultiplier = randomEvent.multiplier;
        
        const totalEarnings = Math.floor((baseEarnings + levelBonus) * eventMultiplier);
        
        // Gain d'XP métier
        const jobXpGain = Math.floor(Math.random() * 20) + 10;
        economyData.jobXp += jobXpGain;
        
        // Vérifier level up métier
        const jobLevelUpInfo = checkJobLevelUp(economyData);
        
        // Mettre à jour les données
        economyData.coins += totalEarnings;
        economyData.totalEarned += totalEarnings;
        economyData.lastWork = now;
        economyData.xp += 5; // XP général
        
        // Vérifier level up général
        const levelUpInfo = checkLevelUp(economyData);
        
        // Sauvegarder
        interaction.client.database.setUser(interaction.user.id, userData);
        
        // Créer l'embed de résultat
        const resultEmbed = new EmbedBuilder()
            .setTitle('💼 Travail terminé !')
            .setDescription(`**${randomEvent.description}**`)
            .setColor(randomEvent.color)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '💼 Métier', value: `${economyData.job} (Niveau ${economyData.jobLevel})`, inline: true },
                { name: '💰 Gains de base', value: `${baseEarnings} Kofu Coins`, inline: true },
                { name: '⭐ Bonus niveau', value: `${levelBonus} Kofu Coins`, inline: true },
                { name: '🎲 Événement', value: `${randomEvent.name} (x${eventMultiplier})`, inline: true },
                { name: '💎 Total gagné', value: `**${totalEarnings} Kofu Coins**`, inline: true },
                { name: '💵 Nouveau solde', value: `${economyData.coins.toLocaleString('fr-FR')} Kofu Coins`, inline: true }
            )
            .addFields({
                name: '📈 Progression métier',
                value: `+${jobXpGain} XP | ${economyData.jobXp}/${getJobXpForNextLevel(economyData.jobLevel)} XP`,
                inline: false
            })
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Ajouter level up métier si applicable
        if (jobLevelUpInfo.leveledUp) {
            resultEmbed.addFields({
                name: '🆙 Promotion !',
                value: `Félicitations ! Tu es maintenant **${economyData.job} Niveau ${jobLevelUpInfo.newLevel}** !\n+${jobLevelUpInfo.bonus} Kofu Coins de bonus !`,
                inline: false
            });
        }
        
        // Ajouter level up général si applicable
        if (levelUpInfo.leveledUp) {
            resultEmbed.addFields({
                name: '🌟 Level Up !',
                value: `Tu es maintenant **niveau ${levelUpInfo.newLevel}** !\n+${levelUpInfo.reward} Kofu Coins de bonus !`,
                inline: false
            });
        }
        
        await interaction.editReply({ embeds: [resultEmbed] });
        
        console.log(`💼 [Kofu] ${interaction.user.tag} a travaillé comme ${economyData.job}: +${totalEarnings} coins`);
        
        // Mettre à jour les statistiques globales
        updateGlobalStats(interaction.client, 'workRewards', totalEarnings);
    }
};

/**
 * Obtenir un métier aléatoire
 * @returns {string} Métier aléatoire
 * @author Kofu
 */
function getRandomJob() {
    const jobs = [
        'Développeur', 'Designer', 'Streamer', 'YouTuber', 'Gamer Pro',
        'Modérateur Discord', 'Community Manager', 'Influenceur',
        'Testeur de Jeux', 'Créateur de Contenu', 'Animateur',
        'Consultant IT', 'Chef de Projet', 'Data Analyst'
    ];
    
    return jobs[Math.floor(Math.random() * jobs.length)];
}

/**
 * Obtenir les informations d'un métier
 * @param {string} job - Nom du métier
 * @returns {object} Informations du métier
 * @author Kofu
 */
function getJobInfo(job) {
    const jobsInfo = {
        'Développeur': { minEarnings: 80, maxEarnings: 150, description: 'Code des applications' },
        'Designer': { minEarnings: 70, maxEarnings: 130, description: 'Crée des designs' },
        'Streamer': { minEarnings: 50, maxEarnings: 200, description: 'Stream sur Twitch' },
        'YouTuber': { minEarnings: 60, maxEarnings: 180, description: 'Crée des vidéos' },
        'Gamer Pro': { minEarnings: 90, maxEarnings: 160, description: 'Joue en compétition' },
        'Modérateur Discord': { minEarnings: 40, maxEarnings: 100, description: 'Modère des serveurs' },
        'Community Manager': { minEarnings: 75, maxEarnings: 140, description: 'Gère des communautés' },
        'Influenceur': { minEarnings: 85, maxEarnings: 170, description: 'Influence sur les réseaux' },
        'Testeur de Jeux': { minEarnings: 65, maxEarnings: 120, description: 'Test des jeux vidéo' },
        'Créateur de Contenu': { minEarnings: 70, maxEarnings: 150, description: 'Crée du contenu' },
        'Animateur': { minEarnings: 55, maxEarnings: 110, description: 'Anime des événements' },
        'Consultant IT': { minEarnings: 100, maxEarnings: 180, description: 'Conseille en IT' },
        'Chef de Projet': { minEarnings: 90, maxEarnings: 170, description: 'Gère des projets' },
        'Data Analyst': { minEarnings: 85, maxEarnings: 155, description: 'Analyse des données' }
    };
    
    return jobsInfo[job] || { minEarnings: 50, maxEarnings: 100, description: 'Travaille dur' };
}

/**
 * Obtenir un événement de travail aléatoire
 * @returns {object} Événement aléatoire
 * @author Kofu
 */
function getRandomWorkEvent() {
    const events = [
        { name: 'Journée normale', description: 'Une journée de travail classique.', multiplier: 1.0, color: '#95A5A6' },
        { name: 'Journée productive', description: 'Tu as été particulièrement efficace !', multiplier: 1.2, color: '#2ECC71' },
        { name: 'Bonus de performance', description: 'Ton patron est impressionné par ton travail !', multiplier: 1.5, color: '#F39C12' },
        { name: 'Projet réussi', description: 'Tu as terminé un projet important !', multiplier: 1.8, color: '#E74C3C' },
        { name: 'Promotion surprise', description: 'Tu as reçu une promotion inattendue !', multiplier: 2.0, color: '#9B59B6' },
        { name: 'Journée difficile', description: 'Quelques problèmes ont ralenti ton travail.', multiplier: 0.8, color: '#34495E' },
        { name: 'Panne technique', description: 'Des problèmes techniques ont perturbé ta journée.', multiplier: 0.6, color: '#7F8C8D' },
        { name: 'Client satisfait', description: 'Un client très satisfait t\'a donné un pourboire !', multiplier: 1.3, color: '#1ABC9C' },
        { name: 'Heures supplémentaires', description: 'Tu as fait des heures supplémentaires payées !', multiplier: 1.4, color: '#3498DB' },
        { name: 'Collaboration réussie', description: 'Un travail d\'équipe exemplaire !', multiplier: 1.25, color: '#E67E22' }
    ];
    
    return events[Math.floor(Math.random() * events.length)];
}

/**
 * Vérifier et gérer le level up métier
 * @param {object} economyData - Données économiques
 * @returns {object} Informations sur le level up
 * @author Kofu
 */
function checkJobLevelUp(economyData) {
    const currentJobLevel = economyData.jobLevel;
    const currentJobXp = economyData.jobXp;
    const xpForNextJobLevel = getJobXpForNextLevel(currentJobLevel);
    
    if (currentJobXp >= xpForNextJobLevel) {
        // Level up métier !
        economyData.jobLevel += 1;
        economyData.jobXp -= xpForNextJobLevel;
        
        // Bonus de level up métier
        const levelUpBonus = currentJobLevel * 100;
        economyData.coins += levelUpBonus;
        economyData.totalEarned += levelUpBonus;
        
        return {
            leveledUp: true,
            newLevel: economyData.jobLevel,
            bonus: levelUpBonus
        };
    }
    
    return { leveledUp: false };
}

/**
 * Obtenir l'XP nécessaire pour le prochain niveau métier
 * @param {number} currentLevel - Niveau actuel
 * @returns {number} XP nécessaire
 * @author Kofu
 */
function getJobXpForNextLevel(currentLevel) {
    return currentLevel * 150;
}

/**
 * Vérifier et gérer le level up général
 * @param {object} economyData - Données économiques
 * @returns {object} Informations sur le level up
 * @author Kofu
 */
function checkLevelUp(economyData) {
    const currentLevel = economyData.level;
    const currentXp = economyData.xp;
    const xpForNextLevel = currentLevel * 100;
    
    if (currentXp >= xpForNextLevel) {
        // Level up !
        economyData.level += 1;
        economyData.xp -= xpForNextLevel;
        
        // Récompense de level up
        const levelUpReward = currentLevel * 50;
        economyData.coins += levelUpReward;
        economyData.totalEarned += levelUpReward;
        
        return {
            leveledUp: true,
            newLevel: economyData.level,
            reward: levelUpReward
        };
    }
    
    return { leveledUp: false };
}

/**
 * Mettre à jour les statistiques globales
 * @param {Client} client - Client Discord
 * @param {string} stat - Nom de la statistique
 * @param {number} value - Valeur à ajouter
 * @author Kofu
 */
function updateGlobalStats(client, stat, value) {
    try {
        const statsData = client.database.read('stats/global.json') || {
            totalCommands: 0,
            totalUsers: 0,
            totalServers: 0,
            economy: {
                totalCoinsEarned: 0,
                totalCoinsSpent: 0,
                dailyRewards: 0,
                workRewards: 0
            },
            lastUpdated: new Date()
        };
        
        if (stat === 'workRewards') {
            statsData.economy.totalCoinsEarned += value;
            statsData.economy.workRewards += value;
        }
        
        statsData.lastUpdated = new Date();
        client.database.write('stats/global.json', statsData);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur mise à jour stats globales:', error);
    }
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */