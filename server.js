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

// =========================
// Route GET /boards
// =========================
app.get('/boards', async (req, res) => {
  try {
    exec('arduino-cli board list --format json', (err, stdout) => {
      if (err) {
        console.error("Erreur détection cartes:", err);
        return res.status(500).json({ error: "Erreur détection cartes" });
      }

      try {
        const boardsData = JSON.parse(stdout);
        
        // Traitement du nouveau format JSON
        const detectedPorts = boardsData.detected_ports || [];
        const connectedBoards = detectedPorts
          .filter(port => port.port?.address && port.matching_boards?.length > 0)
          .map(port => ({
            port: port.port.address,
            fqbn: port.matching_boards[0]?.fqbn,
            name: port.matching_boards[0]?.name
          }));

        res.json({
          detected_ports: detectedPorts,
          connectedBoards: connectedBoards
        });
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

// =========================
// Route POST /upload-code
// =========================
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

// =========================
// Route POST /upload-file
// =========================
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
    const sketchName = path.basename(file.originalname, '.ino');
    const sketchPath = path.join(SKETCHES_DIR, sketchName);

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

// =========================
// Initialisation
// =========================
if (!fs.existsSync(SKETCHES_DIR)) fs.mkdirSync(SKETCHES_DIR);

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  console.log("Vérification arduino-cli...");

  exec('arduino-cli version', (err) => {
    if (err) {
      console.error("❌ arduino-cli non trouvé. Installez-le d'abord.");
    } else {
      console.log("✅ arduino-cli détecté");
    }
  });
});
