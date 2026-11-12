# Chorés du mariage 💃

Le groupe propose des reels Instagram (ou TikTok, YouTube Shorts) directement depuis le menu **Partager** du téléphone, sans passer par l’App Store ni le Play Store. Sur le site, chacun vote **la danse** et **la musique** (👍 ou 👎). L’admin valide ou refuse. Quand deux personnes partagent le même reel, l’appli le détecte : une seule carte, avec « Proposé par @a et @b ».

---

## 1. Déployer sur Vercel (environ 10 min)

1. **Mettre le code sur GitHub** : crée un dépôt et pousse ce dossier (ou utilise `vercel deploy` en ligne de commande).
2. Sur **vercel.com → Add New → Project**, importe le dépôt. Framework : **Other**. Pas de build à configurer, `vercel.json` s’en occupe.
3. **Base de données** : dans le projet Vercel, va dans **Storage → Create / Marketplace → Upstash (Redis)**, offre gratuite, puis **Connect to project**. Vercel ajoute tout seul `KV_REST_API_URL` et `KV_REST_API_TOKEN`.
4. **Variables d’environnement** (Settings → Environment Variables) :
   | Variable | Exemple | Rôle |
   |---|---|---|
   | `SESSION_SECRET` | une longue chaîne aléatoire | signe les sessions |
   | `INVITE_CODE` | `mariage2027` | code à donner aux 5 ou 6 personnes |
   | `ADMIN_PSEUDOS` | `tonpseudo` | tes pseudos Insta admin, séparés par des virgules |
5. **Redeploy**. Ouvre l’URL et crée ton compte en premier.

> Sans base connectée, le site tourne en **mode démo** : un bandeau jaune s’affiche et les données s’effacent.

**Tester en local :** `npm install` puis `npm run dev`, et ouvre http://localhost:3000 (base en mémoire).

---

## 2. Installer « Chorés » dans le menu Partager

Chaque personne a ces explications **dans l’app**, via le bouton **📲 Installer**, avec son URL et son jeton déjà remplis.

### Samsung / Android
1. Ouvrir le site dans Chrome ou Samsung Internet.
2. Menu ⋮ → **Ajouter à l’écran d’accueil** → **Installer**.
3. Dans Instagram : **Partager** → **Partager via…** → **Chorés**.

Cela repose sur la *Web Share Target API* du manifeste (`public/manifest.webmanifest`).

### iPhone
Sur iPhone, un site ne peut pas apparaître dans le menu Partager : Safari ne prend pas en charge cette fonction. On passe donc par un **Raccourci**, dans l’app Raccourcis qui est préinstallée :
1. Raccourcis → **+** → nommer le raccourci **Chorés**.
2. ⓘ → activer **Afficher dans la feuille de partage**. Types acceptés : URL et Texte.
3. Action **Obtenir le contenu de l’URL** :
   - URL : `https://TON-SITE.vercel.app/api/submit`
   - Méthode **POST**, corps **JSON**
   - champ `text` = *Entrée du raccourci*
   - champ `token` = le jeton personnel affiché dans l’app
4. Action **Obtenir la valeur du dictionnaire** avec la clé `message`, puis **Afficher la notification**.

Dans Instagram : **Partager** → **Chorés**. Une notification confirme l’ajout ou signale un doublon, sans ouvrir le navigateur.

---

## 3. La musique

Instagram ne propose **pas d’API publique** qui donne la musique d’un reel. L’app essaie donc plusieurs sources, dans cet ordre :
1. **Une API tierce de ton choix**, par exemple un « Instagram scraper » sur RapidAPI (offres gratuites ou à quelques euros). Configuration :
   ```
   INSTAGRAM_API_URL=https://xxx.p.rapidapi.com/v1/post_info?code_or_id_or_url={code}
   INSTAGRAM_API_HEADERS={"x-rapidapi-key":"…","x-rapidapi-host":"xxx.p.rapidapi.com"}
   ```
   Le code cherche automatiquement `music_asset_info` et `original_sound_info`, le format renvoyé par la plupart de ces API. Si ton fournisseur renvoie un autre format, adapte `findMusic()` dans `lib/media.js`.
2. **oEmbed Meta** (`META_OEMBED_TOKEN`) pour l’auteur et la miniature.
3. Les balises publiques de la page, souvent bloquées par Instagram.
4. **En dernier recours, à la main** : champ 🎵 au moment du partage (Android et site) ou bouton « Indiquer » sur la carte.

L’app signale aussi quand **plusieurs reels différents utilisent la même musique**.

---

## 4. Doublons
- La clé d’un reel est son **code** (`instagram.com/reel/CODE`). Les paramètres de partage (`?igsh=…`) sont ignorés, et `/p/`, `/reel/` et `/reels/` donnent la même clé.
- Si le reel existe déjà, la personne est **ajoutée comme co-proposeur** et sa réponse indique « Doublon : déjà proposé par @x ».
- Si c’est la même danse dans **deux posts différents**, l’admin peut les **fusionner** (menu « Fusionner avec… »). Les proposeurs et les votes sont regroupés, et l’ancien lien reste reconnu comme doublon.

---

## 5. Structure

```
api/            fonctions serverless Vercel
  auth.js       inscription / connexion / déconnexion / moi
  submit.js     réception d’un partage (Android, Raccourci iPhone, formulaire)
  reels.js      liste + correction de la musique
  vote.js       votes danse / musique
  admin.js      valider / refuser / fusionner / supprimer
lib/            db (Upstash ou mémoire), auth, reconnaissance des liens, modèle
public/         interface (HTML/CSS/JS sans framework), manifest, service worker, page /share
scripts/dev-server.mjs   serveur local qui imite Vercel
```

## 6. Intégrer plus tard au site du mariage
- Toutes les clés Redis sont préfixées par `choreo:`, donc la même base peut servir au site mariage sans collision.
- Il suffit de recopier `api/` et `lib/`, puis d’intégrer `public/app.js` dans une page du site, ou de garder la page telle quelle sous `/chores`.
- Si le site mariage a déjà ses comptes, remplace `currentUser()` dans `lib/auth.js` par sa propre authentification. Le reste ne change pas.
