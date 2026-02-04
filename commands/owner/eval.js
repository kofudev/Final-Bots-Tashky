/**
 * ====================================
 * COMMANDE OWNER: /eval
 * ====================================
 * 
 * Exécuter du code JavaScript en temps réel
 * 
 * ⚠️ COMMANDE EXTRÊMEMENT DANGEREUSE ⚠️
 * Accès TOTAL au système et au bot
 * 
 * @author Kofu (github.com/kofudev)
 * @category Owner Commands
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, codeBlock } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');
const util = require('util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eval')
        .setDescription('⚠️ [OWNER] Exécuter du code JavaScript')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('Code JavaScript à exécuter')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option.setName('async')
                .setDescription('Exécuter en mode asynchrone')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('silent')
                .setDescription('Ne pas afficher le résultat')
                .setRequired(false)
        ),
    
    category: 'owner',
    cooldown: 0,
    ownerOnly: true,
    
    /**
     * Exécution de la commande eval
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        // Vérifier que c'est un owner
        const owners = process.env.BOT_OWNERS ? JSON.parse(process.env.BOT_OWNERS) : [];
        if (!owners.includes(interaction.user.id)) {
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Accès refusé !',
                'Cette commande est réservée aux propriétaires du bot (Kofu & co).'
            );
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        const code = interaction.options.getString('code');
        const isAsync = interaction.options.getBoolean('async') || false;
        const silent = interaction.options.getBoolean('silent') || false;
        
        // Logger l'utilisation d'eval (CRITIQUE)
        interaction.client.logger.logOwnerAction(
            interaction.user,
            'EVAL_EXECUTION',
            {
                code: code.substring(0, 500), // Limiter la taille du log
                async: isAsync,
                silent: silent,
                guild: interaction.guild ? { id: interaction.guild.id, name: interaction.guild.name } : null,
                timestamp: new Date()
            }
        );
        
        console.log(`⚠️ [Kofu] EVAL exécuté par ${interaction.user.tag}: ${code.substring(0, 100)}...`);
        
        try {
            // Créer l'embed de traitement
            const processingEmbed = new EmbedBuilder()
                .setTitle('⚠️ Exécution de Code JavaScript')
                .setDescription('🔄 **Traitement en cours...**')
                .setColor('#FAA61A')
                .addFields(
                    { name: '👤 Exécuté par', value: interaction.user.tag, inline: true },
                    { name: '⚡ Mode', value: isAsync ? 'Asynchrone' : 'Synchrone', inline: true },
                    { name: '🔇 Silent', value: silent ? 'Oui' : 'Non', inline: true }
                )
                .setFooter({ text: '⚠️ COMMANDE DANGEREUSE - Kofu Owner Only' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [processingEmbed], ephemeral: true });
            
            // Variables disponibles dans le contexte d'évaluation
            const client = interaction.client;
            const guild = interaction.guild;
            const channel = interaction.channel;
            const user = interaction.user;
            const member = interaction.member;
            const db = interaction.client.database;
            const logger = interaction.client.logger;
            
            // Préparer le code à exécuter
            let codeToExecute = code;
            if (isAsync && !code.includes('await') && !code.includes('return')) {
                codeToExecute = `(async () => { ${code} })()`;
            }
            
            // Mesurer le temps d'exécution
            const startTime = Date.now();
            
            // Exécuter le code
            let result = eval(codeToExecute);
            
            // Si c'est une promesse, l'attendre
            if (result instanceof Promise) {
                result = await result;
            }
            
            const executionTime = Date.now() - startTime;
            
            // Si mode silent, juste confirmer l'exécution
            if (silent) {
                const silentEmbed = KofuSignature.createSuccessEmbed(
                    'Code exécuté en mode silent',
                    `✅ Le code a été exécuté avec succès en **${executionTime}ms**.`
                );
                
                silentEmbed.addFields(
                    { name: '📝 Code', value: codeBlock('js', code.length > 1000 ? code.substring(0, 1000) + '...' : code), inline: false }
                );
                
                return interaction.editReply({ embeds: [silentEmbed] });
            }
            
            // Formater le résultat
            let output = result;
            if (typeof result !== 'string') {
                output = util.inspect(result, { depth: 2, maxArrayLength: 10 });
            }
            
            // Limiter la taille de l'output
            if (output.length > 1900) {
                output = output.substring(0, 1900) + '\n... [Tronqué]';
            }
            
            // Créer l'embed de résultat
            const resultEmbed = new EmbedBuilder()
                .setTitle('✅ Code Exécuté avec Succès')
                .setColor('#43B581')
                .addFields(
                    { name: '📝 Code Exécuté', value: codeBlock('js', code.length > 500 ? code.substring(0, 500) + '...' : code), inline: false },
                    { name: '📤 Résultat', value: codeBlock('js', output || 'undefined'), inline: false },
                    { name: '⏱️ Temps d\'exécution', value: `\`${executionTime}ms\``, inline: true },
                    { name: '📊 Type de retour', value: `\`${typeof result}\``, inline: true },
                    { name: '⚡ Mode', value: isAsync ? 'Asynchrone' : 'Synchrone', inline: true }
                )
                .setFooter({ text: '⚠️ EVAL - Commande Owner Dangereuse | Made by Kofu' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [resultEmbed] });
            
            console.log(`✅ [Kofu] EVAL réussi par ${interaction.user.tag} en ${executionTime}ms`);
            
        } catch (error) {
            console.error(`❌ [Kofu] EVAL échoué par ${interaction.user.tag}:`, error);
            
            // Logger l'erreur
            interaction.client.logger.logOwnerAction(
                interaction.user,
                'EVAL_ERROR',
                {
                    code: code.substring(0, 500),
                    error: error.message,
                    stack: error.stack?.substring(0, 1000),
                    timestamp: new Date()
                }
            );
            
            // Formater l'erreur
            let errorMessage = error.message;
            if (errorMessage.length > 1000) {
                errorMessage = errorMessage.substring(0, 1000) + '... [Tronqué]';
            }
            
            let errorStack = error.stack || 'Pas de stack trace';
            if (errorStack.length > 1000) {
                errorStack = errorStack.substring(0, 1000) + '... [Tronqué]';
            }
            
            // Créer l'embed d'erreur
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Erreur d\'Exécution')
                .setColor('#F04747')
                .addFields(
                    { name: '📝 Code Exécuté', value: codeBlock('js', code.length > 500 ? code.substring(0, 500) + '...' : code), inline: false },
                    { name: '❌ Erreur', value: codeBlock('js', errorMessage), inline: false },
                    { name: '📚 Stack Trace', value: codeBlock('js', errorStack), inline: false },
                    { name: '🏷️ Type d\'erreur', value: `\`${error.name}\``, inline: true },
                    { name: '⚡ Mode', value: isAsync ? 'Asynchrone' : 'Synchrone', inline: true }
                )
                .setFooter({ text: '⚠️ EVAL ERROR - Commande Owner Dangereuse | Made by Kofu' })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */