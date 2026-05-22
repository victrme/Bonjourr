import type { WeatherConditions } from '../../../types/shared.ts'

const CONDITIONS: WeatherConditions[] = [
    'clearsky',
    'fewclouds',
    'brokenclouds',
    'overcastclouds',
    'sunnyrain',
    'lightrain',
    'rain',
    'thunderstorm',
    'snow',
    'mist',
]

const accuweatherConditions: Record<WeatherConditions, number[]> = {
    clearsky: [1, 2, 3, 33, 34, 35],
    fewclouds: [4, 5, 36, 37],
    brokenclouds: [6, 7, 38],
    overcastclouds: [8],
    sunnyrain: [14, 17],
    lightrain: [12, 13, 39],
    rain: [18, 19, 29, 40],
    thunderstorm: [15, 16, 41, 42],
    snow: [20, 21, 22, 23, 24, 25, 26, 43, 44],
    mist: [11],
}

const accuweatherIconCodes: Record<WeatherConditions, string[]> = {
    clearsky: ['1', '2', '3', '33', '34', '35'],
    fewclouds: ['4', '5', '36', '37'],
    brokenclouds: ['6', '7', '38'],
    overcastclouds: ['8'],
    sunnyrain: ['14', '17'],
    lightrain: ['12', '13', '39'],
    rain: ['18', '19', '29', '40'],
    thunderstorm: ['15', '16', '41', '42'],
    snow: ['20', '21', '22', '23', '24', '25', '26', '43', '44'],
    mist: ['11'],
}

const descriptionRules: [WeatherConditions, RegExp][] = [
    ['thunderstorm', /thunder|tormen|orage|gewitter|tormenta|tuono/i],
    ['snow', /snow|neige|schnee|nieve|snø|lumi|sne/i],
    ['mist', /fog|mist|haze|brouillard|nebel|niebla|brume|smog/i],
    ['sunnyrain', /sun.*rain|rain.*sun|averses|sonnenschein.*regen/i],
    ['lightrain', /light rain|drizzle|bruine|légère|leichte regen|lluvia ligera/i],
    ['rain', /rain|shower|pluie|regn|lluvia|pioggia|regen|ploaie/i],
    ['overcastclouds', /overcast|couvert|bedeckt|nublado|coperto/i],
    ['brokenclouds', /broken|mostly cloudy|très nuageux|stark bewölkt/i],
    ['fewclouds', /partly|few cloud|partiellement|teilweise|parcialmente|poco nuvoloso/i],
    ['clearsky', /clear|sunny|bright|soleil|sonnig|soleado|klar|sereno|ensoleillé/i],
]

function isWeatherCondition(icon: string): icon is WeatherConditions {
    return CONDITIONS.includes(icon as WeatherConditions)
}

function conditionFromAccuweatherCode(icon: string | number): WeatherConditions | undefined {
    const id = typeof icon === 'number' ? icon : parseInt(icon, 10)

    if (Number.isNaN(id)) {
        return undefined
    }

    for (const [condition, codes] of Object.entries(accuweatherConditions)) {
        if (codes.includes(id)) {
            return condition as WeatherConditions
        }
    }

    return undefined
}

function conditionFromAccuweatherIcon(icon: string): WeatherConditions | undefined {
    if (!icon) {
        return undefined
    }

    for (const [condition, codes] of Object.entries(accuweatherIconCodes)) {
        if (codes.includes(icon)) {
            return condition as WeatherConditions
        }
    }

    return conditionFromAccuweatherCode(icon)
}

function conditionFromDescription(description: string): WeatherConditions | undefined {
    const text = description.trim().toLowerCase()

    if (!text) {
        return undefined
    }

    for (const [condition, pattern] of descriptionRules) {
        if (pattern.test(text)) {
            return condition
        }
    }

    return undefined
}

export function resolveWeatherCondition(icon: string | number, description: string): WeatherConditions {
    const fromCode = conditionFromAccuweatherCode(icon)
    const fromIcon = typeof icon === 'string' ? conditionFromAccuweatherIcon(icon) : undefined
    const fromDescription = conditionFromDescription(description)
    const parsedIcon = typeof icon === 'string' && isWeatherCondition(icon) ? icon : undefined

    if (fromCode) {
        return fromCode
    }

    if (fromIcon) {
        return fromIcon
    }

    if (parsedIcon && parsedIcon !== 'clearsky') {
        return parsedIcon
    }

    if (fromDescription) {
        return fromDescription
    }

    if (parsedIcon) {
        return parsedIcon
    }

    return 'fewclouds'
}
