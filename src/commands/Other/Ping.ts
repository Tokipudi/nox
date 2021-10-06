import { NoxCommand } from '@lib/structures/NoxCommand';
import { NoxCommandOptions } from '@lib/structures/NoxCommandOptions';
import { ApplyOptions } from '@sapphire/decorators';
import type { Message } from 'discord.js';

@ApplyOptions<NoxCommandOptions>({
    aliases: ['pong'],
    requiredUserPermissions: 'ADMINISTRATOR'
})
export class Ping extends NoxCommand {

    public async run(message: Message) {
        const msg = await message.channel.send('Ping?');

        return msg.edit(
            `Pong! Bot Latency ${Math.round(this.container.client.ws.ping)}ms. API Latency ${msg.createdTimestamp - message.createdTimestamp}ms.`
        );
    }
}