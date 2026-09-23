const { Client } = require('discord.js-selfbot-v13');
const { WebhookClient } = require('discord.js');

const client = new Client({ checkUpdate: false });
const webhook = new WebhookClient({ url: process.env.WEBHOOKS });
const targetExtensions = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

client.on('ready', async () => {
    console.log(`Connected successfully to cloud engine as: ${client.user.tag}`);
    const targetServer = client.guilds.cache.get(process.env.SOURCE_SERVER);
    
    if (!targetServer) {
        console.error("Error: Could not locate the target server. Make sure your account is inside it!");
        process.exit(1);
    }

    console.log(`Target server located: ${targetServer.name}. Scanning all channels for past media...`);
    const textChannels = targetServer.channels.cache.filter(c => c.isText());
    console.log(`Found ${textChannels.size} text channels. Starting deep history crawl...`);

    for (const [channelId, channel] of textChannels) {
        console.log(`Crawling history in channel: #${channel.name}...`);
        try {
            const messages = await channel.messages.fetch({ limit: 100 });
            
            for (const [msgId, message] of messages) {
                if (message.attachments.size > 0) {
                    const mediaUrls = message.attachments
                        .map(att => att.url)
                        .filter(url => {
                            const cleanUrl = url.toLowerCase().split('?');
                            return targetExtensions.some(ext => cleanUrl.endsWith(ext));
                        });

                    if (mediaUrls.length > 0) {
                        console.log(`[Found Past Media] #${channel.name}: Forwarding attachments...`);
                        await webhook.send({
                            content: `**Archived From Channel #${channel.name}**\n${mediaUrls.join('\n')}`,
                            username: message.author.username,
                            avatarURL: message.author.displayAvatarURL()
                        });
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
        } catch (err) {
            console.log(`Skipping channel #${channel.name} (Missing permissions to read history)`);
        }
    }
    console.log("Deep server history media crawl completed successfully!");
    process.exit(0);
});

client.login(process.env.TOKEN);
