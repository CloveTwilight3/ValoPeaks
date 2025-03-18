import { REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.DISCORD_BOT_TOKEN!;
const CLIENT_ID = process.env.CLIENT_ID!;

if (!TOKEN || !CLIENT_ID) {
    console.error("❌ Missing DISCORD_BOT_TOKEN or CLIENT_ID in .env file");
    process.exit(1);
}

const commands = [
    new SlashCommandBuilder()
        .setName("register")
        .setDescription("Register your Riot ID to get your rank role.")
        .addStringOption(option =>
            option.setName("riotid")
                .setDescription("Your Riot ID (e.g., MazeyJessica#EU)")
                .setRequired(true)
        )
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    try {
        console.log("🔹 Registering slash commands...");
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log("✅ Slash commands registered!");
    } catch (error) {
        console.error("❌ Error registering commands:", error);
    }
})();
