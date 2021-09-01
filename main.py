import os

import discord
from discord.ext import commands
from dotenv import load_dotenv

from libs import ThreadPanelView


class SupportBot(commands.Bot):
    def __init__(self, command_prefix):
        super().__init__(
            command_prefix=command_prefix,
            intents=discord.Intents.all(),
            allowed_mentions=discord.AllowedMentions(
                everyone=False, roles=False, users=True
            ),
        )
        self.remove_command("help")
        self.restarted = False

    async def on_ready(self):
        if self.restarted:
            return
        self.restarted = True
        await self.thread_init()
        print("ready")

    async def thread_init(self):
        root_channel = self.get_channel(int(os.environ["THREAD_ROOT_CHANNEL_ID"]))
        async for message in root_channel.history():
            if message.author.id != self.user.id:
                continue
            await message.delete()
        view = await ThreadPanelView(self, root_channel).setup()
        await root_channel.send(**view.build())


if __name__ == "__main__":
    print("starting")
    load_dotenv()
    bot = SupportBot(command_prefix="T.")
    bot.run(os.environ["TOKEN"])
