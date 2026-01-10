const {
	InteractionType,
	ApplicationCommandType,
	MessageFlags,
} = require('discord.js');
const fs = require('fs');

module.exports = async (client, interaction) => {
	try {
		// コマンド等は、サポートサーバー内でのみ利用できるようにする
		if (
			!interaction?.guild &&
			interaction.guildId !== process.env.SUPPORT_GUILD_ID
		) {
			return interaction.reply({
				content: 'このコマンドは特定のサーバー内でのみ使用できます。',
				flags: MessageFlags.Ephemeral,
			});
		} else {
			// スラッシュコマンドの詳しい処理は、コマンドのファイル側で行う
			if (interaction?.type === InteractionType.ApplicationCommand) {
				fs.readdir('./commands', (err, files) => {
					if (err) throw err;
					files.forEach(async (f) => {
						const props = require(`../commands/${f}`);
						const propsJson = props.data.toJSON();

						// If propsJson.type is undefined, it means the command file is slash command
						if (propsJson.type === undefined) {
							propsJson.type = ApplicationCommandType.ChatInput;
						}

						// Handle command interaction
						if (
							interaction.commandName === propsJson.name &&
							interaction.commandType === propsJson.type
						) {
							try {
								await props.run(client, interaction);
								return;
							} catch (err) {
								console.error(`[Error] Command Execution: ${err}`);
								return interaction.reply({
									content: '❌ コマンドの実行中にエラーが発生しました。',
									flags: MessageFlags.Ephemeral,
								});
							}
						}
					});
				});
			}

			// ボタンを押した際のインタラクションの処理
      if (interaction?.type === InteractionType.MessageComponent) {
        // 必要に応じてボタンのインタラクション処理のロジックを追加
			}
		}
	} catch (err) {
		console.error(`[Error] interactionCreate Event: ${err}`);
	}
};
