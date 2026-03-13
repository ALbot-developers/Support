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
			// FAQインデックスを構築してフォーマット
			const [indexData, formattedIndex] = await Promise.all([
				faqIndexManager.build(client),
				faqIndexManager.format(client, String),
			]);

			if (!indexData || !formattedIndex) {
				return interaction.reply({
					content:
						'FAQの目次の生成中にエラーが発生しました。\nログを確認してください。',
					flags: MessageFlags.Ephemeral,
				});
			}

			// FAQチャンネルを取得
			const faqChannel = await client.channels.fetch(
				process.env.FAQ_CHANNEL_ID,
			);
			if (!faqChannel) {
				return interaction.reply({
					content: 'FAQチャンネルが見つかりません。',
					flags: MessageFlags.Ephemeral,
				});
			}

			// 目次のEmbedを作成して送信
			const embed = new EmbedBuilder()
				.setTitle('📌｜目次')
				.setDescription(formattedIndex)
				.setColor(0x7ed321);

			await faqChannel.send({
				embeds: [embed],
			});

			await interaction.reply({
				content: 'FAQの目次を生成しました。',
				flags: MessageFlags.Ephemeral,
			});
		} catch (err) {
			console.error(`Error in faqIndexGenerator command: ${err}`);
			// エラーが発生した場合、まだ返信していない場合のみ返信
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({
					content: 'コマンドの実行中にエラーが発生しました。',
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	},
};
