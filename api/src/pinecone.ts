/**
 * Pinecone Semantic Search for HUMMBL
 * Uses integrated inference for embedding generation
 */

import type { MentalModel, TransformationType } from './types.js';

// Environment bindings - set via wrangler secret
export interface PineconeEnv {
  PINECONE_API_KEY: string;
  PINECONE_INDEX_HOST?: string;
}

const DEFAULT_INDEX_HOST = 'hummbl-models-ss3rcfm.svc.aped-4627-b74a.pinecone.io';

interface PineconeHit {
  _id: string;
  _score: number;
  fields: {
    code: string;
    name: string;
    definition: string;
    transformation: string;
    transformation_name: string;
    priority: number;
  };
}

interface PineconeSearchResponse {
  usage: {
    embed_total_tokens: number;
    read_units: number;
  };
  result: {
    hits: PineconeHit[];
  };
}

export interface SemanticSearchResult {
  models: MentalModel[];
  scores: Map<string, number>;
  tokenUsage: number;
}

/**
 * Search for semantically similar Base120 mental models using Pinecone
 */
export async function semanticSearch(
  query: string,
  env: PineconeEnv,
  topK: number = 10
): Promise<SemanticSearchResult | null> {
  if (!env.PINECONE_API_KEY) {
    console.error('PINECONE_API_KEY not configured');
    return null;
  }

  const indexHost = env.PINECONE_INDEX_HOST || DEFAULT_INDEX_HOST;

  try {
    const response = await fetch(
      `https://${indexHost}/records/namespaces/default/search`,
      {
        method: 'POST',
        headers: {
          'Api-Key': env.PINECONE_API_KEY,
          'Content-Type': 'application/json',
          'X-Pinecone-API-Version': '2025-04',
        },
        body: JSON.stringify({
          query: {
            inputs: { text: query },
            top_k: topK,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('Pinecone search failed:', response.status);
      return null;
    }

    const data: PineconeSearchResponse = await response.json();

    const models: MentalModel[] = data.result.hits.map((hit) => ({
      code: hit.fields.code,
      name: hit.fields.name,
      definition: hit.fields.definition,
      priority: hit.fields.priority,
    }));

    const scores = new Map<string, number>();
    for (const hit of data.result.hits) {
      scores.set(hit._id, hit._score);
    }

    return {
      models,
      scores,
      tokenUsage: data.usage.embed_total_tokens,
    };
  } catch (error) {
    console.error('Pinecone search error:', error);
    return null;
  }
}

/**
 * Get transformation type from model code
 */
export function getTransformationType(code: string): TransformationType {
  if (code.startsWith('IN')) return 'IN';
  if (code.startsWith('CO')) return 'CO';
  if (code.startsWith('DE')) return 'DE';
  if (code.startsWith('RE')) return 'RE';
  if (code.startsWith('SY')) return 'SY';
  return 'P';
}
