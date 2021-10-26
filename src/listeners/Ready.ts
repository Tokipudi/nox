import { getGuilds } from '@lib/database/utils/GuildsUtils';
import { importFandomMissingData, importGods, importSkins } from '@lib/database/utils/ImportDatabase';
import { getBannedPlayersByGuildId, setPlayerAsUnbanned } from '@lib/database/utils/PlayersUtils';
import { unexhaustSkin } from '@lib/database/utils/SkinsUtils';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener, ListenerOptions } from '@sapphire/framework';
import moment from 'moment';

@ApplyOptions<ListenerOptions>({
    once: true,
    name: 'ready'
})
export class Ready extends Listener {

    public async run() {
        // Start message
        console.log('__/\\\\\\\\\\_____/\\\\\\_____________________________________');
        console.log('__\\/\\\\\\\\\\\\___\\/\\\\\\_____________________________________');
        console.log('___\\/\\\\\\/\\\\\\__\\/\\\\\\_____________________________________');
        console.log('____\\/\\\\\\//\\\\\\_\\/\\\\\\_____/\\\\\\\\\\_____/\\\\\\____/\\\\\\_________');
        console.log('_____\\/\\\\\\\\//\\\\\\\\/\\\\\\___/\\\\\\///\\\\\\__\\///\\\\\\/\\\\\\/__________');
        console.log('______\\/\\\\\\_\\//\\\\\\/\\\\\\__/\\\\\\__\\//\\\\\\___\\///\\\\\\/____________');
        console.log('_______\\/\\\\\\__\\//\\\\\\\\\\\\_\\//\\\\\\__/\\\\\\_____/\\\\\\/\\\\\\___________');
        console.log('________\\/\\\\\\___\\//\\\\\\\\\\__\\///\\\\\\\\\\/____/\\\\\\/\\///\\\\\\_________');
        console.log('_________\\///_____\\/////_____\\/////_____\\///____\\///__________');
        this.container.logger.info('|_ Loaded ' + this.container.stores.get('arguments').size + ' arguments.');
        this.container.logger.info('|_ Loaded ' + this.container.stores.get('commands').size + ' commands.');
        this.container.logger.info('|_ Loaded ' + this.container.stores.get('listeners').size + ' listeners.');
        this.container.logger.info('|_ Loaded ' + this.container.stores.get('preconditions').size + ' preconditions.');

        const guilds = await getGuilds();
        for (let i in guilds) {
            const guild = guilds[i];

            // Update exhaust every minute
            setInterval(async () => {
                const playersSkins = await this.container.prisma.playersSkins.findMany({
                    where: {
                        isExhausted: true,
                        guildId: guild.id
                    },
                    select: {
                        skin: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        exhaustChangeDate: true
                    }
                })

                for (let i in playersSkins) {
                    let playerSkin = playersSkins[i];
                    if (moment.utc().isSameOrAfter(moment(playerSkin.exhaustChangeDate).add(6, 'hour'))) {
                        await unexhaustSkin(playerSkin.skin.id, guild.id);
                        this.container.logger.info(`The skin ${playerSkin.skin.name}<${playerSkin.skin.id}> has been unexhausted.`);
                    }
                }
            }, 60000);

            // Update banned players every minute
            setInterval(async () => {
                const bannedPlayers = await getBannedPlayersByGuildId(guild.id);

                for (let i in bannedPlayers) {
                    let player = bannedPlayers[i];
                    if (moment.utc().isSameOrAfter(moment(player.banEndDate))) {
                        await setPlayerAsUnbanned(player.userId, guild.id);
                        this.container.logger.info(`The player ${player.userId} in guild ${guild.id} has been unbanned.`);
                    }
                }
            }, 60000);

            // Import DB every 6 hours
            setInterval(async () => {
                await importGods();
                await importSkins();
                await importFandomMissingData();
            }, 21600000);
        }
    }
};