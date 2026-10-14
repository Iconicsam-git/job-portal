/**
 * Server-side Location Normalization Utility
 * Normalizes free-text locations such as "Abuja", "Abuja FCT", "Abuja, Nigeria"
 * into a canonical query term for database regex matching.
 */

const CANONICAL_ALIASES = {
    'abuja': 'Abuja',
    'abuja fct': 'Abuja',
    'abuja f.c.t': 'Abuja',
    'fct abuja': 'Abuja',
    'lagos': 'Lagos',
    'lagos state': 'Lagos',
    'new york': 'New York',
    'new york city': 'New York',
    'nyc': 'New York',
    'bengaluru': 'Bangalore',
    'bangalore': 'Bangalore',
    'london': 'London',
    'san francisco': 'San Francisco',
    'sf': 'San Francisco',
    'washington': 'Washington',
    'washington dc': 'Washington',
    'washington d.c.': 'Washington',
    'port harcourt': 'Port Harcourt',
    'tokyo': 'Tokyo',
    'paris': 'Paris',
    'sydney': 'Sydney',
    'dubai': 'Dubai'
};

const QUALIFIER_PATTERN = /\b(FCT|F\.C\.T\.?|Federal Capital Territory|State|City|Province|Region|Greater|Metro|Metropolitan|Town|County|Nigeria|USA|United States|US|UK|United Kingdom|India|Canada|Australia|Germany|France|Japan|UAE|United Arab Emirates)\b/gi;

export function normalizeLocation(locationStr) {
    if (!locationStr || typeof locationStr !== 'string') return '';
    let clean = locationStr.trim();
    if (!clean) return '';

    if (clean.includes(',')) {
        clean = clean.split(',')[0].trim();
    }

    const lower = clean.toLowerCase();
    if (CANONICAL_ALIASES[lower]) {
        return CANONICAL_ALIASES[lower];
    }

    clean = clean.replace(QUALIFIER_PATTERN, '').trim();
    clean = clean.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').trim();

    if (!clean) {
        clean = locationStr.split(',')[0].trim();
    }

    const postLower = clean.toLowerCase();
    if (CANONICAL_ALIASES[postLower]) {
        return CANONICAL_ALIASES[postLower];
    }

    return clean
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}
