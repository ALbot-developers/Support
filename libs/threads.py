from discord.ext.ui import Component, Button, View, Message
from discord.ext import commands
import discord
import asyncio
import os


class ThreadPanelView(View):
    def __init__(self, bot, channel):
        super().__init__(bot)
        self.bot = bot
        self.channel = channel

    async def open_thread(self, interaction, embed):
        thread = await self.channel.create_thread(
            name=interaction.user.name, type=discord.ChannelType.public_thread
        )
        view = await ThreadView(self.bot, thread).setup()
        message = view.build()
        message["embed"] = embed
        await thread.send(**message)
        await thread.add_user(interaction.user)
        async for message in self.channel.history():
            if len(message.embeds) == 0:
                await message.delete()

    async def bugs(self, interaction):
        embed = discord.Embed(title="バグ報告スレッド", description="バグ報告を書き込んでください。")
        await self.open_thread(interaction, embed)

    async def requests(self, interaction):
        embed = discord.Embed(title="要望スレッド", description="要望を書き込んでください。")
        await self.open_thread(interaction, embed)

    async def question(self, interaction):
        embed = discord.Embed(title="質問スレッド", description="質問を書き込んでください。")
        await self.open_thread(interaction, embed)

    async def body(self):
        embed = discord.Embed(title="お問い合わせを発行", description="お問い合わせのためのスレッドを発行します。")
        embed.add_field(name="バグ報告", value="バグを報告するスレッド", inline=False)
        embed.add_field(name="要望", value="要望を書き込むスレッド", inline=False)
        embed.add_field(name="質問", value="このBotに関する質問のスレッド", inline=False)
        return Message(
            embed=embed,
            component=Component(
                items=[
                    [
                        Button("バグ等報告")
                        .on_click(self.bugs)
                        .style(discord.ButtonStyle.blurple),
                        Button("要望")
                        .on_click(self.requests)
                        .style(discord.ButtonStyle.blurple),
                        Button("質問")
                        .on_click(self.question)
                        .style(discord.ButtonStyle.blurple),
                    ]
                ]
            ),
        )


class ThreadView(View):
    def __init__(self, bot, thread):
        super().__init__(bot)
        self.bot = bot
        self.thread = thread

    async def finish(self, interaction):
        await self.thread.edit(archived=True, locked=True)

    async def body(self):
        return Message(
            component=Component(
                items=[
                    [
                        Button("終了")
                        .on_click(self.finish)
                        .style(discord.ButtonStyle.danger),
                    ]
                ]
            )
        )
