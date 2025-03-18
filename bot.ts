import { Client, GatewayIntentBits, CommandInteraction, GuildMember, Role } from "discord.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const TRACKER_API_KEY = process.env.TRACKER_API_KEY!;
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// Fetch rank from Tracker.gg
async function getValorantRank(riotId: string) {
    try {
        const response = await axios.get(`https://api.tracker.gg/api/v2/valorant/standard/profile/riot/${encodeURIComponent(riotId)}`, {
            headers: { Authorization: `Bearer ${TRACKER_API_KEY}` }
        });

        const data = response.data.data.segments[0].stats;
        return {
            currentRank: data.rank.value,
            peakRank: data.peakRank.value
        };
    } catch (error: unknown) {
        console.error("Error fetching rank:", (error as any).response?.data || (error as any).message);
        return null;
    }
}

// Assign the appropriate roles
async function assignRankRoles(member: GuildMember, currentRank: string, peakRank: string) {
    if (!member.guild) return;

    const rolesToAssign: Role[] = [];
    const rolesToRemove: Role[] = [];

    const roleManager = member.guild.roles;
    const userRoles = member.roles.cache;

    // Assign current rank role (e.g., "Platinum 1")
    let currentRankRole = roleManager.cache.find((r) => r.name === currentRank);
    if (!currentRankRole) {
        currentRankRole = await member.guild.roles.create({
            name: currentRank,
            color: "Blue",
            reason: "Valorant rank role creation",
        });
    }
    if (!userRoles.has(currentRankRole.id)) rolesToAssign.push(currentRankRole);

    // Assign peak rank role (e.g., "Platinum 1 PEAK")
    const peakRankRoleName = `${peakRank} PEAK`;
    let peakRankRole = roleManager.cache.find((r) => r.name === peakRankRoleName);

    if (!peakRankRole) {
        peakRankRole = await member.guild.roles.create({
            name: peakRankRoleName,
            color: "Gold",
            reason: "Valorant peak rank role creation",
        });
    }
    if (!userRoles.has(peakRankRole.id)) rolesToAssign.push(peakRankRole);

    // Remove outdated rank roles
    userRoles.forEach((role) => {
        if (role.name.includes("PEAK") || Object.values(rolesToAssign).some(r => r.name === role.name)) return;
        rolesToRemove.push(role);
    });

    // Apply role updates
    if (rolesToAssign.length) await member.roles.add(rolesToAssign);
    if (rolesToRemove.length) await member.roles.remove(rolesToRemove);

    console.log(`Updated roles for ${member.user.tag}:`, rolesToAssign.map((r) => r.name));
}

// Slash Command: `/register <RiotID>`
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return; // ✅ FIXED: Ensure valid command interaction

    if (interaction.commandName !== "register") return;

    const riotId = interaction.options.getString("riotid", true);
    if (!riotId) {
        return interaction.reply({ content: "❌ Please provide a valid Riot ID.", ephemeral: true });
    }

    const member = interaction.member as GuildMember;
    await interaction.deferReply({ ephemeral: true });

    const rankData = await getValorantRank(riotId);
    if (!rankData) return interaction.editReply("❌ Could not fetch your rank. Make sure your Riot ID is correct!");

    await assignRankRoles(member, rankData.currentRank, rankData.peakRank);

    interaction.editReply(`✅ Successfully linked **${riotId}**! You have been assigned the role for **${rankData.currentRank}** and **${rankData.peakRank} PEAK**.`);
});

// Bot ready event
client.once("ready", async () => {
    console.log(`✅ ${client.user?.tag} is online!`);
});

// Login bot
client.login(DISCORD_BOT_TOKEN);
