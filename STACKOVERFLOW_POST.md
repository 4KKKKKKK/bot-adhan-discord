# Discord.js Bot Joins Voice Channel But No Audio Plays

I've built a Discord bot using discord.js v14 and @discordjs/voice that plays audio in voice channels at specific times. The bot successfully connects to Discord, registers slash commands, and joins voice channels, but **no audio is heard by anyone** in the channel.

## Environment

- **Node.js:** v24.10.0 (local), v18.20.5 (Railway production)
- **OS:** Windows 11 (local) + Railway Linux (production)
- **discord.js:** 14.14.1
- **@discordjs/voice:** 0.17.0

## The Problem

Everything works except the actual audio playback:

✅ Bot connects to Discord
✅ Slash commands work
✅ Bot joins voice channels (visible in Discord)
✅ `connection.subscribe(player)` returns truthy
✅ Player emits `AudioPlayerStatus.Playing` event
✅ FFmpeg available via `ffmpeg-static`
✅ Opus encoder available via `opusscript`
✅ Encryption library available via `tweetnacl`
✅ No errors in console/logs

❌ **No audio is heard by anyone**
❌ Bot stays silent for audio duration then disconnects

This happens on both Windows local and Railway Linux environments.

## Code

Here's the relevant audio playback code:

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

## Audio File Details

The audio file has been validated with ffprobe and is confirmed to be valid:

- Format: MP3, 320kbps, 44.1kHz stereo
- Duration: 45 seconds
- File exists and is readable

## What I've Tried

I've spent many hours trying different approaches:

**1. Different encryption libraries:**
- Switched from `libsodium-wrappers` to `sodium` to `tweetnacl` (currently using tweetnacl)

**2. Different Opus encoders:**
- Switched from `@discordjs/opus` to `opusscript` (currently using opusscript)

**3. Different AudioResource configurations:**
```javascript
// Tried direct path
createAudioResource('./audio/adhan.mp3')

// Tried with explicit input type (current)
createAudioResource(stream, { inputType: StreamType.Arbitrary })

// Tried with inline volume
createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: true })
```

**4. Different @discordjs/voice versions:**
- Tested both 0.16.1 and 0.17.0 - same issue

**5. Verified permissions:**
- Connect, Speak, Use Voice Activity - all enabled
- Bot is not server muted or user muted
- Volume slider at 100%

**6. Different environments:**
- Tested on Windows 11 local - no audio
- Tested on Railway Linux - no audio

**7. Created 2 different Discord bots from scratch:**
- Same issue with both bots

## Dependencies

Current package.json dependencies:

```json
{
  "discord.js": "^14.14.1",
  "@discordjs/voice": "^0.17.0",
  "ffmpeg-static": "^5.2.0",
  "tweetnacl": "^1.0.3",
  "opusscript": "^0.0.8"
}
```

## Intents

I'm using the following gateway intents:

```javascript
new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages
  ]
})
```

## Questions

1. Is there something fundamentally wrong with my audio setup that I'm missing?
2. Could using pure JavaScript libraries (`tweetnacl` + `opusscript`) instead of native compiled ones be causing the issue?
3. Are there any diagnostic steps I should try to identify where the audio pipeline is failing?
4. Could there be an issue with how `ffmpeg-static` provides the ffmpeg binary to `@discordjs/voice`?

The most puzzling part is that there are **zero errors** - everything appears to work perfectly except no one hears any audio.

Any help would be greatly appreciated!

**Full code:** https://github.com/4KKKKKKK/bot-adhan-discord
