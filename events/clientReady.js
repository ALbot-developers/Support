const { REST, Routes, ActivityType } = require('discord.js');

module.exports = async (client) => {
  // スラッシュコマンドの登録
	const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
	try {
		await rest.put(Routes.applicationCommands(client.user.id), {
			body: await client.commands,
		});
	} catch (err) {
		console.error(`[Error] Failed to register application commands: ${err}`);
	}

	console.log(`[Client] Logged in as ${client.user.tag}`);

	// アクティビティを設定
	client.user.setActivity({
		name: 'ALBOTに関するご意見・ご要望はお気軽にどうぞ！',
		type: ActivityType.Watching,
	});
};
