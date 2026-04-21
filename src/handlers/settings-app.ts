import { Translator } from "../translator";
import { SupportedAIProviders, SupportedSystems } from "../types";
import { TranslateAllSettingHandler } from "./settings-handler";

export class TranslateAllSettingsApp extends FormApplication {
  private activeTab: SupportedAIProviders;
  private models: Record<string, string> = {};

  constructor() {
    super({});
    this.activeTab = TranslateAllSettingHandler.getSetting("translate-all-gemini", "aiProvider") as SupportedAIProviders ?? SupportedAIProviders.GEMINI;
  }

  static get defaultOptions(): FormApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "translate-all-settings",
      title: "Translate All — Settings",
      template: false,
      width: 560,
      height: "auto",
      closeOnSubmit: true,
    } as Partial<FormApplicationOptions>);
  }

  async _render(force?: boolean, options?: RenderOptions): Promise<void> {
    this.models = (await Translator.getModels(this.activeTab)) ?? {};
    await super._render(force, options);
  }

  async getData(): Promise<object> {
    const s = (key: string) => TranslateAllSettingHandler.getSetting("translate-all-gemini", key as any) as string;
    return {
      activeTab: this.activeTab,
      tabs: [
        { id: SupportedAIProviders.GEMINI,      label: "Google Gemini" },
        { id: SupportedAIProviders.DEEPSEEK,    label: "DeepSeek" },
        { id: SupportedAIProviders.GIGACHAT,    label: "GigaChat" },
        { id: SupportedAIProviders.OPENROUTER,  label: "OpenRouter" },
      ],
      general: {
        targetSystem:   s("targetSystem"),
        targetLanguage: s("targetLanguage"),
        promptTemplatePath: s("promptTemplatePath"),
        systems: { [SupportedSystems.DND5E]: "D&D 5e", [SupportedSystems.PATHFINDER2E]: "Pathfinder 2e" },
      },
      gemini:     { apiKey: s("apiKeyGemini"),     model: s("targetModel") },
      deepseek:   { apiKey: s("apiKeyDeepSeek"),   model: s("targetModel") },
      gigachat:   { apiKey: s("apiKeyGigaChat"),   model: s("targetModel") },
      openrouter: { apiKey: s("apiKeyOpenRouter"), model: s("targetModel") },
      models: this.models,
    };
  }

  /** Build HTML manually since we don't use .hbs files */
  async _renderInner(_data: object): Promise<JQuery> {
    const data = _data as any;
    const tabBtns = data.tabs.map((t: any) => `
      <a class="item${t.id === data.activeTab ? " active" : ""}" data-tab="${t.id}">${t.label}</a>
    `).join("");

    const modelOptions = Object.entries(data.models as Record<string, string>).map(([id, label]) =>
      `<option value="${id}" ${id === data[data.activeTab]?.model ? "selected" : ""}>${label}</option>`
    ).join("");

    const systemOptions = Object.entries(data.general.systems as Record<string, string>).map(([id, label]) =>
      `<option value="${id}" ${id === data.general.targetSystem ? "selected" : ""}>${label}</option>`
    ).join("");

    const providerHints: Record<string, string> = {
      [SupportedAIProviders.GEMINI]:      "Get your key at <a href='https://aistudio.google.com/app/apikey' target='_blank'>aistudio.google.com</a>",
      [SupportedAIProviders.DEEPSEEK]:    "Get your key at <a href='https://platform.deepseek.com' target='_blank'>platform.deepseek.com</a>",
      [SupportedAIProviders.GIGACHAT]:    "Base64-encoded ClientId:ClientSecret from <a href='https://developers.sber.ru/studio' target='_blank'>developers.sber.ru</a>",
      [SupportedAIProviders.OPENROUTER]:  "Get your key at <a href='https://openrouter.ai/keys' target='_blank'>openrouter.ai/keys</a>",
    };

    const html = `
<form>
  <nav class="tabs" data-group="provider-tabs">
    ${tabBtns}
  </nav>

  <section class="tab-content" style="padding:12px 0;">
    <div class="form-group">
      <label>API Key</label>
      <input type="password" name="apiKey" value="${data[data.activeTab]?.apiKey ?? ""}" autocomplete="off"/>
      <p class="hint">${providerHints[data.activeTab] ?? ""}</p>
    </div>

    <div class="form-group">
      <label>Model
        <button type="button" id="refresh-models" style="margin-left:8px;padding:2px 8px;font-size:0.85em;">
          <i class="fas fa-sync-alt"></i> Refresh
        </button>
      </label>
      <select name="targetModel">${modelOptions}</select>
    </div>
  </section>

  <hr/>

  <div class="form-group">
    <label>Game System</label>
    <select name="targetSystem">${systemOptions}</select>
  </div>

  <div class="form-group">
    <label>Target Language</label>
    <input type="text" name="targetLanguage" value="${data.general.targetLanguage ?? ""}"/>
    <p class="hint">Language to translate into (e.g. Russian, Italian, French)</p>
  </div>

  <div class="form-group">
    <label>Prompt Template File</label>
    <input type="text" name="promptTemplatePath" value="${data.general.promptTemplatePath ?? ""}"/>
    <p class="hint">Optional path to a custom prompt file. Leave empty for default.</p>
  </div>

  <footer class="sheet-footer flexrow" style="margin-top:12px;">
    <button type="submit" name="submit"><i class="fas fa-save"></i> Save</button>
  </footer>
</form>`;

    return $(html);
  }

  activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Tab switching
    html.find(".tabs .item").on("click", async (e) => {
      const tab = $(e.currentTarget).data("tab") as SupportedAIProviders;
      if (tab === this.activeTab) return;
      this.activeTab = tab;
      await this._render(true);
    });

    // Refresh models
    html.find("#refresh-models").on("click", async () => {
      const btn = html.find("#refresh-models");
      btn.prop("disabled", true).find("i").addClass("fa-spin");
      this.models = (await Translator.getModels(this.activeTab)) ?? {};
      const select = html.find("[name='targetModel']");
      const current = select.val() as string;
      select.empty();
      for (const [id, label] of Object.entries(this.models)) {
        select.append(`<option value="${id}" ${id === current ? "selected" : ""}>${label}</option>`);
      }
      btn.prop("disabled", false).find("i").removeClass("fa-spin");
    });
  }

  async _updateObject(_event: Event, formData: Record<string, unknown>): Promise<void> {
    const set = (key: string, val: unknown) =>
      game.settings!.set("translate-all-gemini" as "core", key as any, val);

    // Save active provider
    await set("aiProvider", this.activeTab);

    // Save provider-specific API key
    const keyMap: Record<SupportedAIProviders, string> = {
      [SupportedAIProviders.GEMINI]:     "apiKeyGemini",
      [SupportedAIProviders.DEEPSEEK]:   "apiKeyDeepSeek",
      [SupportedAIProviders.GIGACHAT]:   "apiKeyGigaChat",
      [SupportedAIProviders.OPENROUTER]: "apiKeyOpenRouter",
    };
    if (formData.apiKey !== undefined) {
      await set(keyMap[this.activeTab], formData.apiKey);
    }

    await set("targetModel",          formData.targetModel);
    await set("targetSystem",         formData.targetSystem);
    await set("targetLanguage",       formData.targetLanguage);
    await set("promptTemplatePath",   formData.promptTemplatePath ?? "");
  }
}
