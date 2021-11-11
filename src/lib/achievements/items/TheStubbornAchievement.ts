import { container } from "@sapphire/framework";
import { Snowflake } from "discord-api-types";
import { Achievement } from "../Achievement";
import { AchievementOptions } from "../interfaces/AchievementInterface";

export class TheStubbornAchievement extends Achievement {

    public constructor(options?: AchievementOptions) {
        super({
            ...options,
            achievementName: 'The Stubborn',
            description: 'Most fights lost.',
            tokens: 5
        });
    }

    async getCurrentUserIds(guildId: Snowflake): Promise<Snowflake[]> {

        const players = await container.prisma.players.findMany({
            select: {
                userId: true,
                loss: true
            },
            where: {
                guild: {
                    id: guildId
                }
            },
            orderBy: {
                loss: 'desc'
            }
        });

        let max = 0;
        const userIds = [];
        for (let i in players) {
            const player = players[i];

            if (max === 0 && player.loss > 0) {
                max = player.loss;
            }

            if (max !== 0 && player.loss === max) {
                userIds.push(player.userId);
            } else {
                break;
            }
        }

        return userIds;
    }
}