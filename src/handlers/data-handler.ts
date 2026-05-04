import { Directories, SupportedEntries, SupportedSystems, TranslateFunction } from "types";
import { TranslateAllSettingHandler } from "./settings-handler";

export class DataHandler {
  static getDescription(app: JournalPageSheet | ItemSheet | RollTableConfig, type: SupportedEntries) {
    const system = TranslateAllSettingHandler.getSetting("translate-all-gemini", "targetSystem") as SupportedSystems;

    if (type === SupportedEntries.JOURNAL) {
      return DataHandler.getDescriptionFromJournal(app as JournalPageSheet, system);
    } else if (type === SupportedEntries.ITEM) {
      return DataHandler.getDescriptionFromItem(app as ItemSheet, system);
    } else if (type === SupportedEntries.ROLLABLE_TABLE) {
      return DataHandler.getDescriptionFromRollableTable(app as RollTableConfig);
    }

    return undefined;
  }

  static getDescriptionFromJournal(app: JournalPageSheet, system: SupportedSystems): string | undefined {
    switch (system) {
      case SupportedSystems.PATHFINDER2E:
        return app.object.text.content || undefined;
      case SupportedSystems.DND5E:
        return (app?.options as any).document.text.content || undefined; // TODO: fix this type casting
      default:
        return undefined;
    }
  }

  static getDescriptionFromItem(app: ItemSheet, system: SupportedSystems): string | undefined {
    switch (system) {
      case SupportedSystems.PATHFINDER2E:
        return (app?.object?.system as any).description.value; // TODO: fix this type casting
      case SupportedSystems.DND5E:
        return (app?.options as any)?.document.system.description.value || undefined; // TODO: fix this type casting
      default:
        return undefined;
    }
  }

  static getDescriptionFromRollableTable(app: RollTableConfig): string | undefined {
    return app?.document?.description || (app as any)?.object?.description || undefined;
  }

  static getPathToUpdate(item: SupportedEntries): string {
    const system = TranslateAllSettingHandler.getSetting("translate-all-gemini", "targetSystem") as SupportedSystems;
    return Directories[system][item];
  }

  static getName(app: JournalPageSheet | ItemSheet | RollTableConfig, type: SupportedEntries): string | undefined {
    if (type === SupportedEntries.JOURNAL) return undefined; // journals don't have a translatable name field here
    if (type === SupportedEntries.ROLLABLE_TABLE) {
      return (app as RollTableConfig)?.document?.name || (app as any)?.object?.name || undefined;
    }
    return (app as ItemSheet)?.document?.name || (app as any)?.options?.document?.name || undefined;
  }

  static getDocType(app: JournalPageSheet | ItemSheet | RollTableConfig, type: SupportedEntries): string | undefined {
    if (type !== SupportedEntries.ITEM) return undefined;
    return (app as ItemSheet)?.document?.system?.type || (app as any)?.options?.document?.system?.type || undefined;
  }

  static async getTranslatedDescription(
    app: JournalPageSheet | ItemSheet | RollTableConfig,
    html: JQuery<HTMLElement>,
    item: SupportedEntries,
    translateFN: TranslateFunction,
  ) {
    const description = DataHandler.getDescription(app, item);
    if (!description) return;
    const path = DataHandler.getPathToUpdate(item);
    const name = DataHandler.getName(app, item);
    const docType = DataHandler.getDocType(app, item);
    translateFN(app, html, description, path, name, docType);
  }
}
