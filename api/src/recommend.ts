/**
 * HUMMBL Recommendation Engine
 * Improved algorithm with stopwords, pattern matching, and semantic scoring
 */

import type { MentalModel, TransformationType } from './types.js';

// Common English stopwords to filter out
const STOPWORDS = new Set([
  'i',
  'me',
  'my',
  'myself',
  'we',
  'our',
  'ours',
  'ourselves',
  'you',
  'your',
  'yours',
  'yourself',
  'yourselves',
  'he',
  'him',
  'his',
  'himself',
  'she',
  'her',
  'hers',
  'herself',
  'it',
  'its',
  'itself',
  'they',
  'them',
  'their',
  'theirs',
  'themselves',
  'what',
  'which',
  'who',
  'whom',
  'this',
  'that',
  'these',
  'those',
  'am',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'having',
  'do',
  'does',
  'did',
  'doing',
  'a',
  'an',
  'the',
  'and',
  'but',
  'if',
  'or',
  'because',
  'as',
  'until',
  'while',
  'of',
  'at',
  'by',
  'for',
  'with',
  'about',
  'against',
  'between',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'to',
  'from',
  'up',
  'down',
  'in',
  'out',
  'on',
  'off',
  'over',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  's',
  't',
  'can',
  'will',
  'just',
  'don',
  'should',
  'now',
  'd',
  'll',
  'm',
  'o',
  're',
  've',
  'y',
  'ain',
  'aren',
  'couldn',
  'didn',
  'doesn',
  'hadn',
  'hasn',
  'haven',
  'isn',
  'ma',
  'mightn',
  'mustn',
  'needn',
  'shan',
  'shouldn',
  'wasn',
  'weren',
  'won',
  'wouldn',
  'im',
  'ive',
  'id',
  'youre',
  'youve',
  'youll',
  'youd',
  'hes',
  'shes',
  'its',
  'were',
  'theyre',
  'theyve',
  'theyll',
  'theyd',
  'wont',
  'dont',
  'didnt',
  'cant',
  'couldnt',
  'shouldnt',
  'wouldnt',
  'really',
  'actually',
  'basically',
  'currently',
  'always',
  'never',
  'sometimes',
  'often',
  'usually',
  'maybe',
  'perhaps',
  'probably',
  'need',
  'want',
  'like',
  'get',
  'got',
  'getting',
  'going',
  'know',
  'think',
  'feel',
  'feeling',
  'try',
  'trying',
  'help',
  'helping',
]);

// Problem patterns that map to specific transformations
interface ProblemPattern {
  keywords: string[];
  transformations: TransformationType[];
  boost: number; // Score multiplier for models in these transformations
}

const PROBLEM_PATTERNS: ProblemPattern[] = [
  // Perspective problems - need to see differently
  {
    keywords: [
      'perspective',
      'viewpoint',
      'angle',
      'frame',
      'reframe',
      'see',
      'view',
      'understand',
      'interpret',
      'meaning',
      'context',
      'stakeholder',
      'audience',
      'empathy',
      'bias',
      'assumption',
      'blind',
      'spot',
    ],
    transformations: ['P'],
    boost: 2.0,
  },
  // Inversion problems - stuck, need to flip thinking
  {
    keywords: [
      'stuck',
      'blocked',
      'obstacle',
      'barrier',
      'cant',
      'unable',
      'fail',
      'failure',
      'wrong',
      'mistake',
      'error',
      'avoid',
      'prevent',
      'risk',
      'worst',
      'opposite',
      'reverse',
      'flip',
      'invert',
      'negative',
      'critique',
      'devil',
      'advocate',
      'premortem',
      'postmortem',
    ],
    transformations: ['IN'],
    boost: 2.0,
  },
  // Composition problems - need to combine/integrate
  {
    keywords: [
      'combine',
      'integrate',
      'merge',
      'synthesize',
      'connect',
      'link',
      'bridge',
      'unify',
      'together',
      'collaborate',
      'team',
      'synergy',
      'holistic',
      'whole',
      'complete',
      'network',
      'ecosystem',
      'platform',
    ],
    transformations: ['CO'],
    boost: 2.0,
  },
  // Decomposition problems - complex, need to break down
  {
    keywords: [
      'complex',
      'complicated',
      'overwhelming',
      'confusing',
      'unclear',
      'break',
      'breakdown',
      'analyze',
      'analysis',
      'dissect',
      'separate',
      'isolate',
      'root',
      'cause',
      'why',
      'factor',
      'component',
      'part',
      'piece',
      'simplify',
      'prioritize',
      'priority',
      'important',
      'critical',
      'essential',
      'pareto',
      '80/20',
    ],
    transformations: ['DE'],
    boost: 2.0,
  },
  // Recursion problems - improvement, learning, iteration
  {
    keywords: [
      'improve',
      'improvement',
      'better',
      'iterate',
      'iteration',
      'learn',
      'learning',
      'feedback',
      'loop',
      'cycle',
      'repeat',
      'refine',
      'optimize',
      'continuous',
      'progress',
      'grow',
      'growth',
      'develop',
      'evolve',
      'adapt',
      'calibrate',
      'update',
      'version',
    ],
    transformations: ['RE'],
    boost: 2.0,
  },
  // Systems problems - coordination, strategy, big picture
  {
    keywords: [
      'system',
      'systems',
      'strategy',
      'strategic',
      'coordinate',
      'coordination',
      'align',
      'alignment',
      'govern',
      'governance',
      'policy',
      'incentive',
      'leverage',
      'scale',
      'organization',
      'organizational',
      'structure',
      'architecture',
      'design',
      'ecosystem',
      'dynamics',
      'equilibrium',
      'tipping',
      'threshold',
      'emergent',
      'emergence',
    ],
    transformations: ['SY'],
    boost: 2.0,
  },
  // Decision-making problems - span multiple transformations
  {
    keywords: [
      'decide',
      'decision',
      'choice',
      'choose',
      'option',
      'alternative',
      'tradeoff',
      'trade-off',
      'evaluate',
      'compare',
      'weigh',
      'uncertain',
      'uncertainty',
      'risk',
    ],
    transformations: ['DE', 'IN', 'P'],
    boost: 1.5,
  },
  // Communication problems
  {
    keywords: [
      'communicate',
      'communication',
      'explain',
      'present',
      'presentation',
      'convince',
      'persuade',
      'narrative',
      'story',
      'message',
      'audience',
    ],
    transformations: ['P', 'CO'],
    boost: 1.5,
  },
  // Planning problems
  {
    keywords: [
      'plan',
      'planning',
      'roadmap',
      'timeline',
      'schedule',
      'milestone',
      'project',
      'execute',
      'execution',
      'implement',
      'implementation',
    ],
    transformations: ['DE', 'RE', 'SY'],
    boost: 1.5,
  },
];

// Synonym mappings for better matching
const SYNONYMS: Record<string, string[]> = {
  problem: ['issue', 'challenge', 'difficulty', 'trouble', 'obstacle'],
  solution: ['answer', 'fix', 'resolution', 'remedy'],
  analyze: ['examine', 'study', 'investigate', 'assess', 'evaluate'],
  understand: ['comprehend', 'grasp', 'fathom', 'perceive'],
  decide: ['choose', 'determine', 'select', 'pick'],
  improve: ['enhance', 'better', 'upgrade', 'optimize', 'refine'],
  break: ['decompose', 'divide', 'split', 'separate', 'dissect'],
  combine: ['merge', 'integrate', 'unite', 'synthesize', 'blend'],
  stuck: ['blocked', 'stalled', 'halted', 'trapped', 'gridlocked'],
  complex: ['complicated', 'intricate', 'convoluted', 'elaborate'],
  simple: ['basic', 'straightforward', 'elementary', 'fundamental'],
  strategy: ['plan', 'approach', 'tactic', 'method'],
  team: ['group', 'crew', 'squad', 'staff', 'colleagues'],
  goal: ['objective', 'target', 'aim', 'purpose', 'mission'],
  feedback: ['response', 'input', 'reaction', 'critique'],
  risk: ['danger', 'threat', 'hazard', 'peril'],
  opportunity: ['chance', 'possibility', 'opening', 'prospect'],
};

// Simple stemming - reduce words to base forms
function stem(word: string): string {
  // Remove common suffixes
  const suffixes = [
    'ing',
    'ed',
    'ly',
    'tion',
    'sion',
    'ness',
    'ment',
    'able',
    'ible',
    'ful',
    'less',
    'ous',
    'ive',
    'al',
    'er',
    'est',
    's',
  ];

  let stemmed = word.toLowerCase();

  for (const suffix of suffixes) {
    if (stemmed.length > suffix.length + 2 && stemmed.endsWith(suffix)) {
      stemmed = stemmed.slice(0, -suffix.length);
      break;
    }
  }

  return stemmed;
}

// Extract meaningful keywords from text (with optional stemming)
function extractKeywords(text: string, applyStemming: boolean = true): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .filter((word) => !STOPWORDS.has(word));

  return applyStemming ? words.map(stem) : words;
}

// Expand keywords with synonyms
function expandWithSynonyms(keywords: string[]): Set<string> {
  const expanded = new Set<string>(keywords);

  for (const keyword of keywords) {
    // Check if keyword is a synonym of something
    for (const [base, syns] of Object.entries(SYNONYMS)) {
      if (syns.includes(keyword) || base === keyword) {
        expanded.add(stem(base));
        syns.forEach((s) => expanded.add(stem(s)));
      }
    }
  }

  return expanded;
}

// Detect which problem patterns match
function detectPatterns(keywords: string[]): Map<TransformationType, number> {
  const boosts = new Map<TransformationType, number>();

  // Also check original (unstemmed) input for direct matches
  for (const pattern of PROBLEM_PATTERNS) {
    let matchCount = 0;

    for (const pk of pattern.keywords) {
      const stemmedPk = stem(pk);
      // Check if any keyword matches (direct, stemmed, or partial)
      const hasMatch = keywords.some(
        (k) =>
          k === pk ||
          k === stemmedPk ||
          k.includes(stemmedPk) ||
          stemmedPk.includes(k) ||
          pk.includes(k) ||
          k.includes(pk),
      );
      if (hasMatch) matchCount++;
    }

    if (matchCount > 0) {
      for (const trans of pattern.transformations) {
        const currentBoost = boosts.get(trans) || 1;
        // Stronger boost for more matches
        const boostMultiplier = Math.min(matchCount * 0.5, pattern.boost);
        boosts.set(trans, currentBoost + boostMultiplier);
      }
    }
  }

  return boosts;
}

// Get transformation key from model code
function getTransformationKey(code: string): TransformationType {
  if (code.startsWith('IN')) return 'IN';
  if (code.startsWith('CO')) return 'CO';
  if (code.startsWith('DE')) return 'DE';
  if (code.startsWith('RE')) return 'RE';
  if (code.startsWith('SY')) return 'SY';
  return 'P';
}

// Score a model against keywords
function scoreModel(
  model: MentalModel,
  keywords: Set<string>,
  patternBoosts: Map<TransformationType, number>,
): number {
  const modelText = `${model.name} ${model.definition}`.toLowerCase();
  const modelKeywords = extractKeywords(modelText);

  let score = 0;

  // Keyword matching
  for (const keyword of keywords) {
    for (const modelKw of modelKeywords) {
      if (modelKw.includes(keyword) || keyword.includes(modelKw)) {
        score += 1;
      }
    }
    // Also check raw text for partial matches
    if (modelText.includes(keyword)) {
      score += 0.5;
    }
  }

  // Apply transformation boost from pattern matching
  const transKey = getTransformationKey(model.code);
  const boost = patternBoosts.get(transKey) || 1;
  score *= boost;

  // Priority bonus (higher priority = lower number = more fundamental)
  score += (6 - model.priority) * 0.2;

  return score;
}

export interface RecommendationResult {
  models: MentalModel[];
  matchedPatterns: string[];
  keywordsUsed: string[];
}

export function recommendModels(
  problem: string,
  allModels: MentalModel[],
  limit: number = 5,
): RecommendationResult {
  // Extract keywords - both raw (for pattern matching) and stemmed (for model matching)
  const rawKeywords = extractKeywords(problem, false); // unstemmed for pattern matching
  const stemmedKeywords = extractKeywords(problem, true); // stemmed for model matching
  const expandedKeywords = expandWithSynonyms(stemmedKeywords);

  // Detect problem patterns using raw keywords
  const patternBoosts = detectPatterns(rawKeywords);

  // Identify matched patterns for response
  const matchedPatterns: string[] = [];
  for (const [trans, boost] of patternBoosts) {
    if (boost > 1.2) {
      const transNames: Record<TransformationType, string> = {
        P: 'Perspective',
        IN: 'Inversion',
        CO: 'Composition',
        DE: 'Decomposition',
        RE: 'Recursion',
        SY: 'Systems',
      };
      matchedPatterns.push(transNames[trans]);
    }
  }

  // Score all models
  const scored = allModels.map((model) => ({
    model,
    score: scoreModel(model, expandedKeywords, patternBoosts),
  }));

  // Sort by score and take top results
  const recommendations = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.model);

  // Fallback to priority-1 models if no matches
  if (recommendations.length === 0) {
    const fallback = allModels.filter((m) => m.priority === 1).slice(0, limit);

    return {
      models: fallback,
      matchedPatterns: [],
      keywordsUsed: [],
    };
  }

  return {
    models: recommendations,
    matchedPatterns,
    keywordsUsed: Array.from(expandedKeywords).slice(0, 10),
  };
}
