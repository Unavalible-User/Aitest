//.                discord bot
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

client.once(Events.ClientReady, () => {
    console.log('Ready!');
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);

        const errorMessage = 'There was an error while executing this command!';
        const responseMethod = interaction.replied || interaction.deferred ? 'followUp' : 'reply';

        await interaction[responseMethod]({ content: errorMessage, ephemeral: true });
    }
});

client.login(token);

const { REST, Routes } = require('discord.js');
const commands = [];

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();
////////

// Set the bot's ready event
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    // Set the presence
    client.user.setPresence({
        activity: {
            name: 'your custom status here',
            type: 'PLAYING', // You can also use 'LISTENING', 'WATCHING', 'STREAMING'
        },
        status: 'online', // You can set this to 'idle', 'dnd', or 'invisible'
    });
});

// Log in to Discord with your bot's token

client.login(token);

////////////////////////////////////////////////////
//.                   ai
const http = require('http');
const { DiscussServiceClient } = require('@google-ai/generativelanguage');
const { GoogleAuth } = require('google-auth-library');
const MODEL_NAME = 'models/chat-bison-001';
const API_KEY = process.env.API_KEY;

const ai = new DiscussServiceClient({
    authClient: new GoogleAuth().fromAPIKey(API_KEY),
});

const generatedMessages = [];

async function generateContent(inputMessage, clientIP) {
    const result = await ai.generateMessage({
        model: MODEL_NAME,
        temperature: 0.5,
        candidateCount: 1,
        prompt: {
            messages: [{ content: inputMessage }],
        },
    });

    const generatedContent = result[0].candidates[0].content;

    generatedMessages.push({ inputMessage, generatedContent, clientIP });

    fs.writeFileSync('generated_messages.txt', JSON.stringify(generatedMessages), 'utf-8');

    return generatedContent;
}

const server = http.createServer(async (req, res) => {
    const clientIP = req.connection.remoteAddress;

    if (req.method === 'POST' && req.url === '/generate-content') {
        try {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                const { messageInput } = JSON.parse(body);
                const generatedContent = await generateContent(messageInput, clientIP);

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ generatedContent }));
            });
        } catch (error) {
            console.error('Error handling POST request:', error);
            res.statusCode = 500;
            res.end('Internal Server Error');
        }
    } else {
        const html = fs.readFileSync('./index.html', 'utf-8');
        res.setHeader('Content-Type', 'text/html');
        res.end(html);
    }
});
////////////////////////////////////////////////////
//.                  website
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
///////////
