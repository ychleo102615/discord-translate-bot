import { v3 } from '@google-cloud/translate';

const client = new v3.TranslationServiceClient();
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'discord-tranlate-bot';
const PARENT = `projects/${PROJECT_ID}/locations/global`;

// romanizeText API 支援的語言
export const SUPPORTED = new Set(['ar', 'am', 'bn', 'be', 'gu', 'hi', 'ja', 'kn', 'my', 'ru', 'sr', 'ta', 'te', 'uk']);

export async function romanize(text: string, sourceLanguageCode: string): Promise<string | null> {
  const [response] = await client.romanizeText({
    parent: PARENT,
    contents: [text],
    sourceLanguageCode,
  });
  return response.romanizations?.[0]?.romanizedText || null;
}
