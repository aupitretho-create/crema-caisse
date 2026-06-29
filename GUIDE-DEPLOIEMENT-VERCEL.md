# 🚀 Déployer la caisse Crémà sur Vercel

Ton app est prête. Voici les 2 façons de la mettre en ligne. La plus simple = **GitHub + Vercel**.

---

## Option A — La plus simple (GitHub + Vercel, sans terminal)

### 1. Mets le projet sur GitHub
- Crée un compte sur github.com (gratuit).
- Crée un nouveau dépôt (repository) : bouton **New** → nomme-le `crema-caisse` → **Create**.
- Sur la page du dépôt vide, clique **uploading an existing file**.
- Glisse **tous les fichiers de ce dossier** (package.json, index.html, vite.config.js, le dossier `src`, etc.) → **Commit changes**.

### 2. Branche Vercel
- Va sur **vercel.com** → connecte-toi **avec GitHub** (gratuit).
- **Add New… → Project** → choisis ton dépôt `crema-caisse` → **Import**.
- Vercel détecte tout seul que c'est un projet **Vite**. Tu ne touches à rien.
  - Framework Preset : **Vite** (auto)
  - Build Command : `npm run build` (auto)
  - Output Directory : `dist` (auto)
- Clique **Deploy**. Patiente ~1 minute.
- 🎉 Tu obtiens une URL du type `https://crema-caisse.vercel.app` — ta caisse est en ligne !

### 3. Mets-la sur l'écran d'accueil du téléphone (mode appli)
- Ouvre l'URL sur ton iPhone (Safari) ou Android (Chrome).
- **iPhone** : bouton Partager → "Sur l'écran d'accueil".
- **Android** : menu ⋮ → "Ajouter à l'écran d'accueil".
- Elle s'ouvre alors en plein écran comme une vraie appli.

---

## Option B — Avec le terminal (si tu connais un peu)

```bash
npm install            # installe les dépendances
npm run dev            # teste en local sur http://localhost:5173
npm install -g vercel  # une seule fois
vercel                 # suis les questions → déploie
vercel --prod          # déploiement en production
```

---

## ⚠️ Important à savoir

1. **Sauvegarde des données** : pour l'instant l'app sauvegarde dans le **navigateur du téléphone** (localStorage). Les ventes/réglages restent sur CE téléphone. Si tu veux les **partager entre plusieurs appareils** (toi + ton père + ta sœur en même temps), il faudra brancher une vraie base cloud (**Supabase**, gratuit pour commencer). Tout le code est déjà prêt pour ça : il suffit de remplacer le module `DB` (en haut de `src/App.jsx`) par des appels Supabase.

2. **SumUp** : le paiement carte est **simulé**. Pour encaisser pour de vrai, il faut intégrer le **SDK SumUp** (et garder SumUp comme caisse certifiée NF525 — c'est lui qui fait foi légalement).

3. **Mise à jour** : si tu modifies un fichier sur GitHub, Vercel **redéploie tout seul**. Pratique.

---

## 🔮 Étape d'après (quand tu voudras le vrai SaaS)
- **Supabase** : base de données cloud + multi-appareils + comptes.
- **SDK SumUp** : encaissement réel.
- **Nom de domaine** : `caisse.crema.fr` (achetable ~10€/an, se branche sur Vercel en 2 clics).

Tu as déjà tout le front. Ces 3 briques transforment l'aperçu en produit pro.
