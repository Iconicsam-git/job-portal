/**
 * Location Normalization & Matching Utility
 * Consolidates free-text location variations (e.g., "Abuja", "Abuja FCT", "Abuja, Nigeria")
 * into a single canonical location so they count as one unified query.
 */

// Well-known city aliases mapping (lowercase -> canonical title)
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
    'ph': 'Port Harcourt',
    'tokyo': 'Tokyo',
    'paris': 'Paris',
    'sydney': 'Sydney',
    'dubai': 'Dubai',
    'toronto': 'Toronto',
    'berlin': 'Berlin',
    'mumbai': 'Mumbai'
};

// Patterns for common country, state, territory, and administrative qualifiers
const QUALIFIER_PATTERN = /\b(FCT|F\.C\.T\.?|Federal Capital Territory|State|City|Province|Region|Greater|Metro|Metropolitan|Town|County|Nigeria|USA|United States|US|UK|United Kingdom|India|Canada|Australia|Germany|France|Japan|UAE|United Arab Emirates)\b/gi;

/**
 * Normalizes any free-text location string into its canonical primary city name.
 * Examples:
 *   "Abuja" -> "Abuja"
 *   "Abuja FCT" -> "Abuja"
 *   "Abuja, Nigeria" -> "Abuja"
 *   "Abuja, FCT, Nigeria" -> "Abuja"
 *   "New York, United States" -> "New York"
 *   "New York City" -> "New York"
 *
 * @param {string} locationStr - Raw location input
 * @returns {string} Normalized canonical location name
 */
export function normalizeLocation(locationStr) {
    if (!locationStr || typeof locationStr !== 'string') return '';

    let clean = locationStr.trim();
    if (!clean) return '';

    // If comma-separated (e.g. "Abuja, Nigeria", "San Francisco, CA"), isolate the primary city entity
    if (clean.includes(',')) {
        clean = clean.split(',')[0].trim();
    }

    // Check lowercase direct alias dictionary
    const lower = clean.toLowerCase();
    if (CANONICAL_ALIASES[lower]) {
        return CANONICAL_ALIASES[lower];
    }

    // Strip administrative/territorial qualifiers
    clean = clean.replace(QUALIFIER_PATTERN, '').trim();

    // Remove leading/trailing non-alphanumeric punctuation
    clean = clean.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').trim();

    if (!clean) {
        // If stripping removed everything (e.g. input was just "Nigeria"), fall back to original
        clean = locationStr.split(',')[0].trim();
    }

    // Check alias again after stripping
    const postCleanLower = clean.toLowerCase();
    if (CANONICAL_ALIASES[postCleanLower]) {
        return CANONICAL_ALIASES[postCleanLower];
    }

    // Title Case formatting
    return clean
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Checks whether a job's location matches a query location, taking normalization into account.
 * Handles exact matches, normalized matches, and substring overlaps.
 *
 * @param {string} jobLocation - The location saved on the job listing
 * @param {string} queryLocation - The location being searched or filtered
 * @returns {boolean} True if they refer to the same location
 */
export function isLocationMatch(jobLocation, queryLocation) {
    if (!jobLocation || !queryLocation) return false;

    const rawJob = jobLocation.trim().toLowerCase();
    const rawQuery = queryLocation.trim().toLowerCase();

    // 1. Direct raw equality or raw substring match
    if (rawJob === rawQuery) return true;
    if (rawJob.includes(rawQuery) || rawQuery.includes(rawJob)) return true;

    // 2. Normalized canonical comparison
    const normJob = normalizeLocation(jobLocation).toLowerCase();
    const normQuery = normalizeLocation(queryLocation).toLowerCase();

    if (normJob && normQuery) {
        if (normJob === normQuery) return true;
        if (normJob.length >= 3 && normQuery.length >= 3) {
            if (normJob.includes(normQuery) || normQuery.includes(normJob)) return true;
        }
    }

    return false;
}

/**
 * Extracts and consolidates unique canonical locations from an array of jobs and defaults.
 * Groups variations like ["Abuja", "Abuja FCT", "Abuja, Nigeria"] under a single entry "Abuja".
 *
 * @param {Array} jobs - List of active job listings
 * @param {Array} defaultLocations - Standard list of preset locations
 * @returns {Array} Array of canonical location objects: [{ name: 'Abuja', count: 3, variants: [...] }]
 */
export function getCanonicalLocations(jobs = [], defaultLocations = []) {
    const locationMap = new Map();

    // Process default preset locations first
    defaultLocations.forEach(raw => {
        if (!raw) return;
        const canonical = normalizeLocation(raw);
        if (!canonical) return;

        if (!locationMap.has(canonical)) {
            locationMap.set(canonical, {
                name: canonical,
                count: 0,
                variants: new Set([raw])
            });
        } else {
            locationMap.get(canonical).variants.add(raw);
        }
    });

    // Tally job counts and assimilate all job locations
    jobs.forEach(job => {
        if (!job || !job.location) return;
        const raw = job.location.trim();
        const canonical = normalizeLocation(raw);
        if (!canonical) return;

        if (!locationMap.has(canonical)) {
            locationMap.set(canonical, {
                name: canonical,
                count: 1,
                variants: new Set([raw])
            });
        } else {
            const entry = locationMap.get(canonical);
            entry.count += 1;
            entry.variants.add(raw);
        }
    });

    return Array.from(locationMap.values()).map(item => ({
        name: item.name,
        count: item.count,
        variants: Array.from(item.variants)
    }));
}
