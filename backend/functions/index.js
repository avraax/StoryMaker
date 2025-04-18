const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Init Firebase Admin
const serviceAccount = require('./story-maker-test-firebase-adminsdk-fbsvc-bc172769fc.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Init OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ============================
// 🔁 Main API Route
// ============================
app.post('/generateStory', async (req, res) => {
  const { prompt, lixNumber, userId, storyId } = req.body;
  console.log('generateStory', prompt, lixNumber, userId, storyId)
  const storyRef = db.collection('stories').doc(storyId);

  await storyRef.set({
    status: 'in-progress',
    createdBy: userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    progress: 0
  }, { merge: true });

  try {
    const totalChunks = 5;
    let generatedStory = '';

    for (let i = 0; i < totalChunks; i++) {
      const response = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt,
        max_tokens: 500,
      });

      const part = response.data.choices[0].text;
      generatedStory += part;

      const progress = Math.floor(((i + 1) / totalChunks) * 100);
      await storyRef.update({ progress });
    }

    await storyRef.set({
      content: generatedStory,
      status: 'completed',
      progress: 100
    }, { merge: true });

    res.status(200).send({ message: 'Story generation completed' });
  } catch (err) {
    await storyRef.set({
      status: 'failed',
      error: err.message
    }, { merge: true });

    res.status(500).send({ error: 'Generation failed', details: err.message });
  }
});

// ============================
// 🚀 Firebase Function Export
// ============================
const functions = require('firebase-functions');

exports.api = functions.https.onRequest(app);

// ============================
// 🌐 Local HTTPS Dev Server
// ============================
if (!process.env.FUNCTIONS_EMULATOR && !process.env.K_SERVICE) {
  // Only run locally, not in Firebase Functions
  const keyPath = path.resolve(__dirname, '../../localhost-key.pem');
  const certPath = path.resolve(__dirname, '../../localhost.pem');

  const https = require('https');
  const credentials = {
    key: fs.readFileSync(keyPath, 'utf8'),
    cert: fs.readFileSync(certPath, 'utf8')
  };

  const PORT = 3443;

  https.createServer(credentials, app).listen(PORT, () => {
    console.log(`✅ Local HTTPS server running at https://localhost:${PORT}`);
  });
}