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

///////////////////////////////////////////////////
// 各種イベントのハンドラー
fs.readdir('./events', (_err, files) => {
	files.forEach((file) => {
		if (!file.endsWith('.js')) return;
		const event = require(`./events/${file}`);
		const eventName = file.split('.')[0];
		console.log(`[Event] Loaded: ${eventName}`);
		client.on(eventName, event.bind(null, client));
		delete require.cache[require.resolve(`./events/${file}`)];
	});
});

// コマンドのハンドラー
client.commands = [];
fs.readdir('./commands', (err, files) => {
	if (err) throw err;
	files.forEach((f) => {
		try {
			if (f.endsWith('.js')) {
				const props = require(`./commands/${f}`);
				const propsJson = props.data.toJSON();
				client.commands.push(propsJson);
				console.log(`[Command] Loaded: ${propsJson.name}`);
			}
		} catch (err) {
			console.log(err);
		}
	});
});
///////////////////////////////////////////////////

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
