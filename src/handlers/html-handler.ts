import { Translator } from "translator";
import { SupportedSystems } from "types";
import { TranslateAllSettingHandler } from "./settings-handler";

export class HTMLHandler {
  static async translateApp(
    app: JournalPageSheet | ItemSheet,
    html: JQuery<HTMLElement>,
    description: string,
    path: string,
  ): Promise<void> {
    const htmlQuery: JQuery<HTMLElement> = html instanceof jQuery ? html : $(html);

    const header = htmlQuery.find(".window-header");
    if (header.find("a.translate-btn").length) return;

    const btn = $(
      `<a class="translate-btn header-button control" title="Translate Description" style="margin-right: 4px;">
          <i class="fas fa-language"></i>
        </a>`,
    );

    btn.on("click", async () => {
      // Lock UI
      const icon = btn.find("i");
      icon.removeClass("fa-language").addClass("fa-spinner fa-spin");
      btn.css("pointer-events", "none");
      const overlay = $(`<div class="translate-overlay" style="position:absolute;inset:0;z-index:9999;cursor:wait;"></div>`);
      htmlQuery.css("position", "relative").append(overlay);

      try {
        const translated = await Translator.translate(description);
        if (!translated) {
          ui?.notifications?.error("Translation failed or returned empty.");
          return;
        }
        await HTMLHandler.updateDescription(app, translated, path);
      } finally {
        // Restore UI
        overlay.remove();
        icon.removeClass("fa-spinner fa-spin").addClass("fa-language");
        btn.css("pointer-events", "");
      }
    });

    header.find(".close").before(btn);
  }

  private static async updateDescription(
    app: JournalPageSheet | ItemSheet,
    translation: string,
    path: string,
  ): Promise<void> {
    const system = TranslateAllSettingHandler.getSetting("translate-all-gemini", "targetSystem") as SupportedSystems;
    if (system === SupportedSystems.DND5E) {
      await this.update5eDescription(app, translation, path);
    } else if (system === SupportedSystems.PATHFINDER2E) {
      await this.updatePF2EDescription(app, translation, path);
    }
  }

  private static async update5eDescription(
    app: JournalPageSheet | ItemSheet,
    translation: string,
    path: string,
  ): Promise<void> {
    try {
      const item = app.document;
      await item.update({ [path]: translation });
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
  ): Promise<void> {
    const item = app.object;

    try {
      if (path.includes("system")) {
        await item.update({ [path]: translation });
      } else {
        await item.updateSource({ [path]: translation });
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
