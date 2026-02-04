/**
 * ====================================
 * TASHKY BOT - COMMAND HANDLER
 * ====================================
 * 
 * Gestionnaire de chargement des commandes
 * Chargement automatique et enregistrement
 * 
 * @author Kofu (github.com/kofudev)
 * @version 1.0.0
 * @license MIT
 * 
 * ====================================
 */

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

/**
 * Charger toutes les commandes du bot
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function loadCommands(client) {
    console.log('🔄 [Kofu] Chargement des commandes...');
    
    const commands = [];
    const commandsPath = path.join(__dirname, '..', 'commands');
    
    // Vérifier si le dossier commands existe
    if (!fs.existsSync(commandsPath)) {
        console.log('📁 [Kofu] Création du dossier commands...');
        fs.mkdirSync(commandsPath, { recursive: true });
        
        // Créer les sous-dossiers
        const subFolders = ['general', 'moderation', 'tickets', 'owner', 'utility', 'fun'];
        subFolders.forEach(folder => {
            const folderPath = path.join(commandsPath, folder);
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
                console.log(`✅ [Kofu] Dossier créé: commands/${folder}`);
            }
        });
        
        console.log('⚠️ [Kofu] Dossier commands créé ! Ajoutez vos commandes et redémarrez le bot.');
        return;
    }
    
    // Parcourir tous les dossiers de commandes
    const commandFolders = fs.readdirSync(commandsPath);
    
    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        
        // Vérifier que c'est un dossier
        if (!fs.statSync(folderPath).isDirectory()) continue;
        
        console.log(`📂 [Kofu] Chargement du dossier: ${folder}`);
        
        // Lire tous les fichiers .js du dossier
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            
            try {
                // Supprimer du cache pour permettre le rechargement
                delete require.cache[require.resolve(filePath)];
                
                // Charger la commande
                const command = require(filePath);
                
                // Vérifier que la commande a les propriétés requises
                if (!command.data || !command.execute) {
                    console.warn(`⚠️ [Kofu] Commande invalide: ${file} (manque data ou execute)`);
                    continue;
                }
                
                // Ajouter la commande à la collection
                client.commands.set(command.data.name, command);
                commands.push(command.data.toJSON());
                
                console.log(`✅ [Kofu] Commande chargée: ${command.data.name} (${folder}/${file})`);
                
            } catch (error) {
                console.error(`❌ [Kofu] Erreur chargement ${file}:`, error.message);
            }
        }
    }
    
    console.log(`🎉 [Kofu] ${commands.length} commande(s) chargée(s) !`);
    
    // Enregistrer les commandes slash sur Discord
    await registerSlashCommands(commands);
}

/**
 * Enregistrer les commandes slash sur Discord
 * @param {Array} commands - Tableau des commandes à enregistrer
 * @author Kofu
 */
async function registerSlashCommands(commands) {
    try {
        console.log('🔄 [Kofu] Enregistrement des commandes slash...');
        
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        
        // Enregistrer les commandes globalement
        const data = await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commands }
        );
        
        console.log(`✅ [Kofu] ${data.length} commande(s) slash enregistrée(s) !`);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur enregistrement commandes slash:', error);
    }
}

/**
 * Recharger une commande spécifique
 * @param {Client} client - Le client Discord
 * @param {string} commandName - Nom de la commande à recharger
 * @returns {boolean} Succès ou échec
 * @author Kofu
 */
function reloadCommand(client, commandName) {
    try {
        // Trouver la commande dans la collection
        const command = client.commands.get(commandName);
        if (!command) {
            console.warn(`⚠️ [Kofu] Commande introuvable: ${commandName}`);
            return false;
        }
        
        // Supprimer du cache et recharger
        const commandsPath = path.join(__dirname, '..', 'commands');
        const commandFolders = fs.readdirSync(commandsPath);
        
        for (const folder of commandFolders) {
            const folderPath = path.join(commandsPath, folder);
            if (!fs.statSync(folderPath).isDirectory()) continue;
            
            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            
            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                const cmd = require(filePath);
                
                if (cmd.data && cmd.data.name === commandName) {
                    // Supprimer du cache
                    delete require.cache[require.resolve(filePath)];
                    
                    // Recharger
                    const reloadedCommand = require(filePath);
                    client.commands.set(commandName, reloadedCommand);
                    
                    console.log(`🔄 [Kofu] Commande rechargée: ${commandName}`);
                    return true;
                }
            }
        }
        
        return false;
        
    } catch (error) {
        console.error(`❌ [Kofu] Erreur rechargement ${commandName}:`, error.message);
        return false;
    }
}

/**
 * Obtenir les statistiques des commandes
 * @param {Client} client - Le client Discord
 * @returns {object} Statistiques des commandes
 * @author Kofu
 */
function getCommandStats(client) {
    const stats = {
        total: client.commands.size,
        categories: {}
    };
    
    // Compter par catégorie
    const commandsPath = path.join(__dirname, '..', 'commands');
    if (fs.existsSync(commandsPath)) {
        const commandFolders = fs.readdirSync(commandsPath);
        
        for (const folder of commandFolders) {
            const folderPath = path.join(commandsPath, folder);
            if (!fs.statSync(folderPath).isDirectory()) continue;
            
            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            stats.categories[folder] = commandFiles.length;
        }
    }
    
    return stats;
}

/**
 * Vérifier si une commande existe
 * @param {Client} client - Le client Discord
 * @param {string} commandName - Nom de la commande
 * @returns {boolean} True si la commande existe
 * @author Kofu
 */
function commandExists(client, commandName) {
    return client.commands.has(commandName);
}

/**
 * Obtenir la liste de toutes les commandes
 * @param {Client} client - Le client Discord
 * @returns {Array} Liste des commandes
 * @author Kofu
 */
function getAllCommands(client) {
    return Array.from(client.commands.values()).map(cmd => ({
        name: cmd.data.name,
        description: cmd.data.description,
        category: cmd.category || 'unknown'
    }));
}

// Exporter les fonctions
module.exports = loadCommands;
module.exports.reloadCommand = reloadCommand;
module.exports.getCommandStats = getCommandStats;
module.exports.commandExists = commandExists;
module.exports.getAllCommands = getAllCommands;
module.exports.registerSlashCommands = registerSlashCommands;

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */