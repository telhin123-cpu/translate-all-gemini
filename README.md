# FoundryVTT Translate ALL (Gemini)

![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/telhin123-cpu/translate-all-gemini?style=for-the-badge)
![Total downloads](https://img.shields.io/github/downloads/telhin123-cpu/translate-all-gemini/total?style=for-the-badge)

A FoundryVTT module that uses **Google Gemini AI** to translate:
- Spells
- Items
- Abilities
- Journal Entries

into your specified language.

---

## Setup Instructions

1. Visit [https://aistudio.google.com/](https://aistudio.google.com/) and sign in with your Google account.
2. Get your API key: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
   - ⚠️ **Important:** Copy the key and store it somewhere safe.
   - Set a **spending limit** in Google Cloud Console. I'm not responsible for any charges.
   - Gemini offers a free tier with generous usage limits. Check [Gemini pricing](https://ai.google.dev/pricing).
3. Enter the API key in the FoundryVTT module settings.
4. Select your target language and Gemini model.
5. You're ready to Translate ALL!

---

## Module Settings

| Setting | Description |
|---|---|
| API Key | Your Google Gemini API key |
| API Endpoint | Gemini API base URL (default: `https://googleapis.com`) |
| Target System | Game system: D&D 5e or Pathfinder 2e |
| Target Language | Language to translate into (e.g. Russian, Italian, French) |
| Model | Gemini model to use (see below) |
| Prompt Template | Optional path to a custom prompt file |

### Available Models

- `gemini-1.5-flash` — fast and affordable (recommended)
- `gemini-1.5-pro` — more capable, higher cost
- `gemini-2.0-flash` — latest generation, fast

---

## How It Works

A new **"Translate"** button will appear where translation is supported:
![Before translation](./images/before_translation.png)

After clicking it, wait a few seconds and the content will be automatically translated:
![After translation](./images/after_translation.png)

---

## Custom Prompt Template

You can provide a custom prompt file via the file picker in settings. If left empty, the default prompt is used:

> Translate the following `{system}` item/spell description into `{language}`. Keep the same format and structure, like HTML tags, and do not translate the item name or any specific game terms. Do not add any additional code encapsulation or formatting. Just return the translated text.

---

## Changelog

View the full changelog [HERE](./CHANGELOG.md)

---

## Contributions

Contributions are welcome! Feature development will be slow and based on community interest.

You can find the current to-do list [HERE](./TODO.md).
