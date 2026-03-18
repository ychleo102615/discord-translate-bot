const { TranslationServiceClient } = require('@google-cloud/translate').v3;

const client = new TranslationServiceClient();
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'discord-tranlate-bot';
const PARENT = `projects/${PROJECT_ID}/locations/global`;

// romanizeText API 支援的語言
const SUPPORTED = new Set(['ar', 'am', 'bn', 'be', 'gu', 'hi', 'ja', 'kn', 'my', 'ru', 'sr', 'ta', 'te', 'uk']);

async function romanize(text, sourceLanguageCode) {
  const [response] = await client.romanizeText({
    parent: PARENT,
    contents: [text],
    sourceLanguageCode,
  });
  return response.romanizations[0]?.romanizedText || null;
}

module.exports = { romanize, SUPPORTED };
