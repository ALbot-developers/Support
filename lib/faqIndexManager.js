class faqIndexManager {
	/**
	 * FAQの目次を生成する関数
	 * @param {Object} client - Discordクライアントオブジェクト
	 * @param {String} [category] - FAQのカテゴリ
	 * @returns {Object|null} - 生成されたFAQ目次オブジェクト。エラー時はnullを返す
	 * 戻り値の構造:
	 *  {
	 *   "カテゴリID": {
	 *     categoryNameJP: "カテゴリ名（日本語）",
	 *     faqs: {
	 *       1: { title: "FAQ名", messageId: "DiscordメッセージID" },
	 *       2: { title: "FAQ名", messageId: "DiscordメッセージID" },
	 *       ...
	 *     }
	 *   },
	 *   "別のカテゴリID": { ... }
	 * }
	 * ※ categoryパラメータが指定された場合は、そのカテゴリのみを含むオブジェクトを返す
	 */
	static async fullIndexGenerator(client, category = null) {
		try {
			// FAQが書かれているチャンネルを取得
			const faqChannelId = process.env.FAQ_CHANNEL_ID;
			const faqChannel = client.channels.cache.get(faqChannelId);
			if (!faqChannel) {
				return null;
			}

			// FAQメッセージの取得
			const messages = await faqChannel.messages.fetch({ limit: 100 });
			// FAQチャンネルのメッセージ量が100件を超える場合は、わざと失敗扱いする
			if (messages.size >= 100) return null;

			// カテゴリごとにFAQをフィルタリング
			let faqList = {};
			let currentCategory = null;
			// メッセージを古い順に処理するためにソート
			const sortedMessages = Array.from(messages.values()).sort(
				(a, b) => a.createdTimestamp - b.createdTimestamp,
			);

			sortedMessages.forEach((message) => {
				// カテゴリーのインデックスの場合は新しい要素を作成
				if (message.content.startsWith('# ')) {
					const faqCategory = message.content.split('(ID: ')[1].split(')')[0];
					// カテゴリが既に存在しない場合のみ作成
					if (!faqList[faqCategory]) {
						faqList[faqCategory] = {
							categoryNameJP:
								message.content.split('# ')[1].split('(ID: ')[0] || '未分類',
							faqs: {},
						};
					}
					currentCategory = faqCategory;
				} else if (message.content.startsWith('## ')) {
					// カテゴリが設定されていない場合はスキップ
					if (!currentCategory || !faqList[currentCategory]) return;

					// FAQの内容をパースしてリストに追加
					const title = message.content.split('\n')[0].split('## ')[1];
					const messageId = message.id;
					// 現在のカテゴリの小見出しの数を数えて、次の連番を決定
					const index = Object.keys(faqList[currentCategory].faqs).length + 1;
					faqList[currentCategory].faqs[index] = {
						title: title,
						messageId: messageId,
					};
				}
			});

			// categoryフィルターを適用して、returnする
			if (category) {
				if (faqList[category]) {
					const filteredFaqList = {};
					filteredFaqList[category] = faqList[category];
					faqList = filteredFaqList;
				} else {
					// 指定されたカテゴリが存在しない場合は空のオブジェクトを返す
					faqList = {};
				}
			}
			return faqList;
		} catch (err) {
			console.log(`Error in fullIndexGenerator: ${err}`);
			return null;
		}
	}

	// FAQの目次の見出しだけを抽出する関数
	static async indexHeaderGenerator(client, category = null) {
		try {
			const faqIndex = await this.fullIndexGenerator(client, category);
			if (!faqIndex) return null;
			const headings = {};
			for (const catId in faqIndex) {
				headings[catId] = faqIndex[catId].categoryNameJP;
			}
			return headings;
		} catch (err) {
			console.log(`Error in indexHeaderGenerator: ${err}`);
			return null;
		}
	}
}

module.exports = faqIndexManager;
