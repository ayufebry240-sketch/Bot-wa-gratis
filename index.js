const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const { Sticker, StickerTypes } = require('wa-sticker-formatter')
const pino = require('pino')

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut
            console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
            if(shouldReconnect) {
                connectToWhatsApp()
            }
        } else if(connection === 'open') {
            console.log('Bot berhasil terhubung')
        }
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe) return
        
        const messageType = Object.keys(m.message)[0]
        const body = messageType === 'conversation'? m.message.conversation : 
                     messageType === 'extendedTextMessage'? m.message.extendedTextMessage.text : ''
        
        const from = m.key.remoteJid
        const command = body.toLowerCase().split(' ')[0]

        if (command === '!menu') {
            const menu = `*BOT WA GRATIS*\n\n*Perintah:*\n!menu - Lihat menu ini\n!sticker - Reply gambar/video jadi sticker\n!ping - Cek bot aktif\n\n*Bot 24 jam tanpa HP nyala*`
            await sock.sendMessage(from, { text: menu })
        }
        
        else if (command === '!ping') {
            await sock.sendMessage(from, { text: 'Pong! Bot aktif ✅' })
        }

        else if (command === '!sticker') {
            const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage
            if (quoted?.imageMessage) {
                const buffer = await sock.downloadMediaMessage({ message: { imageMessage: quoted.imageMessage } })
                const sticker = new Sticker(buffer, {
                    pack: 'Bot Gratis',
                    author: 'Railway',
                    type: StickerTypes.FULL,
                    quality: 50
                })
                await sock.sendMessage(from, await sticker.toMessage())
            } else {
                await sock.sendMessage(from, { text: 'Reply gambar pake!sticker ya' })
            }
        }
    })
}

connectToWhatsApp()
