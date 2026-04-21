export const MODULE_NAME = 'translate-all-gemini';

export interface TranslateConfigSettingConfig {
  'translate-all-gemini.apiKeyGemini': string;
  'translate-all-gemini.apiKeyDeepSeek': string;
  'translate-all-gemini.targetSystem': string;
  'translate-all-gemini.targetLanguage': string;
  'translate-all-gemini.targetModel': string;
  'translate-all-gemini.apiEndpoint': string;
  'translate-all-gemini.promptTemplatePath': string;
  'translate-all-gemini.aiProvider': string;
}

export type TranslateAllNamespace = typeof MODULE_NAME | ClientSettings.Namespace;

type GetKeys<
  N extends string,
  SettingPath extends PropertyKey,
> = SettingPath extends `${N}.${infer Name}` ? Name : never;
export type KeyFor<N extends TranslateAllNamespace> = GetKeys<
  N,
  keyof TranslateConfigSettingConfig
>;

export interface TranslateFunction {
  (
    app: JournalPageSheet | ItemSheet,
    html: JQuery<HTMLElement>,
    description: string,
    path: string,
  ): Promise<void>;
}

export enum SupportedAIProviders {
  GEMINI = 'gemini',
  DEEPSEEK = 'deepseek',
}

export enum SupportedSystems {
  DND5E = 'D&D5E',
  PATHFINDER2E = 'PF2E',
}

export enum SupportedLanguages {
  ENGLISH = 'english',
  ITALIAN = 'italian',
}

export enum SupportedEntries {
  JOURNAL = 'journal',
  ITEM = 'item',
}

export const Directories = {
  [SupportedSystems.DND5E]: {
    [SupportedEntries.JOURNAL]: 'text.content',
    [SupportedEntries.ITEM]: 'system.description.value',
  },
  [SupportedSystems.PATHFINDER2E]: {
    [SupportedEntries.JOURNAL]: 'text.content',
    [SupportedEntries.ITEM]: 'system.description.value',
  },
};
