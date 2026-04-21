import { TranslateAllSettingHandler } from "handlers/settings-handler";
import { SupportedLanguages, SupportedSystems } from "types";

export class Translator {
  static async translate(description: string): Promise<string | undefined> {
    return await Translator.translateWithGemini(description);
  }

  static async getPromptTemplate(path: string, description: string): Promise<string> {
    const promptTemplatePath = TranslateAllSettingHandler.getSetting("translate-all-gemini", "promptTemplatePath") as string;
    if (!promptTemplatePath) {
      return "";
    }
    let promptTemplate = "";
    try {
      const url = foundry.utils.getRoute(promptTemplatePath);
      promptTemplate = await fetch(url).then((x) => x.text());
    } catch (err) {
      ui?.notifications?.warn(`Could not load prompt template. ${err}`);
    }
    return promptTemplate + `: ${description}`;
  }

  static async generatePrompt(
    system: SupportedSystems,
    language: SupportedLanguages,
    description: string,
  ): Promise<string> {
    const path = TranslateAllSettingHandler.getSetting("translate-all-gemini", "promptTemplatePath") as string;
    if (path) {
      return await Translator.getPromptTemplate(path, description);
    }
    return `Translate the following ${system} item/spell description into ${language}:\n\n
            Keep the same format and structure, like HTML tags, and do not translate the item name or any specific game terms. 
            Do not add any additional code encapsulation or formatting. Just return the translated text.\n\n
            ${description}.`;
  }

  /**
   * Gemini does not have a public REST endpoint to list models,
   * so we return a static map with the available Gemini models.
   */
  static async getModels(): Promise<Record<string, string> | undefined> {
    return {
      "gemini-2.0-flash": "Gemini 2.0 Flash",
      "gemini-2.0-flash-lite": "Gemini 2.0 Flash Lite",
      "gemini-1.5-flash-latest": "Gemini 1.5 Flash",
      "gemini-1.5-pro-latest": "Gemini 1.5 Pro",
    };
  }

  static async translateWithGemini(description: string): Promise<string | undefined> {
    const apiKey = TranslateAllSettingHandler.getSetting("translate-all-gemini", "apiKey") as string;
    const apiEndpoint = TranslateAllSettingHandler.getSetting("translate-all-gemini", "apiEndpoint") as string;
    const system = TranslateAllSettingHandler.getSetting("translate-all-gemini", "targetSystem") as SupportedSystems;
    const language = TranslateAllSettingHandler.getSetting("translate-all-gemini", "targetLanguage") as SupportedLanguages;
    const model = TranslateAllSettingHandler.getSetting("translate-all-gemini", "targetModel") as string;
    const prompt = await Translator.generatePrompt(system, language, description);

    // Gemini REST endpoint: POST /v1beta/models/{model}:generateContent?key={apiKey}
    const url = `${apiEndpoint}/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let response: Response | undefined;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });
    } catch (error) {
      ui?.notifications?.error(`Gemini API call failed. ${error}`);
      return undefined;
    }

    if (!response?.ok) {
      const errText = await response?.text().catch(() => "");
      ui?.notifications?.error(`Gemini API call failed: ${response?.status} ${errText}`);
      return undefined;
    }

    const data = await response.json();
    // Response shape: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? undefined;
  }
}
