const { Translate } = require('@google-cloud/translate').v2;

const translator = new Translate();

async function detect(text) {
  const [detections] = await translator.detect(text);
  return detections.language;
}

async function translate(text, targetLang) {
  const [translation] = await translator.translate(text, targetLang);
  return translation;
}

module.exports = { detect, translate };
