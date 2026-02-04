/**
 * ====================================
 * TASHKY BOT - EVENT HANDLER
 * ====================================
 * 
 * Gestionnaire de chargement des événements
 * Chargement automatique de tous les events
 * 
 * @author Kofu (github.com/kofudev)
 * @version 1.0.0
 * @license MIT
 * 
 * ====================================
 */

const fs = require('fs');
const path = require('path');

/**
 * Charger tous les événements du bot
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function loadEvents(client) {
    console.log('🔄 [Kofu] Chargement des événements...');
    
    const eventsPath = path.join(__dirname, '..', 'events');
    
    // Vérifier si le dossier events existe
    if (!fs.existsSync(eventsPath)) {
        console.log('📁 [Kofu] Création du dossier events...');
        fs.mkdirSync(eventsPath, { recursive: true });
        
        // Créer les sous-dossiers
        const subFolders = ['client', 'guild', 'interaction', 'message'];
        subFolders.forEach(folder => {
            const folderPath = path.join(eventsPath, folder);
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
                console.log(`✅ [Kofu] Dossier créé: events/${folder}`);
            }
        });
        
        // Créer l'événement ready de base
        await createBasicReadyEvent(eventsPath);
        await createBasicInteractionEvent(eventsPath);
        
        console.log('⚠️ [Kofu] Dossier events créé avec événements de base !');
    }
    
    let eventCount = 0;
    
    // Parcourir tous les dossiers d'événements
    const eventFolders = fs.readdirSync(eventsPath);
    
    for (const folder of eventFolders) {
        const folderPath = path.join(eventsPath, folder);
        
        // Vérifier que c'est un dossier
        if (!fs.statSync(folderPath).isDirectory()) continue;
        
        console.log(`📂 [Kofu] Chargement du dossier: events/${folder}`);
        
        // Lire tous les fichiers .js du dossier
        const eventFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        
        for (const file of eventFiles) {
            const filePath = path.join(folderPath, file);
            
            try {
                // Supprimer du cache pour permettre le rechargement
                delete require.cache[require.resolve(filePath)];
                
                // Charger l'événement
                const event = require(filePath);
                
                // Vérifier que l'événement a les propriétés requises
                if (!event.name || !event.execute) {
                    console.warn(`⚠️ [Kofu] Événement invalide: ${file} (manque name ou execute)`);
                    continue;
                }
                
                // Enregistrer l'événement
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                }
                
                eventCount++;
                console.log(`✅ [Kofu] Événement chargé: ${event.name} (${folder}/${file})`);
                
            } catch (error) {
                console.error(`❌ [Kofu] Erreur chargement ${file}:`, error.message);
            }
        }
    }
    
    console.log(`🎉 [Kofu] ${eventCount} événement(s) chargé(s) !`);
}

/**
 * Créer l'événement ready de base
 * @param {string} eventsPath - Chemin du dossier events
 * @author Kofu
 */
async function createBasicReadyEvent(eventsPath) {
    const readyEventContent = `/**
 * ====================================
 * ÉVÉNEMENT: CLIENT READY
 * ====================================
 * 
 * Déclenché quand le bot est connecté et prêt
 * 
 * @author Kofu (github.com/kofudev)
 * ====================================
 */

const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    
    /**
     * Exécution de l'événement ready
     * @param {Client} client - Le client Discord
     * @author Kofu
     */
    async execute(client) {
        console.log('🤖 [Kofu] Bot connecté en tant que: ' + client.user.tag);
        
        // Mettre à jour les statistiques
        const globalData = client.database.read('globaldata.json') || client.database.getDefaultGlobalData();
        globalData.statistics.totalGuilds = client.guilds.cache.size;
        globalData.statistics.totalUsers = client.users.cache.size;
        globalData.bot.startedAt = new Date();
        globalData.lastUpdated = new Date();
        
        client.database.write('globaldata.json', globalData);
        
        // Logger l'événement
        client.logger.info(\`Bot démarré - \${client.guilds.cache.size} serveurs, \${client.users.cache.size} utilisateurs\`);
    }
};

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * ====================================
 */`;

    const readyPath = path.join(eventsPath, 'client', 'ready.js');
    fs.writeFileSync(readyPath, readyEventContent);
    console.log('✅ [Kofu] Événement ready créé !');
}

/**
 * Créer l'événement interactionCreate de base
 * @param {string} eventsPath - Chemin du dossier events
 * @author Kofu
 */
async function createBasicInteractionEvent(eventsPath) {
    const interactionEventContent = `/**
 * ====================================
 * ÉVÉNEMENT: INTERACTION CREATE
 * ====================================
 * 
 * Gère toutes les interactions (commandes, boutons, etc.)
 * 
 * @author Kofu (github.com/kofudev)
 * ====================================
 */

const { Events, Collection } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    name: Events.InteractionCreate,
    
    /**
     * Exécution de l'événement interactionCreate
     * @param {Interaction} interaction - L'interaction Discord
     * @param {Client} client - Le client Discord
     * @author Kofu
     */
    async execute(interaction, client) {
        // Gérer les commandes slash
        if (interaction.isChatInputCommand()) {
            await handleSlashCommand(interaction, client);
        }
        
        // Gérer les boutons
        if (interaction.isButton()) {
            await handleButton(interaction, client);
        }
        
        // Gérer les menus déroulants
        if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction, client);
        }
    }
};

/**
 * Gérer les commandes slash
 * @param {ChatInputCommandInteraction} interaction - L'interaction de commande
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function handleSlashCommand(interaction, client) {
    const command = client.commands.get(interaction.commandName);
    
    if (!command) {
        console.warn(\`⚠️ [Kofu] Commande inconnue: \${interaction.commandName}\`);
        return;
    }
    
    try {
        // Vérifier les cooldowns
        if (!client.cooldowns.has(command.data.name)) {
            client.cooldowns.set(command.data.name, new Collection());
        }
        
        const now = Date.now();
        const timestamps = client.cooldowns.get(command.data.name);
        const cooldownAmount = (command.cooldown || 3) * 1000;
        
        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
            
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                const embed = KofuSignature.createWarningEmbed(
                    'Cooldown actif !',
                    \`Attends encore **\${timeLeft.toFixed(1)}** secondes avant de réutiliser cette commande.\`
                );
                
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
        
        // Définir le cooldown
        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
        
        // Exécuter la commande
        await command.execute(interaction);
        
        // Logger la commande
        client.logger.logCommand(interaction, command.data.name, true);
        
        console.log(\`⚙️ [Kofu] Commande exécutée: \${command.data.name} par \${interaction.user.tag}\`);
        
    } catch (error) {
        console.error(\`❌ [Kofu] Erreur commande \${command.data.name}:\`, error);
        
        // Logger l'erreur
        client.logger.logCommand(interaction, command.data.name, false);
        client.logger.error(\`Erreur commande \${command.data.name}\`, error);
        
        // Répondre avec une erreur
        const embed = KofuSignature.createErrorEmbed(
            'Erreur !',
            'Une erreur est survenue lors de l\\'exécution de cette commande.\\n\\n\`\`\`' + error.message + '\`\`\`'
        );
        
        const method = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
        await interaction[method]({ embeds: [embed], ephemeral: true });
    }
}

/**
 * Gérer les interactions de boutons
 * @param {ButtonInteraction} interaction - L'interaction de bouton
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function handleButton(interaction, client) {
    // Ici, vous pouvez ajouter la logique pour gérer les boutons
    // Par exemple, pour les tickets, la pagination, etc.
    
    console.log(\`🔘 [Kofu] Bouton cliqué: \${interaction.customId} par \${interaction.user.tag}\`);
}

/**
 * Gérer les menus déroulants
 * @param {StringSelectMenuInteraction} interaction - L'interaction de menu
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function handleSelectMenu(interaction, client) {
    // Ici, vous pouvez ajouter la logique pour gérer les menus
    
    console.log(\`📋 [Kofu] Menu utilisé: \${interaction.customId} par \${interaction.user.tag}\`);
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * ====================================
 */`;

    const interactionPath = path.join(eventsPath, 'interaction', 'interactionCreate.js');
    fs.writeFileSync(interactionPath, interactionEventContent);
    console.log('✅ [Kofu] Événement interactionCreate créé !');
}

/**
 * Recharger tous les événements
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
function reloadEvents(client) {
    console.log('🔄 [Kofu] Rechargement des événements...');
    
    // Supprimer tous les listeners existants
    client.removeAllListeners();
    
    // Recharger les événements
    loadEvents(client);
}

/**
 * Obtenir les statistiques des événements
 * @returns {object} Statistiques des événements
 * @author Kofu
 */
function getEventStats() {
    const eventsPath = path.join(__dirname, '..', 'events');
    const stats = {
        total: 0,
        categories: {}
    };
    
    if (fs.existsSync(eventsPath)) {
        const eventFolders = fs.readdirSync(eventsPath);
        
        for (const folder of eventFolders) {
            const folderPath = path.join(eventsPath, folder);
            if (!fs.statSync(folderPath).isDirectory()) continue;
            
            const eventFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            stats.categories[folder] = eventFiles.length;
            stats.total += eventFiles.length;
        }
    }
    
    return stats;
}

// Exporter les fonctions
module.exports = loadEvents;
module.exports.reloadEvents = reloadEvents;
module.exports.getEventStats = getEventStats;

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */