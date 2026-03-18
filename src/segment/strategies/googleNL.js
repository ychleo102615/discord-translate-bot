// CJK 等語言的斷詞策略，使用 Google Cloud Natural Language API

const language = require('@google-cloud/language');

const client = new language.LanguageServiceClient();

async function segment(text, lang) {
  const document = {
    content: text,
    type: 'PLAIN_TEXT',
    language: lang,
  };

  const [result] = await client.analyzeSyntax({ document, encodingType: 'UTF8' });
  const tokens = result.tokens || [];

  return tokens
    .filter(t => t.partOfSpeech?.tag !== 'PUNCT')
    .map(t => ({
      word: t.text?.content || '',
      lemma: t.lemma || t.text?.content || '',
      pos: t.partOfSpeech?.tag || null,
    }))
    .filter(t => t.word.length > 0);
}

module.exports = { segment };
