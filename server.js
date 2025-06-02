require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Configuration
const PORT = process.env.PORT || 3000;
const SKETCHES_DIR = path.join(__dirname, process.env.UPLOAD_DIR || 'sketches');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Limiter les requêtes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30
});

// Routes
app.get('/boards', async (req, res) => {
  try {
    exec('arduino-cli board list --format json', (err, stdout) => {
      if (err) {
        console.error("Erreur détection cartes:", err);
        return res.status(500).json({ error: "Erreur détection cartes" });
      }

      try {
        const boardsData = JSON.parse(stdout);
        const connectedBoards = boardsData
          .filter(board => board.port && board.port.address && board.boards)
          .map(board => ({
            port: board.port.address,
            fqbn: board.boards[0]?.fqbn,
            name: board.boards[0]?.name
          }));

        res.json(connectedBoards);
      } catch (parseErr) {
        console.error("Erreur parsing JSON:", parseErr);
        res.status(500).json({ error: "Erreur traitement données cartes" });
      }
    });
  } catch (err) {
    console.error("Erreur inattendue:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Nouvelle route pour le code direct
app.post('/upload-code', limiter, async (req, res) => {
  const { code, port, fqbn, filename } = req.body;

  if (!code || !port || !fqbn) {
    return res.status(400).send("Code, port et type de carte requis");
  }

  try {
    const sketchName = filename || `sketch_${Date.now()}`;
    const sketchPath = path.join(SKETCHES_DIR, sketchName);
    const inoPath = path.join(sketchPath, `${sketchName}.ino`);

    fs.mkdirSync(sketchPath, { recursive: true });
    fs.writeFileSync(inoPath, code);

    // Compilation
    exec(`arduino-cli compile --fqbn ${fqbn} "${sketchPath}"`, (err, stdout, stderr) => {
      if (err) {
        console.error("Erreur compilation:", stderr);
        return res.status(500).send(`❌ Erreur compilation:\n${stderr}`);
      }

      // Upload
      exec(`arduino-cli upload -p ${port} --fqbn ${fqbn} "${sketchPath}"`, (err2, stdout2, stderr2) => {
        if (err2) {
          console.error("Erreur upload:", stderr2);
          return res.status(500).send(`❌ Erreur upload:\n${stderr2}`);
        }

        res.send(`✅ Téléversement réussi sur ${port} (${fqbn})!\n${stdout2}`);
      });
    });
  } catch (err) {
    console.error("Erreur traitement:", err);
    res.status(500).send("Erreur lors du traitement du code");
  }
});

// Route pour l'upload de fichier
app.post('/upload-file', limiter, upload.single('sketch'), async (req, res) => {
  const { port, fqbn } = req.body;
  const file = req.file;

  if (!file || !file.originalname.endsWith('.ino')) {
    if (file) fs.unlinkSync(file.path);
    return res.status(400).send("Seuls les fichiers .ino sont acceptés");
  }

  if (!port || !fqbn) {
    fs.unlinkSync(file.path);
    return res.status(400).send("Port et type de carte requis");
  }

  try {
    const sketchPath = path.join(SKETCHES_DIR, path.basename(file.originalname, '.ino'));
    fs.mkdirSync(sketchPath, { recursive: true });
    fs.renameSync(file.path, path.join(sketchPath, file.originalname));

    // Compilation
    exec(`arduino-cli compile --fqbn ${fqbn} "${sketchPath}"`, (err, stdout, stderr) => {
      if (err) {
        console.error("Erreur compilation:", stderr);
        return res.status(500).send(`❌ Erreur compilation:\n${stderr}`);
      }

      // Upload
      exec(`arduino-cli upload -p ${port} --fqbn ${fqbn} "${sketchPath}"`, (err2, stdout2, stderr2) => {
        if (err2) {
          console.error("Erreur upload:", stderr2);
          return res.status(500).send(`❌ Erreur upload:\n${stderr2}`);
        }

        res.send(`✅ Téléversement réussi sur ${port} (${fqbn})!\n${stdout2}`);
      });
    });
  } catch (err) {
    console.error("Erreur traitement:", err);
    res.status(500).send("Erreur lors du traitement du fichier");
  }
});

// Initialisation
if (!fs.existsSync(SKETCHES_DIR)) fs.mkdirSync(SKETCHES_DIR);

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  console.log("Vérification arduino-cli...");
  
  exec('arduino-cli version', (err) => {
    if (err) console.error("❌ arduino-cli non trouvé. Installez-le d'abord.");
    else console.log("✅ arduino-cli détecté");
  });
});