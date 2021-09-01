import os

import discord
from discord.ext import commands
from dotenv import load_dotenv


class SupportBot(commands.Bot):
    def __init__(self, command_prefix):
        super().__init__(
            command_prefix=command_prefix,
            intents=discord.Intents.all(),
            allowed_mentions=discord.AllowedMentions(
                everyone=False, roles=False, users=True
            ),
        )
        self.remove_command('help')

    async def on_ready(self):
        return


if __name__ == "__main__":
    load_dotenv()
    bot = SupportBot(command_prefix="T.")
    bot.run(os.environ["TOKEN"])
