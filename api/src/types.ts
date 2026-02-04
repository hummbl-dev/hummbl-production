/**
 * HUMMBL Base120 Domain Types
 * Core type definitions for mental models, transformations, and framework operations
 */

/**
 * Transformation domain codes for the Base120 mental model framework.
 *
 * Each code represents a distinct cognitive transformation domain containing 20 mental models:
 * - `P` - Perspective: Models for shifting viewpoints and reframing problems (P1-P20)
 * - `IN` - Inversion: Models for reverse thinking and contrarian analysis (IN1-IN20)
 * - `CO` - Composition: Models for combining and synthesizing elements (CO1-CO20)
 * - `DE` - Decomposition: Models for breaking down complex problems (DE1-DE20)
 * - `RE` - Recursion: Models for self-referential and iterative patterns (RE1-RE20)
 * - `SY` - Systems: Models for holistic and interconnected thinking (SY1-SY20)
 *
 * @example
 * ```typescript
 * const domain: TransformationType = 'P';
 * const modelCode = `${domain}1`; // "P1" - first Perspective model
 * ```
 *
 * @see {@link TRANSFORMATION_TYPES} for the array of all valid transformation codes
 * @see {@link isTransformationType} for runtime validation
 */
export type TransformationType = 'P' | 'IN' | 'CO' | 'DE' | 'RE' | 'SY';

export const TRANSFORMATION_TYPES: readonly TransformationType[] = [
  'P',
  'IN',
  'CO',
  'DE',
  'RE',
  'SY',
] as const;

export const isTransformationType = (value: unknown): value is TransformationType => {
  if (typeof value !== 'string') {
    return false;
  }
  return TRANSFORMATION_TYPES.includes(value as TransformationType);
};

export interface MentalModel {
  code: string;
  name: string;
  definition: string;
  priority: number;
}

export interface Transformation {
  key: TransformationType;
  name: string;
  description: string;
  models: MentalModel[];
}

export interface ProblemPattern {
  pattern: string;
  transformations: TransformationType[];
  topModels: string[];
}

export interface ModelRecommendation {
  model: MentalModel;
  relevance_score: number;
  reasoning: string;
}

export interface AnalysisGuide {
  problem_type: string;
  recommended_approach: string;
  primary_models: string[];
  secondary_models: string[];
  workflow: string[];
}

export type DialecticalStageId =
  | 'thesis'
  | 'antithesis'
  | 'synthesis'
  | 'convergence'
  | 'meta_reflection';

export interface StageModelMapping {
  stage: DialecticalStageId;
  title: string;
  description: string;
  modelCodes: string[];
}

export interface DialecticalMethodology {
  id: string;
  title: string;
  version: string;
  summary: string;
  documentUrl?: string;
  totalPages?: number;
  modelsReferenced: string[];
  stages: StageModelMapping[];
  metaModels: string[];
}

export type ModelReferenceIssueType = 'NotFound' | 'WrongTransformation' | 'Duplicate' | 'Unknown';

export interface ModelReferenceIssue {
  code: string;
  issueType: ModelReferenceIssueType;
  message: string;
  expectedTransformation?: TransformationType;
  actualTransformation?: TransformationType;
}

export interface MethodologyAuditResult {
  methodologyId: string;
  documentVersion: string;
  totalReferences: number;
  validCount: number;
  invalidCount: number;
  issues: ModelReferenceIssue[];
}

/**
 * Domain-wide error type for HUMMBL Base120 operations.
 */
export type DomainError =
  | { type: 'NotFound'; entity: string; code?: string }
  | { type: 'ValidationError'; field?: string; message: string }
  | { type: 'Conflict'; entity: string; message: string }
  | { type: 'Internal'; message: string }
  | { type: 'Unknown'; message: string };

/**
 * Result type for type-safe error handling using Railway-Oriented Programming (ROP).
 *
 * This discriminated union type enables explicit, composable error handling without exceptions.
 * Uses an `ok` boolean discriminant to distinguish between success and failure states,
 * aligning with HUMMBL global patterns for predictable control flow.
 *
 * @typeParam T - The type of the success value
 * @typeParam E - The type of the error value (defaults to {@link DomainError})
 *
 * @example Success case
 * ```typescript
 * const success: Result<number> = { ok: true, value: 42 };
 * // Or using the helper:
 * const success = ok(42);
 * ```
 *
 * @example Error case
 * ```typescript
 * const failure: Result<number> = { ok: false, error: { type: 'NotFound', entity: 'Model' } };
 * // Or using the helper:
 * const failure = err({ type: 'NotFound', entity: 'Model' });
 * ```
 *
 * @example Pattern matching with type guards
 * ```typescript
 * function processResult(result: Result<MentalModel>): string {
 *   if (isOk(result)) {
 *     return result.value.name; // TypeScript knows value exists
 *   } else {
 *     return `Error: ${result.error.type}`; // TypeScript knows error exists
 *   }
 * }
 * ```
 *
 * @see {@link ok} - Helper function to create success results
 * @see {@link err} - Helper function to create error results
 * @see {@link isOk} - Type guard for success case
 * @see {@link isErr} - Type guard for error case
 * @see {@link DomainError} - Default error type for domain operations
 */
export type Result<T, E = DomainError> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({
  ok: true,
  value,
});

export const err = <E>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

/**
 * Type guard for Result success case.
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok === true;
}

/**
 * Type guard for Result error case.
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return result.ok === false;
}

export function isNotFoundError(
  error: DomainError,
): error is Extract<DomainError, { type: 'NotFound' }> {
  return error.type === 'NotFound';
}

/**
 * API Key tiers with rate limits and permissions
 */
export type ApiKeyTier = 'free' | 'pro' | 'enterprise';

export interface ApiKeyInfo {
  id: string;
  key: string;
  tier: ApiKeyTier;
  name: string;
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
  rateLimit: {
    requestsPerHour: number;
    requestsPerDay: number;
  };
  permissions: readonly string[];
  isActive: boolean;
}

/**
 * Authentication result types
 */
export type AuthResult = Result<ApiKeyInfo, AuthError>;

export type AuthError =
  | { type: 'MISSING_AUTH'; message: string }
  | { type: 'INVALID_FORMAT'; message: string }
  | { type: 'KEY_NOT_FOUND'; message: string }
  | { type: 'KEY_INACTIVE'; message: string }
  | { type: 'RATE_LIMIT_EXCEEDED'; message: string }
  | { type: 'INTERNAL_ERROR'; message: string };

/**
 * Workflow types for guided multi-turn problem solving
 */

export type WorkflowType = 'root_cause_analysis' | 'strategy_design' | 'decision_making';

export interface WorkflowStep {
  stepNumber: number;
  transformation: TransformationType;
  models: string[]; // Model codes to apply
  guidance: string; // What to do in this step
  questions: string[]; // Prompts to guide thinking
  expectedOutput: string; // What should result from this step
}

export interface WorkflowTemplate {
  name: WorkflowType;
  displayName: string;
  description: string;
  problemTypes: string[]; // When to use this workflow
  steps: WorkflowStep[];
  estimatedDuration: string; // e.g., "15-30 minutes"
}

export interface WorkflowState {
  workflowName: WorkflowType;
  currentStep: number;
  totalSteps: number;
  startedAt: string;
  lastUpdatedAt: string;
  completed: boolean;
  stepResults: Record<number, string>; // User's insights from each step
}

export interface WorkflowProgress {
  workflow: WorkflowType;
  displayName: string;
  currentStep: number;
  totalSteps: number;
  transformation: TransformationType;
  guidance: string;
  suggestedModels: string[];
  questions: string[];
  nextAction: string;
  canResume: boolean;
}
