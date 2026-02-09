const {
	SlashCommandBuilder,
	PermissionFlagsBits,
	InteractionContextType,
	MessageFlags,
	EmbedBuilder,
} = require('discord.js');
const faqIndexManager = require(`../lib/faqIndexManager.js`);

// FAQの目次を生成するコマンド
module.exports = {
	data: new SlashCommandBuilder()
		.setName('faqindexgenerator')
		.setDescription('🛠️ FAQの目次を生成します。')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setContexts(InteractionContextType.Guild),

	run: async (client, interaction) => {
		try {
			const result = await faqIndexManager.fullIndexGenerator(client);

			if (!result) {
				return interaction.reply({
					content:
						'FAQの目次の生成中にエラーが発生しました。\nログを確認してください。',
					flags: MessageFlags.Ephemeral,
				});
			}

			// 目次を生成する
			const faqChannel = await client.channels.fetch(
				process.env.FAQ_CHANNEL_ID,
			);
			if (!faqChannel) {
				return interaction.reply({
					content: 'FAQチャンネルが見つかりません。',
					flags: MessageFlags.Ephemeral,
				});
			}
			let description = '';
			for (const category in result) {
				description += `- **${result[category].categoryNameJP}**\n`;
				for (const index in result[category].faqs) {
					description += `  - [${result[category].faqs[index].title}](https://discord.com/channels/${faqChannel.guild.id}/${faqChannel.id}/${result[category].faqs[index].messageId})\n`;
				}
			}
			const embed = new EmbedBuilder()
				.setTitle('📌｜目次')
				.setDescription(description)
				.setColor(0x7ed321);
			await faqChannel.send({
				embeds: [embed],
			});

			await interaction.reply({
				content: 'FAQの目次を生成しました。',
				flags: MessageFlags.Ephemeral,
			});
		} catch (err) {
			console.log(`Error in faqIndexGenerator command: ${err}`);
		}
	},
};
