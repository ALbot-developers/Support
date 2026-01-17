const {
	SlashCommandBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	MessageFlags,
	ChannelType,
	EmbedBuilder,
	PermissionFlagsBits,
	InteractionContextType,
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
					'お客様が、問い合わせの開始するために使用するチャンネルを指定してください。'
				)
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(true)
		),

	run: async (client, interaction) => {
		try {
			// サポートチケットシステムのセットアップ処理
			// 各種カテゴリの準備
			const openTicketCategoryId = process.env.OPEN_TICKET_CATEGORY_ID;
			const supportRoleId = process.env.SUPPORT_ROLE_ID;
			const closedTicketCategoryName = process.env.CLOSED_TICKET_CATEGORY_NAME;
			if (
				!openTicketCategoryId ||
				!supportRoleId ||
				!closedTicketCategoryName
			) {
				return interaction.reply({
					content:
						'BOTの環境変数が正しく設定されていません。.envファイルを確認してください。',
					flags: MessageFlags.Ephemeral,
				});
			}

			// embedを作成
			const embed = new EmbedBuilder()
				.setTitle('🎫お問い合わせ🎫')
				.setDescription(
					'質問・要望・バグ報告がある場合は下のボタンを押してください。\nサポートチームが対応いたします。'
				)
				.setColor(0x00eaff)
				.setFooter({ text: '↓ここをクリックして始めてください↓' });

			// buttonを作成
			const button = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId('support')
					.setLabel('お問い合わせを始める')
					.setStyle(ButtonStyle.Primary)
					.setEmoji('🎫')
			);

			//embedとbutton送信
			const contactUsChannel = interaction.options.getChannel('channel');
			await contactUsChannel.send({
				embeds: [embed],
				components: [button],
			});
		} catch (err) {
			console.log(err);
		}
	},
};
