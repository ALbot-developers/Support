class faqIndexManager {
	/**
	 * FAQチャンネルを取得する
	 * @param {Object} client - Discordクライアントオブジェクト
	 * @returns {Object|null} - FAQチャンネル。存在しない場合はnull
	 * @private
	 */
	static _getFaqChannel(client) {
		const faqChannelId = process.env.FAQ_CHANNEL_ID;
		return client.channels.cache.get(faqChannelId) || null;
	}

	/**
	 * カテゴリヘッダーからカテゴリ情報を抽出する
	 * @param {String} content - メッセージコンテンツ
	 * @returns {Object|null} - {id, title, description} または null
	 * @private
	 */
	static _parseCategoryHeader(content) {
		const match = content.match(/^# (.+)\(ID: (.+)\)/);
		if (!match) return null;

		const title = match[1].trim();
		const id = match[2].trim();
		const lines = content.split('\n');
		const description = lines[1]?.replace(/^-# /, '') || '';

		return { id, title, description };
	}

	/**
	 * FAQアイテムのタイトルを抽出する
	 * @param {String} content - メッセージコンテンツ
	 * @returns {String|null} - FAQタイトルまたはnull
	 * @private
	 */
	static _parseFaqItem(content) {
		const match = content.match(/^## (.+)/);
		return match ? match[1].trim() : null;
	}

	/**
	 * DiscordメッセージリンクURLを生成する
	 * @param {Object} channel - Discordチャンネルオブジェクト
	 * @param {String} messageId - メッセージID
	 * @returns {String} - DiscordメッセージリンクURL
	 * @private
	 */
	static _buildMessageLink(channel, messageId) {
		return `https://discord.com/channels/${channel.guild.id}/${channel.id}/${messageId}`;
	}

	/**
	 * FAQの目次を生成する関数
	 * FAQチャンネルからメッセージを取得し、カテゴリごとに整理されたFAQ目次オブジェクトを生成します。
	 *
	 * @param {Object} client - Discordクライアントオブジェクト
	 * @param {String} [category] - FAQのカテゴリID（オプション）。指定した場合、そのカテゴリのみを返す
	 * @returns {Promise<Object|null>} - 生成されたFAQ目次オブジェクト。エラー時はnullを返す
	 *
	 * 戻り値の構造:
	 * {
	 *   "カテゴリID": {
	 *     title: "カテゴリ名",
	 *     description: "カテゴリの説明文",
	 *     faqs: {
	 *       1: { title: "FAQ名", messageId: "DiscordメッセージID" },
	 *       2: { title: "FAQ名", messageId: "DiscordメッセージID" },
	 *       ...
	 *     }
	 *   },
	 *   "別のカテゴリID": { ... }
	 * }
	 *
	 * FAQチャンネルのメッセージ形式:
	 * - カテゴリ見出し: "# カテゴリ名(ID: category_id)\n-# カテゴリの説明"
	 * - FAQ項目: "## FAQ質問タイトル"
	 *
	 * ※ categoryパラメータが指定された場合は、そのカテゴリのみを含むオブジェクトを返す
	 * ※ FAQチャンネルのメッセージが100件以上の場合はnullを返す
	 */
	static async build(client, category = null) {
		try {
			// FAQが書かれているチャンネルを取得
			const faqChannel = this._getFaqChannel(client);
			if (!faqChannel) {
				console.error(
					'Error in faqIndexManager.build: FAQチャンネルが見つかりません',
				);
				return null;
			}

			// FAQメッセージの取得
			const messages = await faqChannel.messages.fetch({ limit: 100 });
			// FAQチャンネルのメッセージ量が100件を超える場合は、わざと失敗扱いする
			if (messages.size >= 100) {
				console.warn(
					'Warning in faqIndexManager.build: メッセージが100件以上存在します',
				);
				return null;
			}

			// カテゴリごとにFAQをフィルタリング
			const faqList = {};
			let currentCategory = null;

			// メッセージを古い順に処理するためにソート
			const sortedMessages = Array.from(messages.values()).sort(
				(a, b) => a.createdTimestamp - b.createdTimestamp,
			);

			for (const message of sortedMessages) {
				// カテゴリーヘッダーの処理
				if (message.content.startsWith('# ')) {
					const categoryInfo = this._parseCategoryHeader(message.content);
					if (categoryInfo && !faqList[categoryInfo.id]) {
						faqList[categoryInfo.id] = {
							title: categoryInfo.title,
							description: categoryInfo.description,
							faqs: {},
						};
						currentCategory = categoryInfo.id;
					}
				}
				// FAQ項目の処理
				else if (message.content.startsWith('## ')) {
					// カテゴリが設定されていない場合はスキップ
					if (!currentCategory || !faqList[currentCategory]) continue;

					const title = this._parseFaqItem(message.content);
					if (title) {
						// 現在のカテゴリの小見出しの数を数えて、次の連番を決定
						const index = Object.keys(faqList[currentCategory].faqs).length + 1;
						faqList[currentCategory].faqs[index] = {
							title,
							messageId: message.id,
						};
					}
				}
			}

			// categoryフィルターを適用
			if (category) {
				return faqList[category] ? { [category]: faqList[category] } : {};
			}

			return faqList;
		} catch (err) {
			console.error(`Error in faqIndexManager.build: ${err}`);
			return null;
		}
	}

	/**
	 * FAQカテゴリ情報を取得
	 * カテゴリIDと名前、説明のマッピングを返します。
	 *
	 * @param {Object} client - Discordクライアントオブジェクト
	 * @param {String} [category] - FAQのカテゴリID（オプション）。指定した場合、そのカテゴリのみを返す
	 * @returns {Promise<Object|null>} - カテゴリ情報。エラー時はnullを返す
	 *
	 * 戻り値の例:
	 * {
	 *   "bug_bot": { title: "不具合のご報告(BOT)", description: "..." },
	 *   "subscription": { title: "サブスクリプション", description: "..." }
	 *   ...
	 * }
	 */
	static async getCategories(client, category = null) {
		try {
			const faqIndex = await this.build(client, category);
			if (!faqIndex) return null;

			const categories = {};
			for (const [catId, catData] of Object.entries(faqIndex)) {
				categories[catId] = {
					title: catData.title,
					description: catData.description,
				};
			}
			return categories;
		} catch (err) {
			console.error(`Error in faqIndexManager.getCategories: ${err}`);
			return null;
		}
	}

	/**
	 * FAQインデックスを整形されたテキストに変換
	 * FAQをDiscordメッセージリンク付きのMarkdown形式に整形します。
	 *
	 * @param {Object} client - Discordクライアントオブジェクト
	 * @param {String} [categoryId] - FAQのカテゴリID（オプション）。指定した場合、そのカテゴリのみを整形
	 * @returns {Promise<String|Object|null>} - Markdown形式のテキストまたはオブジェクト。エラー時はnullを返す
	 */
	static async format(client, categoryId = null) {
		try {
			const faqIndex = await this.build(client, categoryId);
			if (!faqIndex || Object.keys(faqIndex).length === 0) {
				return null;
			}

			// FAQチャンネルを取得
			const faqChannel = this._getFaqChannel(client);
			if (!faqChannel) {
				console.error(
					'Error in faqIndexManager.format: FAQチャンネルが見つかりません',
				);
				return null;
			}

			if (categoryId) {
				// カテゴリーの指定がある場合はオブジェクト形式で返す
				const categoryData = faqIndex[categoryId];
				if (!categoryData) return null;

				let faqsText = '';
				for (const faq of Object.values(categoryData.faqs)) {
					const link = this._buildMessageLink(faqChannel, faq.messageId);
					faqsText += `- [${faq.title}](${link})\n`;
				}

				return {
					id: categoryId,
					title: categoryData.title,
					faqs: faqsText,
				};
			} else {
				// カテゴリーの指定がない場合はMarkdown文字列で返す
				let markdown = '';
				for (const [catId, categoryData] of Object.entries(faqIndex)) {
					markdown += `### ${categoryData.title}\n`;
					for (const faq of Object.values(categoryData.faqs)) {
						const link = this._buildMessageLink(faqChannel, faq.messageId);
						markdown += `- [${faq.title}](${link})\n`;
					}
				}
				return markdown;
			}
		} catch (err) {
			console.error(`Error in faqIndexManager.format: ${err}`);
			return null;
		}
	}
}

module.exports = faqIndexManager;
