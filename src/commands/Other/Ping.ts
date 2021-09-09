import { ApplyOptions } from '@sapphire/decorators';
import { Command, CommandOptions, PieceContext } from '@sapphire/framework';
import type { Message } from 'discord.js';

@ApplyOptions<CommandOptions>({
    aliases: ['pong'],
    requiredUserPermissions: 'ADMINISTRATOR'
})
export class Ping extends Command {
    
    public async run(message: Message) {
        const msg = await message.channel.send('Ping?');

        return msg.edit(
            `Pong! Bot Latency ${Math.round(this.container.client.ws.ping)}ms. API Latency ${msg.createdTimestamp - message.createdTimestamp}ms.`
        );
    }
}