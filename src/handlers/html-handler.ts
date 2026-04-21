import { Translator } from "translator";
import { SupportedSystems } from "types";
import { TranslateAllSettingHandler } from "./settings-handler";

export class HTMLHandler {
  static async translateApp(
    app: JournalPageSheet | ItemSheet,
    html: JQuery<HTMLElement>,
    description: string,
    path: string,
    name?: string,
  ): Promise<void> {
    const htmlQuery: JQuery<HTMLElement> = html instanceof jQuery ? html : $(html);

    const header = htmlQuery.find(".window-header");
    if (!header.length) return;
    if (header.find(".translate-btn").length) return;

    const btn = $(
      `<a class="translate-btn header-button control" title="Translate Description" style="margin-right: 4px;">
          <i class="fas fa-language"></i>
        </a>`,
    );

    btn.on("click", async () => {
      const icon = btn.find("i");
      icon.removeClass("fa-language").addClass("fa-spinner fa-spin");
      btn.css("pointer-events", "none");
      const overlay = $(`<div class="translate-overlay" style="position:absolute;inset:0;z-index:9999;cursor:wait;"></div>`);
      const prevPosition = htmlQuery.css("position");
      htmlQuery.css("position", "relative").append(overlay);

      try {
        const translated = await Translator.translate(description);
        if (!translated) {
          ui?.notifications?.error("Translation failed or returned empty.");
          return;
        }
        // Translate name if present
        let translatedName: string | undefined;
        if (name) {
          translatedName = await Translator.translate(name);
        }
        await HTMLHandler.updateDescription(app, translated, path, translatedName);
      } finally {
        overlay.remove();
        htmlQuery.css("position", prevPosition || "");
        icon.removeClass("fa-spinner fa-spin").addClass("fa-language");
        btn.css("pointer-events", "");
      }
    });

    // Try different close button selectors for different Foundry versions
    const closeBtn = header.find(".close, [data-action='close'], button.close").first();
    if (closeBtn.length) {
      closeBtn.before(btn);
    } else {
      header.append(btn);
    }
  }

  private static async updateDescription(
    app: JournalPageSheet | ItemSheet,
    translation: string,
    path: string,
    translatedName?: string,
  ): Promise<void> {
    const system = TranslateAllSettingHandler.getSetting("translate-all-gemini", "targetSystem") as SupportedSystems;
    if (system === SupportedSystems.DND5E) {
      await this.update5eDescription(app, translation, path, translatedName);
    } else if (system === SupportedSystems.PATHFINDER2E) {
      await this.updatePF2EDescription(app, translation, path, translatedName);
    }
  }

  private static async update5eDescription(
    app: JournalPageSheet | ItemSheet,
    translation: string,
    path: string,
    translatedName?: string,
  ): Promise<void> {
    try {
      const item = app.document;
      const updates: Record<string, string> = { [path]: translation };
      if (translatedName) updates["name"] = translatedName;
      await item.update(updates);
      app.render(true);
      app.close();
    } catch (error) {
      ui?.notifications?.error(`Error updating item description: ${error}`);
    }
  }

  private static async updatePF2EDescription(
    app: JournalPageSheet | ItemSheet,
    translation: string,
    path: string,
    translatedName?: string,
  ): Promise<void> {
    const item = app.object;

    try {
      const updates: Record<string, string> = { [path]: translation };
      if (translatedName) updates["name"] = translatedName;
      if (path.includes("system")) {
        await item.update(updates);
      } else {
        await item.updateSource(updates);
      }
    } catch (error) {
      ui?.notifications?.error(`Error updating item description: ${error}`);
    }

    app.object.render(true);
    await app.object.sheet?.close();

    await app.render(true);
    await app.close();
  }
}
