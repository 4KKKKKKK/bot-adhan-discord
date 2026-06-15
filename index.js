import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, StreamType } from '@discordjs/voice';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import ffmpegPath from 'ffmpeg-static';
import { createRequire } from 'module';
import _sodium from 'libsodium-wrappers';

// Initialize libsodium
await _sodium.ready;

// Configure ffmpeg for @discordjs/voice
const require = createRequire(import.meta.url);
const prism = require('prism-media');
prism.FFmpeg.getInfo = () => ({ command: ffmpegPath });

// Configuration
const TOKEN = process.env.DISCORD_TOKEN;
const CONFIG_FILE = './config.json';
const ADHAN_AUDIO = './audio/adhan.mp3';

// Client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages
  ]
});

// Charger la configuration
function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erreur lors du chargement de config.json:', error.message);
    return { servers: {} };
  }
}

// Calculer les horaires de prière
function getPrayerTimes(latitude, longitude, timezone, method = 'MWL') {
  const coordinates = new Coordinates(latitude, longitude);
  const date = new Date();

  const methods = {
    'MWL': CalculationMethod.MuslimWorldLeague,
    'ISNA': CalculationMethod.NorthAmerica,
    'EGYPT': CalculationMethod.Egyptian,
    'MAKKAH': CalculationMethod.UmmAlQura,
    'KARACHI': CalculationMethod.Karachi,
    'DUBAI': CalculationMethod.Dubai,
    'KUWAIT': CalculationMethod.Kuwait,
    'QATAR': CalculationMethod.Qatar,
    'SINGAPORE': CalculationMethod.Singapore,
    'TEHRAN': CalculationMethod.Tehran,
    'TURKEY': CalculationMethod.Turkey
  };

  const params = methods[method] || CalculationMethod.MuslimWorldLeague;
  const prayerTimes = new PrayerTimes(coordinates, date, params());

  return {
    fajr: prayerTimes.fajr,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha
  };
}

// Formater l'heure
function formatTime(date) {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Brussels'
  });
}

// Jouer l'adhan dans les canaux vocaux actifs
async function playAdhanInGuild(guild, prayerName) {
  console.log(`[DEBUG] playAdhanInGuild called for ${prayerName}`);

  try {
    // Récupérer tous les canaux vocaux actifs (sauf AFK)
    const voiceChannels = guild.channels.cache.filter(channel =>
      channel.type === 2 &&
      channel.id !== guild.afkChannelId &&
      channel.members.size > 0
    );

    console.log(`[DEBUG] Found ${voiceChannels.size} active voice channels`);

    if (voiceChannels.size === 0) {
      console.log(`[${guild.name}] Aucun canal vocal actif pour ${prayerName}`);
      return;
    }

    console.log(`[${guild.name}] 🕌 Lecture de l'adhan (${prayerName}) dans ${voiceChannels.size} canal(aux)`);

    // Jouer l'adhan dans chaque canal actif
    for (const [channelId, channel] of voiceChannels) {
      console.log(`[DEBUG] Processing channel: ${channel.name} (${channel.id})`);

      try {
        console.log(`[DEBUG] Joining voice channel...`);
        const connection = joinVoiceChannel({
          channelId: channel.id,
          guildId: guild.id,
          adapterCreator: guild.voiceAdapterCreator,
        });
        console.log(`[DEBUG] Voice channel joined successfully`);

        // Attendre que la connexion soit prête avant de jouer
        await new Promise((resolve) => {
          if (connection.state.status === VoiceConnectionStatus.Ready) {
            console.log(`[DEBUG] Connection already ready`);
            resolve();
          } else {
            console.log(`[DEBUG] Waiting for connection to be ready... (current: ${connection.state.status})`);

            const onStateChange = (oldState, newState) => {
              console.log(`[DEBUG] Connection: ${oldState.status} → ${newState.status}`);
              if (newState.status === VoiceConnectionStatus.Ready) {
                console.log(`[DEBUG] Connection is now ready!`);
                connection.off('stateChange', onStateChange);
                resolve();
              }
            };

            connection.on('stateChange', onStateChange);

            // Timeout après 10 secondes
            setTimeout(() => {
              console.log(`[DEBUG] Connection ready timeout (current state: ${connection.state.status})`);
              connection.off('stateChange', onStateChange);
              resolve();
            }, 10000);
          }
        });

        const player = createAudioPlayer();
        const audioPath = path.resolve(ADHAN_AUDIO);

        console.log(`[DEBUG] Audio path: ${audioPath}`);
        console.log(`[DEBUG] File exists: ${fs.existsSync(audioPath)}`);

        const audioStream = fs.createReadStream(audioPath);

        const resource = createAudioResource(audioStream, {
          inputType: StreamType.Arbitrary,
          inlineVolume: true
        });

        console.log(`[DEBUG] Resource created successfully`);

        if (resource.volume) {
          resource.volume.setVolume(1.0);
        }

        player.play(resource);
        const subscription = connection.subscribe(player);

        console.log(`[DEBUG] Player state: ${player.state.status}`);
        console.log(`[DEBUG] Subscription: ${subscription ? 'OK' : 'FAILED'}`);
        console.log(`[DEBUG] FFmpeg path: ${ffmpegPath}`);

        // Logger tous les changements d'état du player
        player.on('stateChange', (oldState, newState) => {
          console.log(`[DEBUG] Player: ${oldState.status} → ${newState.status}`);
        });

        // Quitter le canal quand l'audio est terminé
        player.on(AudioPlayerStatus.Idle, () => {
          console.log('[DEBUG] Player is now Idle, destroying connection');
          if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
            connection.destroy();
          }
        });

        // Gestion des erreurs
        player.on('error', error => {
          console.error(`[ERROR] Player error:`, error.message);
          console.error(error);
          connection.destroy();
        });

        connection.on('error', error => {
          console.error(`Erreur connexion:`, error.message);
        });

      } catch (error) {
        console.error(`[${guild.name}] Erreur sur le canal ${channel.name}:`, error.message);
      }
    }
  } catch (error) {
    console.error(`[${guild.name}] Erreur globale:`, error.message);
  }
}

// Vérifier si c'est l'heure d'une prière
function checkPrayerTime() {
  const config = loadConfig();
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  for (const [guildId, serverConfig] of Object.entries(config.servers)) {
    if (!serverConfig.enabled) continue;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;

    const times = getPrayerTimes(
      serverConfig.latitude,
      serverConfig.longitude,
      serverConfig.timezone,
      serverConfig.calculationMethod
    );

    // Vérifier chaque prière
    for (const [prayerName, prayerTime] of Object.entries(times)) {
      if (prayerTime.getHours() === currentHour && prayerTime.getMinutes() === currentMinute) {
        console.log(`⏰ [${guild.name}] C'est l'heure de ${prayerName}!`);
        playAdhanInGuild(guild, prayerName);
      }
    }
  }
}

// Enregistrer les commandes slash
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('nextprayer')
      .setDescription('Affiche la prochaine prière'),
    new SlashCommandBuilder()
      .setName('today')
      .setDescription('Affiche tous les horaires de prière du jour'),
    new SlashCommandBuilder()
      .setName('config')
      .setDescription('Affiche la configuration actuelle du serveur'),
    new SlashCommandBuilder()
      .setName('test')
      .setDescription('🧪 Test: Joue l\'adhan immédiatement dans les canaux vocaux actifs')
  ].map(command => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log('Enregistrement des commandes slash...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('✅ Commandes slash enregistrées');
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des commandes:', error);
  }
}

// Gérer les commandes slash
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const config = loadConfig();
  const serverConfig = config.servers[interaction.guildId];

  if (!serverConfig) {
    return interaction.reply('⚠️ Ce serveur n\'est pas configuré. Vérifiez config.json');
  }

  const times = getPrayerTimes(
    serverConfig.latitude,
    serverConfig.longitude,
    serverConfig.timezone,
    serverConfig.calculationMethod
  );

  if (interaction.commandName === 'nextprayer') {
    const now = new Date();
    let nextPrayer = null;
    let nextTime = null;

    for (const [name, time] of Object.entries(times)) {
      if (time > now) {
        nextPrayer = name;
        nextTime = time;
        break;
      }
    }

    if (!nextPrayer) {
      nextPrayer = 'fajr';
      nextTime = times.fajr;
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🕌 Prochaine Prière')
      .setDescription(`**${nextPrayer.toUpperCase()}** à ${formatTime(nextTime)}`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === 'today') {
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('📅 Horaires de Prière - Aujourd\'hui')
      .addFields(
        { name: '🌅 Fajr', value: formatTime(times.fajr), inline: true },
        { name: '☀️ Dhuhr', value: formatTime(times.dhuhr), inline: true },
        { name: '🌤️ Asr', value: formatTime(times.asr), inline: true },
        { name: '🌆 Maghrib', value: formatTime(times.maghrib), inline: true },
        { name: '🌙 Isha', value: formatTime(times.isha), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === 'config') {
    const embed = new EmbedBuilder()
      .setColor(0xFFFF00)
      .setTitle('⚙️ Configuration du Serveur')
      .addFields(
        { name: 'Latitude', value: serverConfig.latitude.toString(), inline: true },
        { name: 'Longitude', value: serverConfig.longitude.toString(), inline: true },
        { name: 'Timezone', value: serverConfig.timezone, inline: true },
        { name: 'Méthode', value: serverConfig.calculationMethod, inline: true },
        { name: 'Activé', value: serverConfig.enabled ? '✅ Oui' : '❌ Non', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === 'test') {
    const guild = interaction.guild;

    const voiceChannels = guild.channels.cache.filter(channel =>
      channel.type === 2 &&
      channel.id !== guild.afkChannelId &&
      channel.members.size > 0
    );

    if (voiceChannels.size === 0) {
      return interaction.reply({
        content: '⚠️ Aucun canal vocal actif trouvé. Rejoignez un canal vocal puis réessayez.',
        flags: 64
      });
    }

    await interaction.reply({
      content: `🧪 Test en cours... Lecture de l'adhan dans ${voiceChannels.size} canal(aux) vocal(aux) actif(s)`,
      flags: 64
    });

    playAdhanInGuild(guild, 'TEST');
  }
});

// Quand le bot est prêt
client.once('ready', async () => {
  console.log(`✅ Bot connecté: ${client.user.tag}`);

  // Vérifier que le fichier audio existe
  if (!fs.existsSync(ADHAN_AUDIO)) {
    console.error('❌ Fichier audio manquant:', ADHAN_AUDIO);
    console.log('📁 Créez le dossier audio/ et ajoutez adhan.mp3');
  } else {
    console.log('✅ Fichier audio trouvé');
  }

  // Enregistrer les commandes slash
  await registerCommands();

  // Afficher les serveurs configurés
  const config = loadConfig();
  console.log(`\n📋 Serveurs configurés: ${Object.keys(config.servers).length}`);
  for (const [guildId, serverConfig] of Object.entries(config.servers)) {
    const guild = client.guilds.cache.get(guildId);
    console.log(`  - ${guild ? guild.name : 'Serveur inconnu'} (${serverConfig.enabled ? '✅' : '❌'})`);
  }

  // Cron job: vérifier chaque minute
  cron.schedule('* * * * *', () => {
    checkPrayerTime();
  });

  console.log('\n⏰ Surveillance des heures de prière active...\n');
});

// Gestion des erreurs
client.on('error', error => {
  console.error('Erreur Discord:', error);
});

process.on('unhandledRejection', error => {
  console.error('Erreur non gérée:', error);
});

// Connexion au bot
client.login(TOKEN);
