# 📜 Guide Complet d'Installation & Exécution

## 1️⃣ Installer Arduino-CLI

**Téléchargez :**
[https://arduino.github.io/arduino-cli/1.2/installation/](https://arduino.github.io/arduino-cli/1.2/installation/)

**Étapes :**

1. Extraire le fichier ZIP dans un dossier (ex: `C:\Users\amine\Desktop`).
2. Ajouter au **PATH** :

   * Ouvrez `Paramètres` → `Variables d'environnement` → `Path` → `Modifier`.
   * Ajoutez le chemin du dossier (ex: `C:\Users\amine\Desktop`).
3. Vérifier en CMD :

   ```cmd
   arduino-cli version
   ```

   → Doit afficher la version (ex: 1.2.2).
4. Configurer Arduino-CLI :

   ```cmd
   arduino-cli config init
   arduino-cli core update-index
   arduino-cli core install arduino:avr
   ```
5. **Tester avec une carte :**
   Branchez votre Arduino via USB.
   Lancez :

   ```cmd
   arduino-cli board list
   ```

   → Doit afficher le port (ex: COM3 ou /dev/ttyACM0).

---

## 2️⃣ Installer Node.js

**Téléchargez :**
Node.js LTS → Installez avec les options par défaut (cocher *"Automatically install tools"*).

**Vérification :**

```cmd
node --version   # Doit afficher v18+ (ex: v22.16.0)
npm --version    # Doit afficher v9+ (ex: 10.9.2)
```

**Créer un dossier pour le projet  :**

```cmd
mkdir arduino-web-uploader
cd arduino-web-uploader
```
**Initialiser le projet Node.js :**
```cmd
npm init -y
```
**Installer les dépendances nécessaires :**
```cmd
npm install express multer cors
```

---

## 3️⃣ Configurer le Projet

**Téléchargez et installez VS Code.**
Ouvrez VS Code → Ouvrir un dossier → Sélectionnez `arduino-web-uploader`.

**Structure des fichiers :**

```
arduino-web-uploader/
├── public/
│   └── index.html       # Collez votre code HTML/JS depuis SAMMANE_AMINE_PFA.zip
├── server.js            # Collez votre code backend depuis SAMMANE_AMINE_PFA.zip
└── package.json         # Généré via `npm init -y`
```

**Installer les dépendances :**

```cmd
npm install express multer cors dotenv express-rate-limit
```

---

## 4️⃣ Lancer le Système

**Démarrer le serveur :**

```cmd
node server.js
```

→ Message : *"Serveur démarré sur [http://localhost:3000](http://localhost:3000)"*

**Ouvrez dans le navigateur :**
[http://localhost:3000](http://localhost:3000)

**⚠️ Branchez votre carte Arduino avant d’utiliser l’interface.**

---
