// Uses ISO 639
// https://wikipedia.org/wiki/List_of_ISO_639_language_codes

export const langList = {
    // Core
    en: 'English',
    fr: 'Français',
    de: 'Deutsch',
    es: 'Español',
    it: 'Italiano',

    // Western / Northern Europe
    ca: 'Català',
    nl: 'Nederlands',
    da: 'Dansk',
    sv: 'Svenska',
    nb: 'Norsk',
    is: 'Íslenska',
    fi: 'Suomi',

    // Southern / Eastern Europe
    'pt-BR': 'Português (Brasil)',
    'pt-PT': 'Português (Portugal)',
    pl: 'Polski',
    cs: 'Čeština',
    sk: 'Slovenský',
    hu: 'Magyar',
    ro: 'Română',
    hr: 'Hrvatski',
    el: 'Ελληνικά',
    mt: 'Malti',

    // Cyrillic / Balkan
    sr: 'Српски (ћирилица)',
    'sr-YU': 'Srpski (latinica)',
    ru: 'Русский',
    uk: 'Українська',
    be: 'Беларуская',

    // Middle East / Central Asia
    ar: 'العربية',
    he: 'עִברִית',
    fa: 'فارسی',
    tr: 'Türkçe',
    az: 'Azərbaycan',
    hy: 'Հայերեն',
    uz: "O'zbekcha",

    // South Asia
    hi: 'Hindi',
    mr: 'Marathi',
    te: 'తెలుగు',
    bn: 'বাংলা',

    // Southeast Asia
    id: 'Bahasa Indonesia',
    vi: 'Tiếng Việt',

    // East Asia
    'zh-CN': '中国简体中文',
    'zh-HK': '香港繁體中文',
    'zh-TW': '臺灣正體中文',
    'nan-Hant-TW': '臺灣台語（漢羅）',
    ko: '한국어',
    ja: '日本語',
    // Other
}

// uses basic latin characters if not included
export const subsets = {
    el: 'greek',
    ar: 'arabic',
    fa: 'arabic',
    ru: 'cyrillic',
    uk: 'cyrillic',
    sr: 'cyrillic',
    be: 'cyrillic',
    sk: 'latin-ext',
    nb: 'latin-ext',
    is: 'latin-ext',
    hr: 'latin-ext',
    cs: 'latin-ext',
    pl: 'latin-ext',
    ro: 'latin-ext',
    'sr-YU': 'latin-ext',
    tr: 'latin-ext',
    hu: 'latin-ext',
    vi: 'latin-ext',
    az: 'latin-ext',
    uz: 'latin-ext',
    ja: 'japanese',
    hy: 'armenian',
    te: 'telugu',
    he: 'hebrew',
    'zh-CN': 'chinese-simplified',
    'zh-HK': 'chinese-traditional',
    'zh-TW': 'chinese-traditional',
    'nan-Hant-TW': 'chinese-traditional',
    ko: 'korean',
}

// languages bonjourr.fr is translated in
export const siteLangs: Record<string, string> = {
    // bonjourrLanguage: siteLanguage
    fr: 'fr',
    ru: 'ru',

    // ukrainian and belarusian can link to russian site until we have an actual translation for them
    'uk': 'ru',
    'be': 'ru',
}
