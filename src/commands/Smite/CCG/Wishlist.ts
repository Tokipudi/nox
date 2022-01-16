import { createPlayerIfNotExists } from '@lib/database/utils/PlayersUtils';
import { disconnectWishlistSkin, getSkinOwner, getSkinWishlist } from '@lib/database/utils/SkinsUtils';
import { PlayerNotLoadedError } from '@lib/structures/errors/PlayerNotLoadedError';
import { NoxCommand } from '@lib/structures/NoxCommand';
import { NoxCommandOptions } from '@lib/structures/NoxCommandOptions';
import { getBackButton, getForwardButton, getSelectButton } from '@lib/utils/PaginationUtils';
import { generateSkinEmbed } from '@lib/utils/smite/SkinsPaginationUtils';
import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, ChatInputCommand } from '@sapphire/framework';
import { CommandInteraction, Message, MessageActionRow, Snowflake, User } from 'discord.js';

@ApplyOptions<NoxCommandOptions>({
    description: 'Shows your wishlist or the wishlist of another player.',
    preconditions: [
        'targetIsNotABot',
        'playerExists',
        'targetPlayerExists',
        'targetIsNotBanned'
    ]
})
export class Wishlist extends NoxCommand {

    public override async chatInputRun(interaction: CommandInteraction, context: ChatInputCommand.RunContext) {
        const { member, guildId } = interaction;
        const author = member.user as User;

        let user = interaction.options.getUser('user');
        if (user == null) {
            user = author;
        }

        const player = await createPlayerIfNotExists(user.id, guildId);
        if (player == null) throw new PlayerNotLoadedError({
            userId: user.id,
            guildId: guildId
        });

        const backButton = getBackButton();
        const forwardButton = getForwardButton();
        const selectButton = getSelectButton('Remove', 'DANGER');

        let skins = await getSkinWishlist(player.id);
        if (!skins || skins.length === 0) {
            return user.id === author.id
                ? interaction.reply({
                    content: 'Your wishlist is empty!',
                    ephemeral: true
                })
                : interaction.reply({
                    content: `${user}'s wishlist is empty!`,
                    ephemeral: true
                })
        }

        skins.length <= 1
            ? forwardButton.setDisabled(true)
            : forwardButton.setDisabled(false);

        let currentIndex = 0
        const reply = await interaction.reply({
            content: `${user}'s wishlist:`,
            embeds: [await this.generateGodSkinEmbed(skins, currentIndex, guildId)],
            components: [
                new MessageActionRow({
                    components: user.id === author.id
                        ? [...([backButton]), ...([selectButton]), ...([forwardButton])]
                        : [...([backButton]), ...([forwardButton])]
                })
            ],
            fetchReply: true
        }) as Message;

        const collector = reply.createMessageComponentCollector({
            filter: ({ user }) => user.id === author.id
        });
        collector.on('collect', async interaction => {
            if (interaction.customId === backButton.customId || interaction.customId === forwardButton.customId) {
                // Increase/decrease index
                switch (interaction.customId) {
                    case backButton.customId:
                        if (currentIndex > 0) {
                            currentIndex -= 1;
                        }
                        break;
                    case forwardButton.customId:
                        if (currentIndex < skins.length - 1) {
                            currentIndex += 1;
                        }
                        break;
                }

                // Disable the buttons if they cannot be used
                forwardButton.disabled = currentIndex === skins.length - 1;
                backButton.disabled = currentIndex === 0;

                // Respond to interaction by updating message with new embed
                await interaction.update({
                    embeds: [await this.generateGodSkinEmbed(skins, currentIndex, guildId)],
                    components: [
                        new MessageActionRow({
                            components: user.id === author.id
                                ? [...([backButton]), ...([selectButton]), ...([forwardButton])]
                                : [...([backButton]), ...([forwardButton])]
                        })
                    ]
                })
            } else if (interaction.customId === selectButton.customId && user.id === author.id) {
                let skinName = interaction.message.embeds[0].title;

                let skinId = 0;
                for (let i = 0; i < skins.length; i++) {
                    if (skins[i].name === skinName) {
                        skinId = skins[i].id;
                        break;
                    }
                }

                let playerWishedSkin = await disconnectWishlistSkin(skinId, player.id);
                this.container.logger.info(`The card ${skinName}<${playerWishedSkin.skinId}> was removed from the wishlist of ${user.username}#${user.discriminator}<${user.id}>!`);
                skins = await getSkinWishlist(player.id);

                if (skins == null || skins.length === 0) {
                    collector.stop();
                } else {
                    // Reload the skins embed
                    if (currentIndex > 0) {
                        currentIndex -= 1;
                    }
                    // Disable the buttons if they cannot be used
                    forwardButton.disabled = currentIndex === skins.length - 1;
                    backButton.disabled = currentIndex === 0;

                    await interaction.update({
                        embeds: [await this.generateGodSkinEmbed(skins, currentIndex, guildId)],
                        components: [
                            new MessageActionRow({
                                components: [...([backButton]), ...([selectButton]), ...([forwardButton])]
                            })
                        ]
                    })
                }
            }
        });

        collector.on('end', collected => {
            if (skins == null || skins.length === 0) {
                reply.edit({
                    content: 'Your wishlist is empty!',
                    embeds: [],
                    components: []
                });
            }
        });
    }

    public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
        registry.registerChatInputCommand({
            name: this.name,
            description: this.description,
            options: [
                {
                    name: 'user',
                    description: 'The user you want to check the wishlist of. Defaults to the current user if not specified.',
                    required: false,
                    type: 'USER'
                }
            ]
        }, {
            guildIds: this.guildIds
        });
    }

    protected async generateGodSkinEmbed(skins, index, guildId: Snowflake) {
        const embed = generateSkinEmbed(skins, index);

        const owner = await getSkinOwner(skins[index].id, guildId);
        if (owner !== null) {
            const user = await this.container.client.users.fetch(owner.player.user.id);
            if (user === null) {
                embed.addField('Owner', `${owner.player.user.id}`);
            } else {
                embed.addField('Owner', `${user}`);
            }
        }

        return embed;
    }
}