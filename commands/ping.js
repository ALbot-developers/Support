const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('🏓Ping値を計測します！'),

	run: async (client, interaction) => {
		try {
			await interaction.reply(`🔄️ 測定中...`);

			const msg = await interaction.fetchReply();

			await interaction.editReply(
				`✅ 測定完了\n- WebSocketのPing: ${
					interaction.client.ws.ping == -1
						? '\`測定不可\`'
						: `\`${interaction.client.ws.ping}ms\``
				}\n- APIのエンドポイントのPing: \`${
					msg.createdTimestamp - interaction.createdTimestamp
				}ms\``
			);
		} catch (err) {
			console.log(err);
		}
	},
};
