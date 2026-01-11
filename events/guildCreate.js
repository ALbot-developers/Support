const {
	PermissionsBitField,
	EmbedBuilder,
	AuditLogEvent,
} = require('discord.js');

module.exports = async (client, guild) => {
	// ギルド参加時の処理
	// 送れそうなら、招待者にDMを送る
	try {
		if (
			guild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)
		) {
			const fetchedLogs = await guild.fetchAuditLogs({
				type: AuditLogEvent.BotAdd,
				limit: 1,
			});
			const inviterInfo = fetchedLogs.entries.first().executor;
			const inviter = await client.users.fetch(inviterInfo.id);

			const embed = new EmbedBuilder()
				.setTitle('⚠️ 重要なお知らせ')
				.setDescription(
					'いつも、ALBOTをご利用いただき、ありがとうございます。\n\nご招待いただいたところ、大変恐縮ですが、__**このBOTが招待されたサーバーでは、本BOTをご利用いただけません**__。\n\nご理解・ご協力のほど、よろしくお願いします。\n\n`※ご不明な点がございましたら、サポートサーバーでお尋ねください。`'
				)
				.setColor(0xff0000)
				.setFooter({
					iconURL:
						'https://cdn.discordapp.com/avatars/727508841368911943/5c6cf75e3f3daea9c00c2aaf1dc4698f.png',
					text: '©ALBOT',
				});

			await inviter.send({ embeds: [embed] });
		}

		// 招待されたサーバーから退出(許可されていないサーバーのみ)
		const allowedGuildIds = process.env.ALLOWED_GUILD_IDS
			? process.env.ALLOWED_GUILD_IDS.split(',')
			: [];
		if (!allowedGuildIds.includes(guild.id)) {
			await guild.leave();
		}
	} catch (err) {
		void err; // エラーは無視する
	}
};
