const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config({ quiet: true });
const fs = require('fs');
const express = require('express');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

const token = process.env.TOKEN;

client.once('clientReady', () => {
	console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
	message.reply('hi!');
});

if (!token) {
	console.error('No token provided. Set the TOKEN environment variable.');
	process.exit(1);
}
client.login(token);

const app = express();
app.get('/', (req, res) => {
	return res.sendStatus(200);
});

app.listen(80, () => {
	console.log('[Express] Server is running on port 80');
});
