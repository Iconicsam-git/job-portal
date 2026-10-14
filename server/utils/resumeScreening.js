import { PDFParse } from 'pdf-parse';
import fs from 'fs';

// Curated comprehensive skills dictionary for automated matching
const SKILLS_TAXONOMY = [
    // Programming & Languages
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'golang', 'rust', 'swift', 'kotlin', 'dart', 'scala', 'r',
    // Frontend
    'react', 'react.js', 'reactjs', 'next.js', 'nextjs', 'vue', 'vue.js', 'vuejs', 'angular', 'html', 'html5', 'css', 'css3', 'tailwind', 'tailwindcss', 'bootstrap', 'sass', 'redux', 'zustand', 'webpack', 'vite',
    // Backend & APIs
    'node', 'node.js', 'nodejs', 'express', 'express.js', 'expressjs', 'nestjs', 'django', 'flask', 'fastapi', 'spring boot', 'laravel', 'asp.net', '.net', 'graphql', 'rest api', 'restful', 'microservices', 'grpc', 'websockets',
    // Databases & Cache
    'mongodb', 'mongoose', 'sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'redis', 'elasticsearch', 'prisma', 'supabase', 'firebase', 'dynamodb',
    // Cloud & DevOps
    'docker', 'kubernetes', 'aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'git', 'github', 'gitlab', 'ci/cd', 'jenkins', 'terraform', 'linux', 'unix', 'bash', 'nginx', 'apache',
    // Data Science & AI
    'machine learning', 'deep learning', 'artificial intelligence', 'data analysis', 'data science', 'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch', 'power bi', 'tableau', 'excel', 'nlp', 'computer vision',
    // UI/UX & Design
    'figma', 'ui/ux', 'adobe xd', 'photoshop', 'illustrator', 'wireframing', 'prototyping', 'user research',
    // Business, Marketing & Operations
    'seo', 'sem', 'content marketing', 'copywriting', 'social media', 'salesforce', 'hubspot', 'crm', 'accounting', 'bookkeeping', 'financial analysis', 'payroll', 'human resources', 'recruitment', 'talent acquisition',
    // Management & Methodologies
    'project management', 'agile', 'scrum', 'kanban', 'jira', 'trello', 'asana', 'leadership', 'communication', 'teamwork', 'problem solving', 'critical thinking', 'time management'
];

// Common English stopwords to ignore during semantic text matching
const STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot',
    'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each',
    'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d',
    'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
    'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
    'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
    'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll',
    'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
    'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve',
    'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
    'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while',
    'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll',
    'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Extracts raw textual content from a local file path or buffer or remote Cloudinary PDF URL.
 * @param {Object} options - { buffer, filePath, url }
 * @returns {Promise<string>} Cleaned text string
 */
export const extractTextFromPDF = async ({ buffer, filePath, url }) => {
    let pdfBuffer = buffer;

    try {
        if (!pdfBuffer && filePath) {
            if (fs.existsSync(filePath)) {
                pdfBuffer = await fs.promises.readFile(filePath);
            }
        }

        if (!pdfBuffer && url) {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`Failed to fetch PDF from URL: ${url} (Status: ${response.status})`);
                return '';
            }
            const arrayBuffer = await response.arrayBuffer();
            pdfBuffer = Buffer.from(arrayBuffer);
        }

        if (!pdfBuffer || pdfBuffer.length === 0) {
            return '';
        }

        const parser = new PDFParse({ data: pdfBuffer });
        const result = await parser.getText();
        await parser.destroy();

        return (result.text || '')
            .replace(/\r\n/g, '\n')
            .replace(/[^\x20-\x7E\n]/g, ' ') // Strip non-printable chars
            .replace(/\s+/g, ' ')
            .trim();
    } catch (error) {
        console.error('Error extracting text from PDF:', error.message);
        return '';
    }
};

/**
 * Extracts skills from text using the skills taxonomy.
 */
export const extractSkills = (text) => {
    if (!text) return [];
    const normalized = ` ${text.toLowerCase()} `;
    const detected = new Set();

    for (const skill of SKILLS_TAXONOMY) {
        // Match skill as whole word or boundary-enclosed phrase
        const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i');
        if (regex.test(normalized)) {
            // Standardize skill display name
            const displayName = skill.charAt(0).toUpperCase() + skill.slice(1);
            detected.add(displayName);
        }
    }

    return Array.from(detected);
};

/**
 * Extracts detected education qualifications from text.
 */
export const extractEducation = (text) => {
    if (!text) return [];
    const lower = text.toLowerCase();
    const found = [];

    const eduPatterns = [
        { name: 'Doctorate / Ph.D', regex: /\b(ph\.?d|doctorate|doctor of philosophy)\b/i, level: 5 },
        { name: "Master's Degree (M.Sc / MBA / M.Tech)", regex: /\b(master'?s|m\.?sc|m\.?tech|m\.?eng|mba|post[- ]?graduate)\b/i, level: 4 },
        { name: "Bachelor's Degree (B.Sc / B.Tech / B.Eng)", regex: /\b(bachelor'?s|b\.?sc|b\.?tech|b\.?eng|b\.?a|undergraduate|degree)\b/i, level: 3 },
        { name: 'Higher National Diploma / Associate Degree', regex: /\b(hnd|ond|diploma|associate'?s|associate degree)\b/i, level: 2 },
        { name: 'Secondary / High School', regex: /\b(high school|secondary school|waec|neco|a[- ]?level|o[- ]?level)\b/i, level: 1 }
    ];

    for (const pattern of eduPatterns) {
        if (pattern.regex.test(lower)) {
            found.push(pattern.name);
        }
    }

    return found;
};

/**
 * Extracts estimated years of work experience from resume text.
 */
export const extractExperienceYears = (text) => {
    if (!text) return 0;
    const lower = text.toLowerCase();
    let maxYears = 0;

    // Pattern 1: Explicit years of experience (e.g., "5+ years of experience", "3 years experience")
    const explicitRegex = /(\d{1,2})\+?\s*(?:to\s*\d{1,2}\s*)?(?:years?|yrs?)(?:\s*(?:of)?\s*(?:relevant\s*)?(?:professional\s*)?(?:work\s*)?experience)/gi;
    let match;
    while ((match = explicitRegex.exec(lower)) !== null) {
        const val = parseInt(match[1], 10);
        if (val > 0 && val < 50 && val > maxYears) {
            maxYears = val;
        }
    }

    // Pattern 2: Year intervals (e.g., "2018 - 2023", "2019 to Present")
    const intervalRegex = /\b(19\d{2}|20\d{2})\s*(?:-|–|—|to)\s*(19\d{2}|20\d{2}|present|current|now)\b/gi;
    const currentYear = new Date().getFullYear();
    let intervalTotal = 0;

    while ((match = intervalRegex.exec(lower)) !== null) {
        const start = parseInt(match[1], 10);
        const endStr = match[2].toLowerCase();
        const end = (endStr === 'present' || endStr === 'current' || endStr === 'now') ? currentYear : parseInt(endStr, 10);

        if (end >= start && (end - start) <= 30) {
            intervalTotal += (end - start);
        }
    }

    if (intervalTotal > maxYears && intervalTotal < 50) {
        maxYears = Math.min(intervalTotal, 20); // Cap reasonable estimated aggregate
    }

    return maxYears;
};

/**
 * Tokenizes text and cleans stopwords for TF-IDF / Cosine Similarity calculation.
 */
const tokenizeAndClean = (text) => {
    if (!text) return [];
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !STOP_WORDS.has(word));
};

/**
 * Computes Cosine Similarity between two text passages based on term frequency.
 */
export const computeCosineSimilarity = (text1, text2) => {
    const tokens1 = tokenizeAndClean(text1);
    const tokens2 = tokenizeAndClean(text2);

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    const freq1 = {};
    const freq2 = {};
    const vocab = new Set();

    tokens1.forEach(word => {
        freq1[word] = (freq1[word] || 0) + 1;
        vocab.add(word);
    });

    tokens2.forEach(word => {
        freq2[word] = (freq2[word] || 0) + 1;
        vocab.add(word);
    });

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const word of vocab) {
        const v1 = freq1[word] || 0;
        const v2 = freq2[word] || 0;
        dotProduct += v1 * v2;
        norm1 += v1 * v1;
        norm2 += v2 * v2;
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return Math.min(1, Math.max(0, similarity));
};

/**
 * Comprehensive Automated Resume Screening & Job-Matching Engine
 * @param {string} resumeText - Raw extracted text of candidate's resume
 * @param {Object} job - Job document containing title, description, category, level, requirements
 * @returns {Object} Suitability score, recommendation, and detailed breakdown
 */
export const evaluateResumeAgainstJob = (resumeText, job) => {
    if (!resumeText || resumeText.trim().length === 0) {
        return {
            suitabilityScore: 10,
            recommendation: 'Low Match',
            matchDetails: {
                skillsScore: 0,
                experienceScore: 0,
                educationScore: 0,
                relevanceScore: 0,
                matchedSkills: [],
                missingSkills: [],
                detectedEducation: [],
                detectedExperienceYears: 0,
                summary: 'No readable textual content could be extracted from the candidate resume for analysis.'
            }
        };
    }

    const jobFullText = `${job.title || ''} ${job.category || ''} ${job.level || ''} ${job.description || ''}`;

    // 1. SKILLS EVALUATION (40% Weight)
    const jobSkills = extractSkills(jobFullText);
    const resumeSkills = extractSkills(resumeText);

    let matchedSkills = [];
    let missingSkills = [];
    let skillsScore = 0;

    if (jobSkills.length > 0) {
        matchedSkills = jobSkills.filter(skill =>
            resumeSkills.some(rs => rs.toLowerCase() === skill.toLowerCase())
        );
        missingSkills = jobSkills.filter(skill =>
            !resumeSkills.some(rs => rs.toLowerCase() === skill.toLowerCase())
        );
        skillsScore = Math.round((matchedSkills.length / jobSkills.length) * 100);
    } else {
        // If job description did not specify taxonomy keywords, evaluate by common overlap
        const commonSkills = resumeSkills.filter(s =>
            jobFullText.toLowerCase().includes(s.toLowerCase())
        );
        matchedSkills = commonSkills;
        skillsScore = Math.min(100, Math.round((commonSkills.length / 3) * 100));
    }

    // 2. EXPERIENCE EVALUATION (25% Weight)
    const detectedYears = extractExperienceYears(resumeText);
    const jobLevel = (job.level || '').toLowerCase();
    let requiredYears = 0;

    if (jobLevel.includes('senior') || jobLevel.includes('lead') || jobLevel.includes('principal')) {
        requiredYears = 5;
    } else if (jobLevel.includes('intermediate') || jobLevel.includes('mid')) {
        requiredYears = 2;
    } else {
        requiredYears = 0; // Entry level
    }

    let experienceScore = 50; // Baseline entry score
    if (requiredYears === 0) {
        experienceScore = detectedYears >= 1 ? 100 : 85;
    } else if (detectedYears >= requiredYears) {
        experienceScore = 100;
    } else {
        experienceScore = Math.max(30, Math.round((detectedYears / requiredYears) * 100));
    }

    // 3. EDUCATION QUALIFICATIONS EVALUATION (15% Weight)
    const detectedEdu = extractEducation(resumeText);
    let educationScore = 60; // Baseline default

    if (detectedEdu.some(e => e.includes('Ph.D') || e.includes('Doctorate'))) {
        educationScore = 100;
    } else if (detectedEdu.some(e => e.includes('Master'))) {
        educationScore = 95;
    } else if (detectedEdu.some(e => e.includes('Bachelor'))) {
        educationScore = 90;
    } else if (detectedEdu.some(e => e.includes('Diploma') || e.includes('HND'))) {
        educationScore = 75;
    } else if (detectedEdu.length > 0) {
        educationScore = 70;
    }

    // 4. SEMANTIC / TF-IDF RELEVANCE (20% Weight)
    const cosineSim = computeCosineSimilarity(resumeText, jobFullText);
    // Normalize cosine similarity (typical document similarity sits in 0.15 - 0.65 range)
    const relevanceScore = Math.min(100, Math.round(cosineSim * 140));

    // COMPOSITE SUITABILITY SCORE
    const compositeScore = Math.round(
        (skillsScore * 0.40) +
        (experienceScore * 0.25) +
        (educationScore * 0.15) +
        (relevanceScore * 0.20)
    );

    const suitabilityScore = Math.min(100, Math.max(10, compositeScore));

    // RECOMMENDATION CLASSIFICATION
    let recommendation = 'Low Match';
    if (suitabilityScore >= 80) {
        recommendation = 'Highly Recommended';
    } else if (suitabilityScore >= 65) {
        recommendation = 'Recommended';
    } else if (suitabilityScore >= 50) {
        recommendation = 'Consider';
    } else {
        recommendation = 'Low Match';
    }

    // GENERATE EXPLANATORY SUMMARY
    const summaryParts = [];
    if (matchedSkills.length > 0) {
        summaryParts.push(`Applicant possesses ${matchedSkills.length} key matching skill(s) (${matchedSkills.slice(0, 4).join(', ')}${matchedSkills.length > 4 ? '...' : ''}).`);
    } else {
        summaryParts.push('Applicant exhibits limited direct skill matches with job requirements.');
    }

    if (detectedYears > 0) {
        summaryParts.push(`Identified approx. ${detectedYears} year(s) of relevant experience against ${job.level || 'specified'} requirements.`);
    }

    if (detectedEdu.length > 0) {
        summaryParts.push(`Holds verified academic background (${detectedEdu[0]}).`);
    }

    summaryParts.push(`Overall profile compatibility evaluated at ${suitabilityScore}%, designated as "${recommendation}".`);

    return {
        suitabilityScore,
        recommendation,
        matchDetails: {
            skillsScore,
            experienceScore,
            educationScore,
            relevanceScore,
            matchedSkills,
            missingSkills,
            detectedEducation: detectedEdu,
            detectedExperienceYears: detectedYears,
            summary: summaryParts.join(' ')
        }
    };
};
