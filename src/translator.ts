import { TranslateAllSettingHandler } from "handlers/settings-handler";
import { SupportedAIProviders, SupportedLanguages, SupportedSystems } from "types";

export class Translator {
  static async translate(description: string): Promise<string | undefined> {
    const provider = TranslateAllSettingHandler.getSetting("translate-all-gemini", "aiProvider") as SupportedAIProviders;
    if (provider === SupportedAIProviders.DEEPSEEK) {
      return await Translator.translateWithDeepSeek(description);
    }
    if (provider === SupportedAIProviders.GIGACHAT) {
      return await Translator.translateWithGigaChat(description);
    }
    if (provider === SupportedAIProviders.OPENROUTER) {
      return await Translator.translateWithOpenRouter(description);
    }
    return await Translator.translateWithGemini(description);  }

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
   * Fetch available models dynamically from the provider API.
   * Falls back to a static list if the request fails.
   */
  static async getModels(provider?: SupportedAIProviders): Promise<Record<string, string> | undefined> {
    if (provider === SupportedAIProviders.DEEPSEEK) {
      return await Translator.getDeepSeekModels();
    }
    if (provider === SupportedAIProviders.GIGACHAT) {
      return await Translator.getGigaChatModels();
    }
    if (provider === SupportedAIProviders.OPENROUTER) {
      return await Translator.getOpenRouterModels();
    }
    return await Translator.getGeminiModels();
  }

  static async getGeminiModels(): Promise<Record<string, string>> {
    const apiKey = TranslateAllSettingHandler.getSetting("translate-all-gemini", "apiKeyGemini") as string;
    const apiEndpoint = TranslateAllSettingHandler.getSetting("translate-all-gemini", "apiEndpoint") as string;

    // Pricing per 1M tokens (input / output), as of 2025
    const pricing: Record<string, string> = {
      "gemini-2.0-flash":        "Gemini 2.0 Flash — $0.10 / $0.40 per 1M tokens",
      "gemini-2.0-flash-lite":   "Gemini 2.0 Flash Lite — $0.075 / $0.30 per 1M tokens",
      "gemini-1.5-flash-latest": "Gemini 1.5 Flash — $0.075 / $0.30 per 1M tokens",
      "gemini-1.5-pro-latest":   "Gemini 1.5 Pro — $1.25 / $5.00 per 1M tokens",
      "gemini-2.5-pro-preview-05-06": "Gemini 2.5 Pro Preview — $1.25 / $10.00 per 1M tokens",
    };

    if (apiKey && apiEndpoint) {
      try {
        const res = await fetch(`${apiEndpoint}/v1beta/models?key=${apiKey}`);
        if (res.ok) {
          const data = await res.json();
          const result: Record<string, string> = {};
          for (const m of data?.models ?? []) {
            // Only include models that support generateContent
            if (!m.supportedGenerationMethods?.includes("generateContent")) continue;
            const id = m.name?.replace("models/", "") ?? "";
            result[id] = pricing[id] ?? m.displayName ?? id;
          }
          if (Object.keys(result).length > 0) return result;
        }
      } catch {
        // fall through to static list
      }
    }

    return pricing;
  }

  static async getDeepSeekModels(): Promise<Record<string, string>> {
    const apiKey = TranslateAllSettingHandler.getSetting("translate-all-gemini", "apiKeyDeepSeek") as string;
    const apiEndpoint = TranslateAllSettingHandler.getSetting("translate-all-gemini", "apiEndpoint") as string;

    // Pricing per 1M tokens (input cache hit / input / output), as of 2025
    const pricing: Record<string, string> = {
      "deepseek-chat":     "DeepSeek Chat V3 — $0.07 / $0.27 / $1.10 per 1M tokens",
      "deepseek-reasoner": "DeepSeek Reasoner R1 — $0.14 / $0.55 / $2.19 per 1M tokens",
    };

    if (apiKey && apiEndpoint) {
      try {
        const res = await fetch(`${apiEndpoint}/v1/models`, {
          headers: { "Authorization": `Bearer ${apiKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          const result: Record<string, string> = {};
          for (const m of data?.data ?? []) {
            result[m.id] = pricing[m.id] ?? m.id;
          }
          if (Object.keys(result).length > 0) return result;
        }
      } catch {
        // fall through to static list
      }
    }

    return pricing;
  }

  static async translateWithGemini(description: string): Promise<string | undefined> {
    const apiKey = TranslateAllSettingHandler.getSetting("translate-all-gemini", "apiKeyGemini") as string;
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

  static async translateWithDeepSeek(description: string): Promise<string | undefined> {
    const apiKey = TranslateAllSettingHandler.getSetting("translate-all-gemini", "apiKeyDeepSeek") as string;
    const apiEndpoint = TranslateAllSettingHandler.getSetting("translate-all-gemini", "apiEndpoint") as string;
    const system = TranslateAllSettingHandler.getSetting("translate-all-gemini", "targetSystem") as SupportedSystems;
    const language = TranslateAllSettingHandler.getSetting("translate-all-gemini", "targetLanguage") as SupportedLanguages;
    const model = TranslateAllSettingHandler.getSetting("translate-all-gemini", "targetModel") as string;
    const prompt = await Translator.generatePrompt(system, language, description);

    // DeepSeek uses OpenAI-compatible API
    const url = `${apiEndpoint}/v1/chat/completions`;

    let response: Response | undefined;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } catch (error) {
      ui?.notifications?.error(`DeepSeek API call failed. ${error}`);
      return undefined;
    }

    if (!response?.ok) {
      const errText = await response?.text().catch(() => "");
      ui?.notifications?.error(`DeepSeek API call failed: ${response?.status} ${errText}`);
      return undefined;
    }

    const data = await response.json();
    // OpenAI-compatible response shape
    return data?.choices?.[0]?.message?.content ?? undefined;
  }

  /**
   * Proxy a fetch request through the Foundry server socket to bypass CORS.
   */
  private static async serverFetch(url: string, options: { method: string; headers: Record<string, string>; body?: string }): Promise<{ ok: boolean; status: number; body: string }> {
    return new Promise((resolve, reject) => {
      (game as any).socket.emit(`module.translate-all-gemini`, {
        action: "proxyFetch",
        payload: { url, ...options },
      }, (res: any) => {
        if (res) resolve(res);
        else reject(new Error("No response from server socket"));
      });
    });
  }

  static async getOpenRouterModels(): Promise<Record<string, string>> {
    const apiKey = TranslateAllSettingHandler.getSetting("translate-all-gemini", "apiKeyOpenRouter") as string;

    // Static fallback — Gemini models available on OpenRouter
    const fallback: Record<string, string> = {
      "google/gemini-2.0-flash-001":      "Gemini 2.0 Flash — $0.10 / $0.40 per 1M tokens",
      "google/gemini-2.0-flash-lite-001": "Gemini 2.0 Flash Lite — $0.075 / $0.30 per 1M tokens",
      "google/gemini-1.5-flash":          "Gemini 1.5 Flash — $0.075 / $0.30 per 1M tokens",
      "google/gemini-1.5-pro":            "Gemini 1.5 Pro — $1.25 / $5.00 per 1M tokens",
      "google/gemini-2.5-pro-preview":    "Gemini 2.5 Pro Preview — $1.25 / $10.00 per 1M tokens",
    };

    if (!apiKey) return fallback;

    try {
      // OpenRouter supports CORS for /api/v1/models — try direct fetch first
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        const result: Record<string, string> = {};
        for (const m of data?.data ?? []) {
          // Only Gemini models
          if (!m.id?.startsWith("google/")) continue;
          const pricing = m.pricing
            ? `$${parseFloat(m.pricing.prompt) * 1_000_000} / $${parseFloat(m.pricing.completion) * 1_000_000} per 1M tokens`
            : "";
          result[m.id] = pricing ? `${m.name} — ${pricing}` : m.name;
        }
        if (Object.keys(result).length > 0) return result;
      }
    } catch {
      // fall through to static list
    }

    return fallback;
  }

  static async translateWithOpenRouter(description: string): Promise<string | undefined> {
    const apiKey = TranslateAllSettingHandler.getSetting("translate-all-gemini", "apiKeyOpenRouter") as string;
    const apiEndpoint = TranslateAllSettingHandler.getSetting("translate-all-gemini", "apiEndpoint") as string;
    const system = TranslateAllSettingHandler.getSetting("translate-all-gemini", "targetSystem") as SupportedSystems;
    const language = TranslateAllSettingHandler.getSetting("translate-all-gemini", "targetLanguage") as SupportedLanguages;
    const model = TranslateAllSettingHandler.getSetting("translate-all-gemini", "targetModel") as string;
    const prompt = await Translator.generatePrompt(system, language, description);

    // Use serverFetch to bypass CORS on chat completions endpoint
    try {
      const res = await Translator.serverFetch(`${apiEndpoint}/api/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "FoundryVTT Translate All",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        ui?.notifications?.error(`OpenRouter API call failed: ${res.status} ${res.body}`);
        return undefined;
      }
      const data = JSON.parse(res.body);
      return data?.choices?.[0]?.message?.content ?? undefined;
    } catch (err) {
      ui?.notifications?.error(`OpenRouter API call failed. ${err}`);
      return undefined;
    }
  }

  static async getGigaChatModels(): Promise<Record<string, string>> {
    // Pricing per 1000 tokens (input / output), as of 2025
    return {
      "GigaChat":       "GigaChat — ₽0.20 / ₽0.20 per 1K tokens",
      "GigaChat-Plus":  "GigaChat Plus — ₽1.00 / ₽1.00 per 1K tokens",
      "GigaChat-Pro":   "GigaChat Pro — ₽2.00 / ₽2.00 per 1K tokens",
      "GigaChat-Max":   "GigaChat Max — ₽8.00 / ₽8.00 per 1K tokens",
    };
  }

  static async translateWithGigaChat(description: string): Promise<string | undefined> {
    const credentials = TranslateAllSettingHandler.getSetting("translate-all-gemini", "apiKeyGigaChat") as string;
    const apiEndpoint = TranslateAllSettingHandler.getSetting("translate-all-gemini", "apiEndpoint") as string;
    const system = TranslateAllSettingHandler.getSetting("translate-all-gemini", "targetSystem") as SupportedSystems;
    const language = TranslateAllSettingHandler.getSetting("translate-all-gemini", "targetLanguage") as SupportedLanguages;
    const model = TranslateAllSettingHandler.getSetting("translate-all-gemini", "targetModel") as string;
    const prompt = await Translator.generatePrompt(system, language, description);

    // Step 1: get OAuth2 token via server proxy (bypasses CORS)
    let accessToken: string;
    try {
      const authRes = await Translator.serverFetch(
        "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "RqUID": crypto.randomUUID(),
            "Authorization": `Basic ${credentials}`,
          },
          body: "scope=GIGACHAT_API_PERS",
        },
      );
      if (!authRes.ok) {
        ui?.notifications?.error(`GigaChat auth failed: ${authRes.status} ${authRes.body}`);
        return undefined;
      }
      accessToken = JSON.parse(authRes.body).access_token;
    } catch (err) {
      ui?.notifications?.error(`GigaChat auth failed. ${err}`);
      return undefined;
    }

    // Step 2: call chat completions via server proxy
    try {
      const res = await Translator.serverFetch(
        `${apiEndpoint}/api/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
          }),
        },
      );
      if (!res.ok) {
        ui?.notifications?.error(`GigaChat API call failed: ${res.status} ${res.body}`);
        return undefined;
      }
      const data = JSON.parse(res.body);
      return data?.choices?.[0]?.message?.content ?? undefined;
    } catch (err) {
      ui?.notifications?.error(`GigaChat API call failed. ${err}`);
      return undefined;
    }
  }
}
