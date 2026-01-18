const {
	SlashCommandBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	MessageFlags,
	ChannelType,
	PermissionFlagsBits,
	InteractionContextType,
	ContainerBuilder,
	TextDisplayBuilder,
} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setup')
		.setDescription('⚙️ サポートチケットシステムのセットアップを行います。')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setContexts(InteractionContextType.Guild)
		.addChannelOption((option) =>
			option
				.setName('channel')
				.setDescription(
					'お客様が、問い合わせの開始するために使用するチャンネルを指定してください。',
				)
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(true),
		),

	run: async (client, interaction) => {
		try {
			// サポートチケットシステムのセットアップ処理
			// 各種カテゴリの準備
			const openTicketCategoryId = process.env.OPEN_TICKET_CATEGORY_ID;
			const supportRoleId = process.env.SUPPORT_ROLE_ID;
			if (!openTicketCategoryId || !supportRoleId) {
				return interaction.reply({
					content:
						'BOTの環境変数が正しく設定されていません。.envファイルを確認してください。',
					flags: MessageFlags.Ephemeral,
				});
			}

			// containerを作成
			const container = new ContainerBuilder()
				.addTextDisplayComponents([
					new TextDisplayBuilder({ content: '# 📪 お問い合わせ' }),
					new TextDisplayBuilder().setContent(
						'質問・要望・バグ報告などがある場合は下のボタンを押してください。\nサポートチームが対応いたします。',
					),
					new TextDisplayBuilder().setContent(
						'↓ここをクリックして始めてください↓',
					),
				])
				.setAccentColor(0xffffff);

			// buttonを作成
			const button = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId('support')
					.setLabel('問い合わせを開始する')
					.setStyle(ButtonStyle.Success)
					.setEmoji('🎫'),
			);

			//containerとbutton送信
			const contactUsChannel = interaction.options.getChannel('channel');
			await contactUsChannel.send({
				components: [container, button],
				flags: MessageFlags.IsComponentsV2,
			});

			// 成功メッセージを返す
			await interaction.reply({
				content: `セットアップが完了しました！${contactUsChannel}にメッセージを送信しました。`,
				flags: MessageFlags.Ephemeral,
			});
		} catch (err) {
			console.error(err);
			await interaction
				.reply({
					content: 'セットアップ中にエラーが発生しました。',
					flags: MessageFlags.Ephemeral,
				})
				.catch(() => {});
		}
	},
};
