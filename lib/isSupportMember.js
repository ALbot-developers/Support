const supportMemberRoleId = process.env.SUPPORT_ROLE_ID;

module.exports = (client, userId) => {
	const user = client.guilds.cache
		.get(process.env.SUPPORT_GUILD_ID)
		.members.cache.get(userId);

	if (!user) return false;

	return user.roles.cache.has(supportMemberRoleId);
};
