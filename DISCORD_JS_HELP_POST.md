# 🎵 Bot joins voice channel but no audio plays - Need help!

## Problem Summary

I've built a Discord bot that plays audio (Islamic prayer call/adhan) in voice channels at specific times. The bot successfully:
- ✅ Connects to Discord
- ✅ Registers slash commands
- ✅ Joins voice channels
- ✅ Player shows status "Playing"
- ❌ **But NO AUDIO is heard by anyone**

This happens both on **Railway (Linux)** and **Windows 11 local**.

---

## Environment & Versions

**Node.js:** v24.10.0 (also tested on v18.20.5 on Railway)
**OS:** Windows 11 (local) + Railway Linux (production)

**Dependencies:**
```json
{
  "discord.js": "^14.14.1",
  "@discordjs/voice": "^0.17.0",
  "adhan": "^4.4.4",
  "node-cron": "^3.0.3",
  "dotenv": "^16.3.1",
  "ffmpeg-static": "^5.2.0",
  "tweetnacl": "^1.0.3",
  "opusscript": "^0.0.8"
}
```

**Audio file:**
- Format: MP3, 320kbps, 44.1kHz stereo
- Duration: 45 seconds
- Size: 1.8MB
- Validated with ffprobe (file is valid)

---

## Code Snippet

```javascript
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } from '@discordjs/voice';
import fs from 'fs';
import path from 'path';

async function playAdhanInGuild(guild, prayerName) {
  const voiceChannels = guild.channels.cache.filter(channel =>
    channel.type === 2 &&
    channel.id !== guild.afkChannelId &&
    channel.members.size > 0
  );

  for (const [channelId, channel] of voiceChannels) {
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer();
    const audioPath = path.resolve('./audio/adhan.mp3');
    const audioStream = fs.createReadStream(audioPath);

    const resource = createAudioResource(audioStream, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true
    });

    if (resource.volume) {
      resource.volume.setVolume(1.0);
    }

    player.play(resource);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();
    });

    player.on('error', error => {
      console.error('Player error:', error);
    });
  }
}
```

---

## What Works

✅ Bot connects successfully to Discord
✅ Slash commands work perfectly (`/test`, `/today`, etc.)
✅ Bot joins voice channels (visible in Discord)
✅ `connection.subscribe(player)` returns truthy (subscription successful)
✅ Player emits `AudioPlayerStatus.Playing` event
✅ FFmpeg is available (`ffmpeg-static` installed)
✅ Opusscript is available (`opusscript` installed)
✅ TweetNaCl is available (encryption library)
✅ No errors in console/logs during playback

---

## What Doesn't Work

❌ **No audio is heard by anyone in the voice channel**
❌ The bot stays connected but silent for ~45 seconds (audio duration)
❌ Then disconnects (as expected when audio ends)

---

## Logs (No errors!)

**Bot startup:**
```
✅ Bot connecté: Adhan#5094
✅ Fichier audio trouvé
✅ Commandes slash enregistrées
📋 Serveurs configurés: 1
  - Dizninchannil (✅)
⏰ Surveillance des heures de prière active...
```

**When `/test` is triggered:**
```
[Dizninchannil] 🕌 Lecture de l'adhan (TEST) dans 1 canal(aux)
```

**No player errors, no connection errors, nothing!**

---

## What I've Tried

### 1. Different encryption libraries
- ❌ `libsodium-wrappers` → Didn't initialize properly
- ❌ `sodium` → Requires Visual Studio C++ (compilation issues)
- ✅ `tweetnacl` → Installs fine (pure JS), currently using

### 2. Different Opus encoders
- ❌ `@discordjs/opus` → Requires Visual Studio C++ (compilation issues)
- ✅ `opusscript` → Installs fine (pure JS), currently using

### 3. Different AudioResource configurations
```javascript
// Tried direct path
createAudioResource('./audio/adhan.mp3')

// Tried fs.createReadStream (current)
const stream = fs.createReadStream(path.resolve('./audio/adhan.mp3'));
createAudioResource(stream, { inputType: StreamType.Arbitrary })

// Tried with inline volume
createAudioResource(stream, {
  inputType: StreamType.Arbitrary,
  inlineVolume: true
})
```

### 4. Different @discordjs/voice versions
- ❌ `0.16.1` → Same issue
- ❌ `0.17.0` → Same issue (current)

### 5. Different environments
- ❌ Railway (Linux, Node 18.20.5) → No audio
- ❌ Windows 11 local (Node 24.10.0) → No audio

### 6. Different Discord bots
- Created 2 different bots from scratch on Discord Developer Portal
- Same issue with both

### 7. Permissions verified
```
✅ Connect (Voice)
✅ Speak (Voice)
✅ Use Voice Activity
✅ View Channels
✅ Send Messages
✅ Use Application Commands
```

### 8. Bot is NOT muted
- Checked in Discord: bot is not server muted
- Checked in Discord: bot is not user muted
- Volume slider at 100%

---

## Questions

1. **Is there something fundamentally wrong with my audio setup?**
2. **Do I need native dependencies that I'm missing?**
3. **Is `tweetnacl` + `opusscript` (both pure JS) sufficient for voice?**
4. **Could this be a Discord permission issue I'm not seeing?**
5. **Any diagnostic steps I haven't tried?**

---

## Additional Info

**Intents:**
```javascript
new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages
  ]
})
```

**Discord Developer Portal settings:**
- ✅ SERVER MEMBERS INTENT: Enabled
- ✅ MESSAGE CONTENT INTENT: Enabled

**Audio file validated:**
```bash
ffprobe output:
codec_name=mp3
codec_type=audio
sample_rate=44100
channels=2
channel_layout=stereo
duration=45.296325
bit_rate=320000
```

---

## Full Code

GitHub: https://github.com/4KKKKKKK/bot-adhan-discord
File: `index.js` (full bot code available)

---

## Any help would be GREATLY appreciated! 🙏

I've been debugging this for hours and I'm completely stuck. Everything seems to work except the actual audio playback.

Thank you in advance!
