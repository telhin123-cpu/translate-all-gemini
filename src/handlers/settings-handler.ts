import { Translator } from "../translator";
import { KeyFor, SupportedAIProviders, SupportedSystems, TranslateAllNamespace } from "../types";
import { TranslateAllSettingsApp } from "./settings-app";

export class TranslateAllSettingHandler {
  gameSettings: Game["settings"] = game.settings!;
  readonly settings = {
    targetSystem: {
      name: "translate-all-gemini.settings.game.system.name",
      hint: "translate-all-gemini.settings.game.system.hint",
      scope: "world",
      config: true,
      type: String,
      default: SupportedSystems.PATHFINDER2E,
      choices: {
        [SupportedSystems.DND5E]: "D&D 5e",
        [SupportedSystems.PATHFINDER2E]: "Pathfinder 2e",
      },
    },
    aiProvider: {
      name: "translate-all-gemini.settings.aiProvider.name",
      hint: "translate-all-gemini.settings.aiProvider.hint",
      scope: "world",
      config: false,
      type: String,
      default: SupportedAIProviders.GEMINI,
      choices: {
        [SupportedAIProviders.GEMINI]: "Google Gemini",
        [SupportedAIProviders.DEEPSEEK]: "DeepSeek",
        [SupportedAIProviders.GIGACHAT]: "GigaChat (Sber)",
        [SupportedAIProviders.OPENROUTER]: "OpenRouter (Gemini via proxy)",
      },
    },
    apiKeyGemini: {
      name: "translate-all-gemini.settings.apiKeyGemini.name",
      hint: "translate-all-gemini.settings.apiKeyGemini.hint",
      scope: "world",
      config: false,
      type: String,
      default: "",
    },
    apiKeyDeepSeek: {
      name: "translate-all-gemini.settings.apiKeyDeepSeek.name",
      hint: "translate-all-gemini.settings.apiKeyDeepSeek.hint",
      scope: "world",
      config: false,
      type: String,
      default: "",
    },
    apiKeyGigaChat: {
      name: "translate-all-gemini.settings.apiKeyGigaChat.name",
      hint: "translate-all-gemini.settings.apiKeyGigaChat.hint",
      scope: "world",
      config: false,
      type: String,
      default: "",
    },
    apiKeyOpenRouter: {
      name: "translate-all-gemini.settings.apiKeyOpenRouter.name",
      hint: "translate-all-gemini.settings.apiKeyOpenRouter.hint",
      scope: "world",
      config: false,
      type: String,
      default: "",
    },
    apiEndpoint: {
      name: "translate-all-gemini.settings.apiEndpoint.name",
      hint: "translate-all-gemini.settings.apiEndpoint.hint",
      scope: "world",
      config: false,
      type: String,
      default: "https://generativelanguage.googleapis.com",
    },
    targetLanguage: {
      name: "translate-all-gemini.settings.language.name",
      hint: "translate-all-gemini.settings.language.hint",
      scope: "world",
      config: false,
      type: String,
      default: "Russian",
    },
    targetModel: {
      name: "translate-all-gemini.settings.model.name",
      hint: "translate-all-gemini.settings.model.hint",
      scope: "world",
      config: false,
      type: String,
      default: "gemini-2.0-flash",
      choices: {},
    },
    promptModel: {
      name: "translate-all-gemini.settings.promptTemplatePath.name",
      hint: "translate-all-gemini.settings.promptTemplatePath.hint",
      scope: "world",
      config: false,
      type: String,
      default: "",
    },
  };

  constructor() {}

  async init(): Promise<void> {
    await this._registerSettings();
    this._registerMenuButton();
  }

  private _registerMenuButton(): void {
    game.settings!.registerMenu("translate-all-gemini" as "core", "settingsMenu" as any, {
      name: "Translate All Settings",
      label: "Configure",
      hint: "Configure AI providers, API keys, models and translation settings.",
      icon: "fas fa-language",
      type: TranslateAllSettingsApp as any,
      restricted: true,
    });
  }

  private async _registerSettings(): Promise<void> {
    this._register(
      "translate-all-gemini" as TranslateAllNamespace,
      "targetSystem" as KeyFor<TranslateAllNamespace>,
      this.settings.targetSystem,
    );
    this._register(
      "translate-all-gemini" as TranslateAllNamespace,
      "aiProvider" as KeyFor<TranslateAllNamespace>,
      this.settings.aiProvider,
    );
    this._register(
      "translate-all-gemini" as TranslateAllNamespace,
      "apiKeyGemini" as KeyFor<TranslateAllNamespace>,
      this.settings.apiKeyGemini,
    );
    this._register(
      "translate-all-gemini" as TranslateAllNamespace,
      "apiKeyDeepSeek" as KeyFor<TranslateAllNamespace>,
      this.settings.apiKeyDeepSeek,
    );
    this._register(
      "translate-all-gemini" as TranslateAllNamespace,
      "apiKeyGigaChat" as KeyFor<TranslateAllNamespace>,
      this.settings.apiKeyGigaChat,
    );
    this._register(
      "translate-all-gemini" as TranslateAllNamespace,
      "apiKeyOpenRouter" as KeyFor<TranslateAllNamespace>,
      this.settings.apiKeyOpenRouter,
    );
    this._register(
      "translate-all-gemini" as TranslateAllNamespace,
      "apiEndpoint" as KeyFor<TranslateAllNamespace>,
      this.settings.apiEndpoint,
    );
    this._register(
      "translate-all-gemini" as TranslateAllNamespace,
      "targetLanguage" as KeyFor<TranslateAllNamespace>,
      this.settings.targetLanguage,
    );
    const provider = (this.gameSettings.get("translate-all-gemini" as "core", "aiProvider" as KeyFor<"core">) ?? SupportedAIProviders.GEMINI) as SupportedAIProviders;
    const models = await Translator.getModels(provider);
    if (models) {
      this.settings.targetModel.choices = models;
    }

    this._register(
      "translate-all-gemini" as TranslateAllNamespace,
      "targetModel" as KeyFor<TranslateAllNamespace>,
      this.settings.targetModel,
    );
    this._register(
      "translate-all-gemini" as TranslateAllNamespace,
      "promptTemplatePath" as KeyFor<TranslateAllNamespace>,
      this.settings.promptModel,
    );
  }

  // TODO: Fix this type casting
  _register(namespace: TranslateAllNamespace, key: KeyFor<TranslateAllNamespace>, config: any): void {
    this.gameSettings.register(namespace as "core", key as KeyFor<"core">, config);
  }

  // TODO: Fix this type casting
  static getSetting(
    namespace: TranslateAllNamespace,
    key: KeyFor<TranslateAllNamespace>,
  ): string | boolean | number | object | undefined {
    const gameSettings = game.settings!;
    return gameSettings.get(namespace as "core", key as KeyFor<"core">);
  }
}
