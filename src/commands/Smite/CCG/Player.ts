import { getPlayer } from '@lib/database/utils/PlayersUtils';
import { NoxCommand } from '@lib/structures/NoxCommand';
import { NoxCommandOptions } from '@lib/structures/NoxCommandOptions';
import { ApplyOptions } from '@sapphire/decorators';
import { Args } from '@sapphire/framework';
import { Message, MessageEmbed, User } from 'discord.js';

@ApplyOptions<NoxCommandOptions>({
    description: 'Shows a player\'s statistics.',
    detailedDescription: 'Shows a player\'s win/loss ratio, joining date and more.\nDefaults to the current user if no user is specified.',
    usage: '<@user>',
    examples: [
        '',
        '@User#1234'
    ],
    preconditions: ['PlayerExists']
})
export class Player extends NoxCommand {

    public async messageRun(message: Message, args: Args) {
        const { author, guildId } = message;
        const user: User = await args.pick('user').catch(() => author);

        const player = await getPlayer(user.id, guildId);

        if (!player) {
            return await message.reply(`${user} is not registered as a player yet!`);
        }

        let favoriteSkin = null;
        for (const i in player.playersSkins) {
            const playerSkin = player.playersSkins[i];
            if (playerSkin.isFavorite) {
                favoriteSkin = playerSkin.skin;
                break;
            }
        }

        const embed = new MessageEmbed()
            .setAuthor(`${user.username}#${user.discriminator}`, user.avatarURL())
            .setDescription(`Tokens: \`${player.tokens}\``)
            .setColor('DARK_PURPLE')
            .setThumbnail('https://static.wikia.nocookie.net/smite_gamepedia/images/5/5c/SmiteLogo.png/revision/latest/scale-to-width-down/150?cb=20180503190011')
            .setTimestamp(player.joinDate);

        if (favoriteSkin !== null) {
            embed.setImage(favoriteSkin.godSkinUrl);
        }

        embed.addField(
            'Cards',
            `Rolled: \`${player.rolls}\`\n` +
            `Claimed: \`${player.claimedCards}\`\n` +
            `Stolen: \`${player.cardsStolen}\`\n` +
            `Given: \`${player.cardsGiven}\`\n` +
            `Exchanged: \`${player.cardsExchanged}\``,
            true
        );

        let fightDescription =
            `Wins: \`${player.win}\`\n` +
            `Losses: \`${player.loss}\`\n` +
            `Highest Winning Streak: \`${player.highestWinningStreak}\`\n` +
            `Highest Losing Streak: \`${player.highestLosingStreak}\`\n` +
            `All Ins Won: \`${player.allInWins}\`\n` +
            `All Ins Lost: \`${player.allInLoss}\`\n`;

        if (player.win > 0 || player.loss > 0) {
            fightDescription += `\`${((player.win / (player.win + player.loss)) * 100).toFixed(2)}%\`\n`;
        }
        if (player.losingStreak > 0) {
            fightDescription += `Current Losing Streak: \`${player.losingStreak}\`\n`;
        }
        if (player.winningStreak > 0) {
            fightDescription += `Current Winning Streak: \`${player.losingStreak}\`\n`;
        }

        embed.addField('Fights', fightDescription, true);

        return message.reply({ embeds: [embed] });
    }
}