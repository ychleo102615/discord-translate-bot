import Translate from '@google-cloud/translate';

const { Translate: TranslateClient } = Translate.v2;
const translator = new TranslateClient();

export async function detect(text: string): Promise<string> {
  const [detections] = await translator.detect(text);
  return detections.language;
}

export async function translate(text: string, targetLang: string): Promise<string> {
  const [translation] = await translator.translate(text, targetLang);
  return translation;
}
