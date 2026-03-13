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
	 * FAQアイテムをMarkdown形式のリンク付きテキストに整形する
	 * @param {Object[]} faqs - FAQ項目の配列
	 * @param {Object} faqChannel - Discordチャンネルオブジェクト
	 * @returns {String} - Markdown形式のリンク付きテキスト
	 * @private
	 */
	static _buildFaqLinks(faqs, faqChannel) {
		return Object.values(faqs)
			.map((faq) => {
				const link = this._buildMessageLink(faqChannel, faq.messageId);
				return `- [${faq.title}](${link})`;
			})
			.join('\n')
			.concat('\n');
	}

	/**
	 * FAQインデックスをMarkdown文字列に整形する
	 * @param {Object} faqIndex - FAQインデックス
	 * @param {Object} faqChannel - Discordチャンネルオブジェクト
	 * @param {String} [categoryId] - FAQのカテゴリID（オプション）。指定した場合、そのカテゴリのみを整形
	 * @returns {String}
	 * @private
	 */
	static _formatAsString(faqIndex, faqChannel, categoryId = null) {
		return Object.entries(faqIndex)
			.filter(([id]) => !categoryId || id === categoryId)
			.map(([, categoryData]) => {
				const faqLinks = this._buildFaqLinks(categoryData.faqs, faqChannel);
				return `### ${categoryData.title}\n${faqLinks}`;
			})
			.join('');
	}

	/**
	 * FAQインデックスをオブジェクト形式に整形する
	 * @param {Object} faqIndex - FAQインデックス
	 * @param {Object} faqChannel - Discordチャンネルオブジェクト
	 * @param {String} [faqCategoryId] - FAQのカテゴリID（オプション）。指定した場合、そのカテゴリのみを整形
	 * @returns {Object}
	 * @private
	 */
	static async _formatAsObject(faqIndex, faqChannel, faqCategoryId = null) {
		// 全てのカテゴリを取得
		if (!faqCategoryId) {
			return {
				id: 'all',
				faqs: this._formatAsString(faqIndex, faqChannel),
			};
		}

		// 特定のカテゴリを取得
		const categoryData = faqIndex[faqCategoryId];
		if (!categoryData) {
			return { id: faqCategoryId, title: '', faqs: '' };
		}

		const faqsText = this._buildFaqLinks(categoryData.faqs, faqChannel);
		return {
			id: faqCategoryId,
			title: categoryData.title,
			faqs: faqsText,
		};
	}

	/**
	 * メッセージからカテゴリまたはFAQ項目を処理し、FAQリストに追加する
	 * @param {Object} message - Discordメッセージオブジェクト
	 * @param {Object} faqList - FAQリストオブジェクト
	 * @param {Object} state - 現在のカテゴリ状態オブジェクト
	 * @private
	 */
	static _processMessage(message, faqList, state) {
		if (message.content.startsWith('# ')) {
			const categoryInfo = this._parseCategoryHeader(message.content);
			if (categoryInfo && !faqList[categoryInfo.id]) {
				faqList[categoryInfo.id] = {
					title: categoryInfo.title,
					description: categoryInfo.description,
					faqs: {},
				};
				state.currentCategory = categoryInfo.id;
			}
		} else if (
			message.content.startsWith('## ') &&
			state.currentCategory &&
			faqList[state.currentCategory]
		) {
			const title = this._parseFaqItem(message.content);
			if (title) {
				const index =
					Object.keys(faqList[state.currentCategory].faqs).length + 1;
				faqList[state.currentCategory].faqs[index] = {
					title,
					messageId: message.id,
				};
			}
		}
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
			const faqChannel = this._getFaqChannel(client);
			if (!faqChannel) {
				console.error(
					'Error in faqIndexManager.build: FAQチャンネルが見つかりません',
				);
				return null;
			}

			const messages = await faqChannel.messages.fetch({ limit: 100 });
			if (messages.size >= 100) {
				console.warn(
					'Warning in faqIndexManager.build: メッセージが100件以上存在します',
				);
				return null;
			}

			const faqList = {};
			const state = { currentCategory: null };
			const sortedMessages = Array.from(messages.values()).sort(
				(a, b) => a.createdTimestamp - b.createdTimestamp,
			);

			sortedMessages.forEach((message) =>
				this._processMessage(message, faqList, state),
			);

			return category
				? faqList[category]
					? { [category]: faqList[category] }
					: {}
				: faqList;
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
	 * @param {typeof} type - 整形のタイプ（ String または Object ）。デフォルトはString。
	 * @param {String} [categoryId] - FAQのカテゴリID（オプション）。指定した場合、そのカテゴリのみを整形
	 * @returns {Promise<String|Object|null>} - Markdown形式のテキストまたはオブジェクト。エラー時はnullを返す
	 */
	static async format(client, type = String, categoryId = null) {
		try {
			const faqIndex = await this.build(client, categoryId);
			if (!faqIndex || Object.keys(faqIndex).length === 0) {
				return null;
			}

			const faqChannel = this._getFaqChannel(client);
			if (!faqChannel) {
				console.error(
					'Error in faqIndexManager.format: FAQチャンネルが見つかりません',
				);
				return null;
			}

			const formatters = {
				[String]: () => this._formatAsString(faqIndex, faqChannel, categoryId),
				[Object]: () => this._formatAsObject(faqIndex, faqChannel, categoryId),
			};

			const formatter = formatters[type];
			if (!formatter) {
				console.error(
					`Error in faqIndexManager.format: 未対応のtypeが指定されました: ${type}`,
				);
				return null;
			}

			return await formatter();
		} catch (err) {
			console.error(`Error in faqIndexManager.format: ${err}`);
			return null;
		}
	}
}

module.exports = faqIndexManager;
