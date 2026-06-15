# 🕌 Bot Discord Adhan

Bot Discord qui joue l'adhan dans les canaux vocaux aux heures de prière.

## ✨ Fonctionnalités

- 🔔 Notifications automatiques pour les 5 prières quotidiennes
- 🎵 Joue l'adhan dans tous les canaux vocaux actifs (sauf AFK)
- 🌍 Support multi-serveurs avec configuration personnalisée
- 💬 Commandes slash: `/nextprayer`, `/today`, `/config`, `/test`

## 📋 Configuration actuelle

- **Localisation**: Mosquée Al Mouahidine, Laeken, Bruxelles
- **Serveur Discord**: Dizninchannil (ID: 366539873823358976)
- **Audio**: 45 secondes d'adhan

## 🧪 Test local

```bash
cd C:\Users\nassi\bot-adhan-discord
npm start
```

Ensuite dans Discord:
1. Rejoignez un canal vocal
2. Tapez `/test`
3. L'adhan devrait jouer dans votre canal

## 🚀 Déploiement sur Railway

### 1. Créer un repository GitHub

```bash
git init
git add .
git commit -m "feat: Bot Adhan Discord initial"
gh repo create bot-adhan-discord --public --source=. --push
```

Ou manuellement:
1. Créez un repo sur GitHub: https://github.com/new
2. Suivez les instructions pour pusher

### 2. Déployer sur Railway

1. Allez sur https://railway.app
2. New Project → Deploy from GitHub repo
3. Sélectionnez `bot-adhan-discord`
4. Variables → Add Variable:
   - **Name**: `DISCORD_TOKEN`
   - **Value**: (votre token depuis `.env`)

### 3. Vérifier le déploiement

Railway → Deployments → View Logs

Vous devriez voir:
```
✅ Bot connecté: Adhan#5856
✅ Fichier audio trouvé
✅ Commandes slash enregistrées
📋 Serveurs configurés: 1
  - Dizninchannil (✅)
⏰ Surveillance des heures de prière active...
```

## 📝 Commandes Discord

- `/nextprayer` - Affiche la prochaine prière
- `/today` - Affiche tous les horaires du jour
- `/config` - Affiche la configuration du serveur
- `/test` - Joue l'adhan immédiatement (pour tests)

## ⚙️ Ajouter un nouveau serveur

Éditez `config.json`:

```json
{
  "servers": {
    "VOTRE_SERVER_ID": {
      "latitude": 50.8724424,
      "longitude": 4.3536778,
      "timezone": "Europe/Brussels",
      "calculationMethod": "MWL",
      "enabled": true
    }
  }
}
```

Puis redéployez:
```bash
git add config.json
git commit -m "feat: Ajout nouveau serveur"
git push
```

## 💰 Coûts Railway

- **Gratuit**: 5$/mois de crédits
- Consommation estimée: ~1-2$/mois
- **100% gratuit** avec le free tier

## 🔗 Liens utiles

- Bot Discord: Client ID `1436309716702593185`
- Lien d'invitation: `https://discord.com/oauth2/authorize?client_id=1436309716702593185&permissions=3146752&scope=bot%20applications.commands`
