/**
 * ====================================
 * COMMANDE: /shop
 * ====================================
 * 
 * Boutique virtuelle avec objets
 * Système d'achat et d'inventaire
 * 
 * @author Kofu (github.com/kofudev)
 * @category Economy
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('🛒 Boutique virtuelle')
        .addSubcommand(subcommand =>
            subcommand
                .setName('browse')
                .setDescription('Parcourir la boutique')
                .addStringOption(option =>
                    option.setName('categorie')
                        .setDescription('Catégorie d\'objets')
                        .setRequired(false)
                        .addChoices(
                            { name: '🎨 Cosmétiques', value: 'cosmetics' },
                            { name: '🎮 Gaming', value: 'gaming' },
                            { name: '💎 Premium', value: 'premium' },
                            { name: '🎁 Cadeaux', value: 'gifts' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Acheter un objet')
                .addStringOption(option =>
                    option.setName('objet')
                        .setDescription('ID de l\'objet à acheter')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('quantite')
                        .setDescription('Quantité à acheter')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(10)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('inventory')
                .setDescription('Voir ton inventaire')
        ),
    
    category: 'economy',
    cooldown: 5,
    
    /**
     * Exécution de la commande shop
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'browse':
                await handleBrowse(interaction);
                break;
            case 'buy':
                await handleBuy(interaction);
                break;
            case 'inventory':
                await handleInventory(interaction);
                break;
        }
    }
};

/**
 * Gérer la navigation dans la boutique
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @author Kofu
 */
async function handleBrowse(interaction) {
    const category = interaction.options.getString('categorie') || 'all';
    
    const shopEmbed = createShopEmbed(category);
    const shopMenu = createShopMenu();
    
    await interaction.reply({
        embeds: [shopEmbed],
        components: [shopMenu]
    });
    
    // Gérer les interactions du menu
    const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 300000 // 5 minutes
    });
    
    collector.on('collect', async i => {
        if (i.isStringSelectMenu()) {
            const selectedCategory = i.values[0];
            const newEmbed = createShopEmbed(selectedCategory);
            
            await i.update({
                embeds: [newEmbed],
                components: [shopMenu]
            });
        }
    });
    
    collector.on('end', () => {
        const disabledMenu = createShopMenu(true);
        interaction.editReply({ components: [disabledMenu] }).catch(() => {});
    });
}

/**
 * Gérer l'achat d'objets
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @author Kofu
 */
async function handleBuy(interaction) {
    const itemId = interaction.options.getString('objet');
    const quantity = interaction.options.getInteger('quantite') || 1;
    
    const userData = interaction.client.database.getUser(interaction.user.id);
    const economyData = userData.economy || { coins: 0, inventory: {} };
    
    // Récupérer l'objet
    const item = getShopItem(itemId);
    if (!item) {
        const errorEmbed = KofuSignature.createErrorEmbed(
            'Objet introuvable !',
            `L'objet avec l'ID \`${itemId}\` n'existe pas dans la boutique.`
        );
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
    
    // Vérifier le niveau requis
    if (item.levelRequired && (economyData.level || 1) < item.levelRequired) {
        const errorEmbed = KofuSignature.createErrorEmbed(
            'Niveau insuffisant !',
            `Tu dois être niveau **${item.levelRequired}** pour acheter cet objet.\nTon niveau actuel: **${economyData.level || 1}**`
        );
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
    
    // Calculer le coût total
    const totalCost = item.price * quantity;
    
    // Vérifier les fonds
    if (economyData.coins < totalCost) {
        const errorEmbed = KofuSignature.createErrorEmbed(
            'Fonds insuffisants !',
            `Tu n'as pas assez de Kofu Coins pour acheter cet objet.\n\n` +
            `**Coût:** ${totalCost.toLocaleString('fr-FR')} Kofu Coins\n` +
            `**Ton solde:** ${economyData.coins.toLocaleString('fr-FR')} Kofu Coins\n` +
            `**Manque:** ${(totalCost - economyData.coins).toLocaleString('fr-FR')} Kofu Coins`
        );
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
    
    // Effectuer l'achat
    economyData.coins -= totalCost;
    economyData.totalSpent = (economyData.totalSpent || 0) + totalCost;
    
    // Ajouter à l'inventaire
    if (!economyData.inventory) economyData.inventory = {};
    economyData.inventory[itemId] = (economyData.inventory[itemId] || 0) + quantity;
    
    // Sauvegarder
    userData.economy = economyData;
    interaction.client.database.setUser(interaction.user.id, userData);
    
    // Créer l'embed de confirmation
    const purchaseEmbed = new EmbedBuilder()
        .setTitle('🛒 Achat réussi !')
        .setDescription(`Tu as acheté **${quantity}x ${item.name}** !`)
        .setColor('#00FF00')
        .setThumbnail(item.icon || interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '🛍️ Objet', value: `${item.emoji} **${item.name}**`, inline: true },
            { name: '📦 Quantité', value: `${quantity}`, inline: true },
            { name: '💰 Coût total', value: `${totalCost.toLocaleString('fr-FR')} Kofu Coins`, inline: true },
            { name: '💵 Nouveau solde', value: `${economyData.coins.toLocaleString('fr-FR')} Kofu Coins`, inline: true },
            { name: '📦 En inventaire', value: `${economyData.inventory[itemId]}`, inline: true },
            { name: '📝 Description', value: item.description, inline: false }
        )
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    await interaction.reply({ embeds: [purchaseEmbed] });
    
    console.log(`🛒 [Kofu] ${interaction.user.tag} a acheté ${quantity}x ${item.name} pour ${totalCost} coins`);
}

/**
 * Gérer l'affichage de l'inventaire
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @author Kofu
 */
async function handleInventory(interaction) {
    const userData = interaction.client.database.getUser(interaction.user.id);
    const inventory = userData.economy?.inventory || {};
    
    if (Object.keys(inventory).length === 0) {
        const emptyEmbed = KofuSignature.createWarningEmbed(
            'Inventaire vide !',
            'Tu n\'as aucun objet dans ton inventaire.\n\nUtilise `/shop browse` pour voir les objets disponibles !'
        );
        return interaction.reply({ embeds: [emptyEmbed] });
    }
    
    // Créer l'embed d'inventaire
    const inventoryEmbed = new EmbedBuilder()
        .setTitle('📦 Ton Inventaire')
        .setColor('#4ECDC4')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    let inventoryText = '';
    let totalValue = 0;
    
    for (const [itemId, quantity] of Object.entries(inventory)) {
        const item = getShopItem(itemId);
        if (item) {
            const itemValue = item.price * quantity;
            totalValue += itemValue;
            
            inventoryText += `${item.emoji} **${item.name}** x${quantity}\n`;
            inventoryText += `   💰 Valeur: ${itemValue.toLocaleString('fr-FR')} Kofu Coins\n\n`;
        }
    }
    
    inventoryEmbed.setDescription(inventoryText || 'Inventaire vide');
    inventoryEmbed.addFields(
        { name: '📊 Statistiques', value: `**Objets uniques:** ${Object.keys(inventory).length}\n**Valeur totale:** ${totalValue.toLocaleString('fr-FR')} Kofu Coins`, inline: false }
    );
    
    await interaction.reply({ embeds: [inventoryEmbed] });
}

/**
 * Créer l'embed de la boutique
 * @param {string} category - Catégorie sélectionnée
 * @returns {EmbedBuilder} Embed de la boutique
 * @author Kofu
 */
function createShopEmbed(category) {
    const embed = new EmbedBuilder()
        .setTitle('🛒 Boutique TASHKY')
        .setColor('#E74C3C')
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    const items = getShopItems(category);
    
    if (items.length === 0) {
        embed.setDescription('Aucun objet disponible dans cette catégorie.');
        return embed;
    }
    
    let description = `**Catégorie:** ${getCategoryName(category)}\n\n`;
    
    for (const item of items.slice(0, 10)) { // Limiter à 10 objets
        description += `${item.emoji} **${item.name}** - \`${item.id}\`\n`;
        description += `   💰 **${item.price.toLocaleString('fr-FR')} Kofu Coins**`;
        if (item.levelRequired) description += ` | 📊 Niveau ${item.levelRequired}`;
        description += `\n   📝 ${item.description}\n\n`;
    }
    
    embed.setDescription(description);
    
    embed.addFields({
        name: '💡 Comment acheter',
        value: 'Utilise `/shop buy <id>` pour acheter un objet.\nExemple: `/shop buy badge_vip`',
        inline: false
    });
    
    return embed;
}

/**
 * Créer le menu de sélection de la boutique
 * @param {boolean} disabled - Si le menu est désactivé
 * @returns {ActionRowBuilder} Menu de sélection
 * @author Kofu
 */
function createShopMenu(disabled = false) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('shop_category_select')
        .setPlaceholder('🛒 Sélectionne une catégorie...')
        .setDisabled(disabled)
        .addOptions([
            {
                label: 'Tous les objets',
                description: 'Voir tous les objets disponibles',
                value: 'all',
                emoji: '🛍️'
            },
            {
                label: 'Cosmétiques',
                description: 'Badges, titres et décorations',
                value: 'cosmetics',
                emoji: '🎨'
            },
            {
                label: 'Gaming',
                description: 'Objets liés au gaming',
                value: 'gaming',
                emoji: '🎮'
            },
            {
                label: 'Premium',
                description: 'Objets premium exclusifs',
                value: 'premium',
                emoji: '💎'
            },
            {
                label: 'Cadeaux',
                description: 'Objets à offrir aux autres',
                value: 'gifts',
                emoji: '🎁'
            }
        ]);
    
    return new ActionRowBuilder().addComponents(menu);
}

/**
 * Obtenir les objets de la boutique par catégorie
 * @param {string} category - Catégorie
 * @returns {Array} Liste des objets
 * @author Kofu
 */
function getShopItems(category) {
    const allItems = [
        // Cosmétiques
        { id: 'badge_vip', name: 'Badge VIP', price: 1000, category: 'cosmetics', emoji: '⭐', description: 'Badge VIP exclusif pour ton profil', levelRequired: 5 },
        { id: 'badge_legend', name: 'Badge Légende', price: 5000, category: 'cosmetics', emoji: '🏆', description: 'Badge légendaire ultra rare', levelRequired: 25 },
        { id: 'title_master', name: 'Titre Maître', price: 2500, category: 'cosmetics', emoji: '👑', description: 'Titre "Maître" pour ton profil', levelRequired: 15 },
        { id: 'color_gold', name: 'Couleur Or', price: 1500, category: 'cosmetics', emoji: '🟨', description: 'Couleur dorée pour ton nom', levelRequired: 10 },
        
        // Gaming
        { id: 'boost_xp', name: 'Boost XP', price: 500, category: 'gaming', emoji: '⚡', description: 'Double XP pendant 1 heure', levelRequired: 1 },
        { id: 'boost_coins', name: 'Boost Coins', price: 750, category: 'gaming', emoji: '💰', description: 'Double gains de coins pendant 1 heure', levelRequired: 5 },
        { id: 'lucky_charm', name: 'Porte-bonheur', price: 1200, category: 'gaming', emoji: '🍀', description: 'Augmente tes chances de gains', levelRequired: 8 },
        
        // Premium
        { id: 'premium_pass', name: 'Pass Premium', price: 10000, category: 'premium', emoji: '💎', description: 'Accès premium pendant 30 jours', levelRequired: 20 },
        { id: 'custom_command', name: 'Commande Personnalisée', price: 15000, category: 'premium', emoji: '⚙️', description: 'Crée ta propre commande', levelRequired: 30 },
        
        // Cadeaux
        { id: 'gift_box', name: 'Boîte Cadeau', price: 300, category: 'gifts', emoji: '🎁', description: 'Boîte cadeau à offrir', levelRequired: 1 },
        { id: 'love_letter', name: 'Lettre d\'Amour', price: 200, category: 'gifts', emoji: '💌', description: 'Lettre d\'amour à envoyer', levelRequired: 1 },
        { id: 'flower_bouquet', name: 'Bouquet de Fleurs', price: 400, category: 'gifts', emoji: '💐', description: 'Beau bouquet de fleurs', levelRequired: 3 }
    ];
    
    if (category === 'all') return allItems;
    return allItems.filter(item => item.category === category);
}

/**
 * Obtenir un objet par son ID
 * @param {string} itemId - ID de l'objet
 * @returns {object|null} Objet trouvé
 * @author Kofu
 */
function getShopItem(itemId) {
    const allItems = getShopItems('all');
    return allItems.find(item => item.id === itemId) || null;
}

/**
 * Obtenir le nom d'une catégorie
 * @param {string} category - Catégorie
 * @returns {string} Nom de la catégorie
 * @author Kofu
 */
function getCategoryName(category) {
    const names = {
        all: '🛍️ Tous les objets',
        cosmetics: '🎨 Cosmétiques',
        gaming: '🎮 Gaming',
        premium: '💎 Premium',
        gifts: '🎁 Cadeaux'
    };
    
    return names[category] || '🛍️ Tous les objets';
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */