# 🏢 SyndicBloc - Plateforme de Gestion de Charges d'Immeuble (Syndic)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ayymen31000/syndicbloc)
![CI Test & Build](https://github.com/ayymen31000/syndicbloc/actions/workflows/ci.yml/badge.svg)

Application web moderne, fluide et sécurisée conçue spécifiquement pour la gestion de copropriété et de syndic d'immeuble, adossée à une base de données relationnelle persistante (**SQLite & Prisma ORM**) et une interface réactive.

---

## ☁️ Déploiement en Ligne 100% Gratuit (Render)

L'application est prête à être déployée gratuitement en 1 clic grâce au fichier de configuration [render.yaml](render.yaml) :

1. Cliquez sur le bouton ci-dessus **« Deploy to Render »** (ou rendez-vous sur [render.com](https://render.com) et connectez votre compte GitHub).
2. Sélectionnez votre dépôt **`ayymen31000/syndicbloc`**.
3. Render configurera automatiquement le service Web (Node.js, initialisation de la base SQLite, seeding des 24 appartements et du compte administrateur).
4. Cliquez sur **« Apply »** / **« Create Web Service »**. En moins de 2 minutes, votre application disposera d'une URL publique sécurisée HTTPS (ex: `https://syndicbloc.onrender.com`) accessible partout depuis smartphone, tablette ou ordinateur !

---

## 🏢 Spécifications de l'Immeuble
- **Structure :** 8 étages avec 3 appartements par étage (**24 logements au total**).
  - **7ème Étage :** Appt 22, Appt 23, Appt 24
  - **6ème Étage :** Appt 19, Appt 20, Appt 21
  - **5ème Étage :** Appt 16, Appt 17, Appt 18
  - **4ème Étage :** Appt 13, Appt 14, Appt 15
  - **3ème Étage :** Appt 10, Appt 11, Appt 12
  - **2ème Étage :** Appt 7, Appt 8, Appt 9
  - **1er Étage :** Appt 4, Appt 5, Appt 6
  - **RDC (Rez-de-chaussée) :** Appt 1, Appt 2, Appt 3
- **Cotisation mensuelle :** **500 DA** par appartement (**Total attendu : 12 000 DA / mois**).

---

## ✨ Fonctionnalités Principales

1. **Pointage & Suivi en Temps Réel :**
   - Pointage instantané « Cotisation Réglée » / « En attente ».
   - Badge d'horodatage automatique avec historique en base.
   - Statistiques par étage et coche groupée par étage.
   - Recherche rapide par résident, numéro d'appartement ou étage.
   - Tri dynamique des étages (7ème ➔ RDC ou RDC ➔ 7ème).

2. **Tableau de Bord & Indicateurs Financiers (KPIs) :**
   - **Cotisations Encaissées :** Montant perçu vs 12 000 DA avec taux de recouvrement en temps réel.
   - **Dépenses du Mois :** Total des charges courantes avec téléversement et consultation des reçus/justificatifs.
   - **Solde Net Mensuel :** Recettes − Dépenses (excédent ou déficit).
   - **Caisse Globale (Trésorerie) :** Solde cumulé all-time conservé dans la base relationnelle.
   - Célébration interactive (confettis) dès que le taux atteint 100%.

3. **Fiche Résident & Base de Données Relationnelle :**
   - Modification des fiches résidents avec persistance directe en base de données.
   - Sauvegarde du nom, numéro de téléphone et notes internes.

4. **Avis d'Affichage A4 pour Hall d'Entrée :**
   - Aperçu et mise en page officielle aux normes pour affichage public.
   - Prêt pour impression directe ou exportation PDF (`Ctrl+P`).

5. **Relances WhatsApp en 1 Clic :**
   - Génération automatique de messages courtois personnalisés pour WhatsApp et presse-papier.

6. **Sécurité & Sauvegarde :**
   - Authentification sécurisée (JWT avec rotation et rafraîchissement automatique de token).
   - Authentification à deux facteurs (**2FA TOTP**) avec QR Code.
   - Exportation complète de la base de données au format JSON/SQL et restauration ACID.

---

## 🛠️ Stack Technique

- **Frontend :** HTML5, Vanilla JavaScript, CSS3, Tailwind CSS (CDN), Lucide Icons, Canvas Confetti.
- **Backend :** Node.js, Express.js.
- **Base de données :** SQLite via Prisma ORM.
- **Sécurité :** Helmet (CSP configuré), Zod, bcryptjs, jsonwebtoken, Rate Limiter.
- **Tests :** Jest (Tests d'API et calculs financiers).

---

## 🚀 Installation et Lancement

### 1. Prérequis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure)
- `npm`

### 2. Cloner le projet
```bash
git clone https://github.com/<votre-utilisateur>/syndicbloc.git
cd syndicbloc
```

### 3. Installer les dépendances
```bash
npm install
```

### 4. Configuration de l'environnement
Copiez le fichier `.env.example` en `.env` :
```bash
cp .env.example .env
```

### 5. Initialisation de la base de données SQLite
```bash
npx prisma db push
node prisma/seed.js
```

### 6. Démarrage de l'application
```bash
# Mode développement
npm run dev

# Mode production
npm start
```
Accédez ensuite à l'application dans votre navigateur : **http://localhost:3000**

---

## 🐳 Déploiement avec Docker

Pour exécuter l'application avec Docker :
```bash
docker-compose up -d --build
```

---

## 🧪 Tests Automatisés

Pour exécuter la suite de tests :
```bash
npm test
```
