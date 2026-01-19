const {
	ApplicationCommandType,
	MessageFlags,
	ChannelType,
	PermissionsBitField,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} = require('discord.js');
const isSupportMember = require('../lib/isSupportMember.js');
const discordLogTranscript = require('discord-html-transcripts');
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
			if (interaction?.isChatInputCommand()) {
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
			if (interaction?.isButton()) {
				// 必要に応じてボタンのインタラクション処理のロジックを追加
				const customId = interaction.customId;

				switch (customId) {
					case 'support': {
						// supportボタンが押されたときの処理
						const embed = new EmbedBuilder()
							.setTitle('報告の概要の選択')
							.setDescription(
								'以下のメニューから、報告したい内容を選択してください。\n当てはまるものが無い場合は「その他の質問」を選択してください。',
							)
							.setColor(0x00ffff);

						const dropdownMenu = new ActionRowBuilder().addComponents(
							new StringSelectMenuBuilder()
								.setCustomId('support_subject_select')
								.setPlaceholder('問い合わせの概要を選択してください')
								.setRequired(true)
								.setMinValues(1)
								.setMaxValues(1)
								.addOptions(
									new StringSelectMenuOptionBuilder()
										.setLabel('不具合のご報告(BOT)')
										.setDescription(
											'サブスクリプションに関係のないBOTの不具合のご報告など',
										)
										.setValue('bug_report_bot')
										.setEmoji('🔥'),
									new StringSelectMenuOptionBuilder()
										.setLabel('不具合のご報告(Webサイト)')
										.setDescription(
											'サブスクリプションに関係のないWebサイトの不具合のご報告など',
										)
										.setValue('bug_report_website')
										.setEmoji('🔥'),
									new StringSelectMenuOptionBuilder()
										.setLabel('サブスクリプションに関する問い合わせ')
										.setDescription(
											'サブスクリプションの購入・更新・キャンセルなどに関する問い合わせ',
										)
										.setValue('subscription_inquiry')
										.setEmoji('💳'),
									new StringSelectMenuOptionBuilder()
										.setLabel('その他の質問')
										.setDescription('その他の質問・要望・提案など')
										.setValue('question')
										.setEmoji('❓'),
								),
						);

						await interaction.reply({
							embeds: [embed],
							components: [dropdownMenu],
							flags: MessageFlags.Ephemeral,
						});
						break;
					}
					case 'openTicket': {
						// openTicketボタンが押されたときの処理
						await interaction.deferReply({
							flags: MessageFlags.Ephemeral,
						});

						const customerUserId = interaction.user.id;
						const supportChannel = await interaction.guild.channels.cache.find(
							(channel) =>
								//close済みのチケットはトピックが「closed: 000000」のようになるので、ここでは完全一致を使って確認する
								channel.topic === customerUserId &&
								channel.type === ChannelType.GuildText,
						);
						// 既にサポートチケットがある場合
						if (supportChannel) {
							return interaction.editReply({
								content: `１人１チャンネルとさせていただいております。\n<#${supportChannel.id}>が既に存在しますので、そちらをご利用ください。`,
								flags: MessageFlags.Ephemeral,
							});
						}

						// サポート対応用のカテゴリーを取得
						const categoryId = process.env.OPEN_TICKET_CATEGORY_ID;
						const openTicketCategory =
							interaction.guild.channels.cache.get(categoryId);
						// サポート対応用のカテゴリーが見つからなかった場合
						if (!openTicketCategory)
							return interaction.channel.send(
								'❌ サポート対応用のカテゴリーが見つかりませんでした。BOTおよびサーバーの管理者は以下の項目の確認をお願いします。\n- 環境変数 `OPEN_TICKET_CATEGORY_ID` が正しいか\n- サーバーにサポート対応用のカテゴリーが存在するか\n- BOTに適切な権限が付与されているか',
							);

						const customerUserName = interaction.user.username;
						interaction.guild.channels
							.create({
								name: `${customerUserName}様対応`,
								type: ChannelType.GuildText,
								permissionOverwrites: [
									{
										id: interaction.guild.roles.everyone,
										deny: [PermissionsBitField.Flags.ViewChannel],
									},
									{
										id: customerUserId,
										allow: [
											PermissionsBitField.Flags.ViewChannel,
											PermissionsBitField.Flags.ReadMessageHistory,
											PermissionsBitField.Flags.SendMessages,
											PermissionsBitField.Flags.AttachFiles,
											PermissionsBitField.Flags.AddReactions,
										],
									},
								],
								parent: openTicketCategory.id,
								topic: customerUserId,
							})
							.then(async (channel) => {
								// サポートチケットの作成に成功した場合
								const embed = new EmbedBuilder()
									.setTitle('📪お問い合わせありがとうございます。')
									.setDescription('ご用件をお書きください。')
									.setFooter({
										text: '業務連絡 ｜ 管理者は、以下のボタンでこのチャンネルを管理できます。',
									})
									.setColor(0x1f6e00);
								const menuButton = new ActionRowBuilder().addComponents(
									new ButtonBuilder()
										.setCustomId('menu')
										.setLabel('メニューを開く')
										.setStyle(ButtonStyle.Primary)
										.setEmoji('📚'),
								);
								const guideMessage = await channel.send({
									content: `<@${customerUserId}>様へ`,
									embeds: [embed],
									components: [menuButton],
								});

								// 案内メッセージをサポートチャンネルにピン止め
								guideMessage.pin();

								// サポートチケットの作成完了メッセージを送信
								await interaction.editReply({
									content: `${channel}にてお伺い致します。そちらのチャンネルへご移動ください。`,
									flags: MessageFlags.Ephemeral,
								});
							})
							.catch(async (err) => {
								await interaction.channel.send(
									'サポートチケット作成時にエラーが発生しました。管理者が対応いたしますので、しばらくお待ちください。',
								);
								console.log(err);
								return;
							});
						break;
					}
					case 'menu': {
						// menuボタンが押されたときの処理
						if (isSupportMember(client, interaction.member.user.id)) {
							const options = new ActionRowBuilder().addComponents(
								new ButtonBuilder()
									.setCustomId('transcript')
									.setLabel('履歴を保存する')
									.setStyle(ButtonStyle.Secondary)
									.setEmoji('📥'),
								new ButtonBuilder()
									.setCustomId('close')
									.setLabel('サポートを終了する')
									.setStyle(ButtonStyle.Success)
									.setEmoji('🔒'),
								new ButtonBuilder()
									.setCustomId('reopen')
									.setLabel('サポートを再開する')
									.setStyle(ButtonStyle.Success)
									.setEmoji('🔓'),
								new ButtonBuilder()
									.setCustomId('delete')
									.setLabel('チケットを削除する')
									.setStyle(ButtonStyle.Danger)
									.setEmoji('⛔'),
								new ButtonBuilder()
									.setCustomId('cancel')
									.setLabel('メニューを閉じる')
									.setStyle(ButtonStyle.Secondary),
							);
							const customerUserId = interaction.channel.topic.replace(
								/[^0-9]/g,
								'',
							);
							const embed = new EmbedBuilder()
								.setTitle('📚｜メニュー')
								.setDescription(
									`「📥保存する」で、このチャンネルのチャット履歴をhtml形式で保存できます。\n ※__**直近の100メッセージに限られます**__。\n「🔒ロックをする」で、<@${customerUserId}> の閲覧権限を**剥奪**します\n「🔓ロック解除」で、<@${customerUserId}> の閲覧権限を**再度付与**します。\n「⛔削除」で、このチャンネルを完全に削除します。`,
								)
								.setColor(0x40ffcc);
							await interaction.reply({
								embeds: [embed],
								components: [options],
							});
						} else {
							//管理者権限無いとき
							await interaction.reply({
								content: 'このボタンは管理者のみ有効です',
								flags: MessageFlags.Ephemeral,
							});
						}
						break;
					}
					case 'transcript': {
						// transcriptボタンが押されたときの処理
						if (isSupportMember(client, interaction.member.user.id)) {
							interaction.message.delete();

							const customerUserId = interaction.channel.topic.substr(6);

							// Must be awaited
							const attachment = await discordLogTranscript.createTranscript(
								interaction.channel,
								{
									limit: -1,
									filename: `supportLogFor_${customerUserId}.html`,
								},
							);

							const embed = new EmbedBuilder()
								.setTitle('📤｜出力しました')
								.setDescription(
									'__**必ず、ご自身のデバイスにダウンロードしてください！**__',
								)
								.setColor(0x20ff20);
							const cancelButton = new ActionRowBuilder().addComponents(
								new ButtonBuilder()
									.setCustomId('cancel')
									.setLabel('閉じる')
									.setStyle(ButtonStyle.Secondary),
							);

							await interaction.reply({
								embeds: [embed],
								files: [attachment],
								components: [cancelButton],
							});
						} else {
							//管理者権限無いとき
							await interaction.reply({
								content: 'このボタンは管理者のみ有効です',
								flags: MessageFlags.Ephemeral,
							});
						}
						break;
					}
					case 'close': {
						// closeボタンが押されたときの処理
						if (isSupportMember(client, interaction.member.user.id)) {
							const customerUserId = interaction.channel.topic;
							if (!customerUserId.startsWith('closed:')) {
								await interaction.channel.setTopic(`closed:${customerUserId}`);
								await interaction.channel.permissionOverwrites.set(
									[
										{
											id: customerUserId,
											deny: [PermissionsBitField.Flags.ViewChannel], // 許可しない権限
											type: 'member', // role or member
										},
									],
									'closeしたため',
								);

								interaction.message.delete();

								const closedEmbed = new EmbedBuilder()
									.setTitle('🔒｜サポートを終了しました！')
									.setColor(0x00ff00);
								interaction.reply({
									embeds: [closedEmbed],
								});
							} else {
								await interaction.reply({
									content: 'すでにCloseされています',
									flags: MessageFlags.Ephemeral,
								});
							}
						} else {
							//管理者権限無いとき
							await interaction.reply({
								content: 'このボタンは管理者のみ有効です',
								flags: MessageFlags.Ephemeral,
							});
						}
						break;
					}
					case 'reopen': {
						// reopenボタンが押されたときの処理
						if (isSupportMember(client, interaction.member.user.id)) {
							if (interaction.channel.topic.startsWith('closed:')) {
								const customerUserId = interaction.channel.topic.replace(
									/[^0-9]/g,
									'',
								);
								interaction.channel.setTopic(customerUserId);
								interaction.channel.permissionOverwrites.set(
									[
										{
											id: customerUserId,
											allow: [
												PermissionsBitField.Flags.ViewChannel,
												PermissionsBitField.Flags.ReadMessageHistory,
												PermissionsBitField.Flags.SendMessages,
												PermissionsBitField.Flags.AttachFiles,
												PermissionsBitField.Flags.AddReactions,
											], // 許可する権限
											type: 'member', // role or member
										},
									],
									'reopenしたため',
								);

								interaction.message.delete();

								const reopenedEmbed = new EmbedBuilder()
									.setTitle('🔓｜サポートを再開しました！')
									.setColor(0x20ff20);
								await interaction.channel.send({
									embeds: [reopenedEmbed],
								});
							} else {
								await interaction.reply({
									content: 'まだCloseされていません',
									flags: MessageFlags.Ephemeral,
								});
							}
						} else {
							//管理者権限無いとき
							await interaction.reply({
								content: 'このボタンは管理者のみ有効です',
								flags: MessageFlags.Ephemeral,
							});
						}
						break;
					}
					case 'delete': {
						// deleteボタンが押されたときの処理
						if (isSupportMember(client, interaction.member.user.id)) {
							interaction.message.delete();

							const deleteConfirmEmbed = new EmbedBuilder()
								.setTitle('⛔｜チャンネル削除確認')
								.setDescription(
									'本当にこのチャンネルを削除しますか？\nこの操作を実行すると、__**このチャンネルのログは永久に閲覧できなくなります**__。',
								)
								.setColor(0xff0000);
							const deleteConfirmButton = new ActionRowBuilder().addComponents(
								new ButtonBuilder()
									.setCustomId('cancel')
									.setLabel('やめる')
									.setStyle(ButtonStyle.Secondary),
								new ButtonBuilder()
									.setCustomId('delete_confirm')
									.setLabel('完全に削除する')
									.setStyle(ButtonStyle.Danger),
							);
							await interaction.channel.send({
								embeds: [deleteConfirmEmbed],
								components: [deleteConfirmButton],
							});
						} else {
							//管理者権限無いとき
							await interaction.reply({
								content: 'このボタンは管理者のみ有効です',
								flags: MessageFlags.Ephemeral,
							});
						}
						break;
					}
					case 'cancel': {
						// cancelボタンが押されたときの処理
						if (isSupportMember(client, interaction.member.user.id)) {
							await interaction.message.delete();
						} else {
							//管理者権限無いとき
							await interaction.reply({
								content: 'このボタンは管理者のみ有効です',
								flags: MessageFlags.Ephemeral,
							});
						}
						break;
					}
					case 'delete_confirm': {
						// delete_confirmボタンが押されたときの処理
						if (isSupportMember(client, interaction.member.user.id)) {
							await interaction.reply('まもなく削除されます…');
							const deleteChannelId = interaction.channel.id;
							const deleteChannel =
								interaction.guild.channels.cache.get(deleteChannelId);
							setTimeout(() => {
								deleteChannel
									.delete()
									.catch((err) => interaction.reply(`エラー:${err.message}`));
							}, 5000);
						} else {
							//管理者権限無いとき
							await interaction.reply({
								content: 'このボタンは管理者のみ有効です',
								flags: MessageFlags.Ephemeral,
							});
						}
						break;
					}
					default: {
						// 未知のカスタムIDの場合の処理
						await interaction.reply({
							content: '❌ 未知のボタンが押されました。',
							flags: MessageFlags.Ephemeral,
						});
						break;
					}
				}
			}
		}
	} catch (err) {
		console.error(`[Error] interactionCreate Event: ${err}`);
	}
};
