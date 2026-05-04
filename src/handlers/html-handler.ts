import { Translator } from "translator";
import { SupportedSystems } from "types";
import { TranslateAllSettingHandler } from "./settings-handler";

export class HTMLHandler {
  static async translateApp(
    app: JournalPageSheet | ItemSheet | RollTableConfig,
    html: JQuery<HTMLElement>,
    description: string,
    path: string,
    name?: string,
    docType?: string,
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
      // const icon = btn.find("i");
      // icon.removeClass("fa-language").addClass("fa-spinner fa-spin");
      // btn.css("pointer-events", "none");
      // const overlay = $(`<div class="translate-overlay" style="position:absolute;inset:0;z-index:9999;cursor:wait;"></div>`);
      // const prevPosition = htmlQuery.css("position");
      // htmlQuery.css("position", "relative").append(overlay);

      // Находим основной контейнер с контентом, чтобы не ломать хедер окна
      const contentContainer = htmlQuery.find('.sheet-body, .window-content').first();
      const target = contentContainer.length ? contentContainer : htmlQuery;

      // Сохраняем оригинальное позиционирование только если оно не задано
      const prevPosition = target.css("position");
      if (prevPosition === 'static') {
          target.css("position", "relative");
      }

      const overlay = $(`
        <div class="translate-overlay" style="
          position: absolute;
          inset: 0;
          z-index: 9999;
          cursor: wait;
          background: rgba(0,0,0,0.05); /* Немного затемним, чтобы было видно работу */
          border-radius: 5px;
        "></div>
      `);

      target.append(overlay);
      
      try {
        const icon = btn.find("i");
        icon.removeClass("fa-language").addClass("fa-spinner fa-spin");
        btn.css("pointer-events", "none");

        const totalLabel = `[translate-all] total`;
        console.time(totalLabel);

        console.time(`[translate-all] description`);
        const translated = description ? await Translator.translate(description) : undefined;
        console.timeEnd(`[translate-all] description`);

        if (!translated && description) {
          ui?.notifications?.error("Translation failed or returned empty.");
          return;
        }

        // Translate name: extract origin to avoid double-wrapping, format as "${translated} [${origin}]"
        let translatedName: string | undefined;
        if (name) {
          const originMatch = name.match(/^.+\[(.+)\]$/);
          const origin = originMatch ? originMatch[1] : name;
          console.time(`[translate-all] name`);
          const translatedRaw = await Translator.translate(origin);
          console.timeEnd(`[translate-all] name`);
          if (translatedRaw) translatedName = `${translatedRaw} [${origin}]`;
        }

        // Translate docType if present
        let translatedDocType: string | undefined;
        if (docType) {
          console.time(`[translate-all] docType`);
          translatedDocType = await Translator.translate(docType);
          console.timeEnd(`[translate-all] docType`);
        }

        console.time(`[translate-all] save`);
        await HTMLHandler.updateDescription(app, translated, path, translatedName, translatedDocType);
        console.timeEnd(`[translate-all] save`);

        console.timeEnd(totalLabel);
      } finally {
        // overlay.remove();
        // htmlQuery.css("position", prevPosition || "");
        // icon.removeClass("fa-spinner fa-spin").addClass("fa-language");
        // btn.css("pointer-events", "");
        overlay.remove();
        if (prevPosition === 'static') {
            target.css("position", prevPosition);
        }
        
        // ОБЯЗАТЕЛЬНО возвращаем кнопку в рабочее состояние:
        const icon = btn.find("i");
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
    app: JournalPageSheet | ItemSheet | RollTableConfig,
    translation: string,
    path: string,
    translatedName?: string,
    translatedDocType?: string,
  ): Promise<void> {
    const system = TranslateAllSettingHandler.getSetting("translate-all-gemini", "targetSystem") as SupportedSystems;
    if (system === SupportedSystems.DND5E) {
      await this.update5eDescription(app, translation, path, translatedName, translatedDocType);
    } else if (system === SupportedSystems.PATHFINDER2E) {
      await this.updatePF2EDescription(app, translation, path, translatedName);
    }
  }

  private static async update5eDescription(
    app: JournalPageSheet | ItemSheet | RollTableConfig,
    translation: string,
    path: string,
    translatedName?: string,
    translatedDocType?: string,
  ): Promise<void> {
    try {
      const item = app.document;
      const updates: Record<string, string> = { [path]: translation };
      if (translatedName) updates["name"] = translatedName;
      if (translatedDocType) updates["system.type"] = translatedDocType;
      await item.update(updates);
      app.render(true);
    } catch (error) {
      ui?.notifications?.error(`Error updating item description: ${error}`);
    }
  }

  private static async updatePF2EDescription(
    app: JournalPageSheet | ItemSheet | RollTableConfig,
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
