/**
 * HUMMBL Multi-Model Workflows
 * Curated sequences of mental models that work well together
 */

export interface Workflow {
  id: string;
  name: string;
  description: string;
  problemTypes: string[];  // Keywords that trigger this workflow
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  order: number;
  modelCode: string;
  purpose: string;  // Why use this model at this stage
}

/**
 * Curated workflows for common problem patterns
 * Each workflow represents a proven thinking sequence
 */
export const WORKFLOWS: Workflow[] = [
  // Strategic Decision Making
  {
    id: 'strategic-decision',
    name: 'Strategic Decision Making',
    description: 'Navigate complex decisions with multiple stakeholders and long-term consequences',
    problemTypes: ['decision', 'strategy', 'strategic', 'choose', 'choice', 'option', 'direction', 'path'],
    steps: [
      { order: 1, modelCode: 'DE1', purpose: 'Break down to fundamental truths' },
      { order: 2, modelCode: 'P2', purpose: 'Map all stakeholders and their interests' },
      { order: 3, modelCode: 'IN1', purpose: 'Invert to find hidden risks' },
      { order: 4, modelCode: 'SY3', purpose: 'Trace second and third-order effects' },
      { order: 5, modelCode: 'DE15', purpose: 'Map decision branches and consequences' }
    ]
  },

  // Problem Diagnosis
  {
    id: 'root-cause',
    name: 'Root Cause Analysis',
    description: 'Dig past symptoms to find the true source of problems',
    problemTypes: ['root', 'cause', 'why', 'diagnose', 'symptom', 'underlying', 'source', 'origin', 'keeps happening'],
    steps: [
      { order: 1, modelCode: 'DE2', purpose: 'Ask "why" repeatedly to reach root cause' },
      { order: 2, modelCode: 'DE7', purpose: 'Separate signal from noise' },
      { order: 3, modelCode: 'IN5', purpose: 'Conduct failure post-mortem' },
      { order: 4, modelCode: 'SY1', purpose: 'Map the feedback loops at play' },
      { order: 5, modelCode: 'RE1', purpose: 'Establish continuous improvement' }
    ]
  },

  // Stakeholder Alignment
  {
    id: 'stakeholder-alignment',
    name: 'Stakeholder Alignment',
    description: 'Build consensus and align diverse interests toward common goals',
    problemTypes: ['stakeholder', 'align', 'consensus', 'buy-in', 'convince', 'persuade', 'agreement', 'politics', 'conflict'],
    steps: [
      { order: 1, modelCode: 'P2', purpose: 'Identify all stakeholders and interests' },
      { order: 2, modelCode: 'P1', purpose: 'See situation from each perspective' },
      { order: 3, modelCode: 'IN11', purpose: 'Surface objections through devil\'s advocate' },
      { order: 4, modelCode: 'CO3', purpose: 'Find common ground and shared interests' },
      { order: 5, modelCode: 'SY16', purpose: 'Position within the broader ecosystem' }
    ]
  },

  // Innovation & Ideation
  {
    id: 'innovation',
    name: 'Innovation Sprint',
    description: 'Generate breakthrough ideas by challenging assumptions and combining concepts',
    problemTypes: ['innovate', 'innovation', 'creative', 'new', 'idea', 'brainstorm', 'breakthrough', 'disrupt', 'invent'],
    steps: [
      { order: 1, modelCode: 'DE1', purpose: 'Question every assumption' },
      { order: 2, modelCode: 'P3', purpose: 'Reframe the problem entirely' },
      { order: 3, modelCode: 'IN3', purpose: 'Ask what would make this impossible' },
      { order: 4, modelCode: 'CO1', purpose: 'Combine ideas from different domains' },
      { order: 5, modelCode: 'RE3', purpose: 'Prototype and iterate rapidly' }
    ]
  },

  // Crisis Response
  {
    id: 'crisis-response',
    name: 'Crisis Response',
    description: 'Navigate urgent situations with clarity and systematic action',
    problemTypes: ['crisis', 'urgent', 'emergency', 'fire', 'disaster', 'critical', 'immediate', 'failing', 'broken'],
    steps: [
      { order: 1, modelCode: 'DE4', purpose: 'Focus on what you can control' },
      { order: 2, modelCode: 'DE3', purpose: 'Identify the vital few priorities' },
      { order: 3, modelCode: 'IN2', purpose: 'Define the must-not-fail constraints' },
      { order: 4, modelCode: 'RE4', purpose: 'Establish tight feedback loops' },
      { order: 5, modelCode: 'CO7', purpose: 'Build redundancy for resilience' }
    ]
  },

  // Team Performance
  {
    id: 'team-performance',
    name: 'Team Performance',
    description: 'Diagnose and improve how teams work together',
    problemTypes: ['team', 'collaborate', 'coordination', 'dysfunction', 'conflict', 'productivity', 'morale', 'culture'],
    steps: [
      { order: 1, modelCode: 'SY1', purpose: 'Identify the feedback loops affecting behavior' },
      { order: 2, modelCode: 'SY9', purpose: 'Understand how incentives shape actions' },
      { order: 3, modelCode: 'P2', purpose: 'Map stakeholders and their real interests' },
      { order: 4, modelCode: 'IN8', purpose: 'Surface assumptions through steel-manning' },
      { order: 5, modelCode: 'RE11', purpose: 'Build calibration and feedback mechanisms' }
    ]
  },

  // Complexity Management
  {
    id: 'complexity-taming',
    name: 'Taming Complexity',
    description: 'Make sense of complex systems with many interacting parts',
    problemTypes: ['complex', 'complicated', 'overwhelm', 'confusing', 'tangled', 'messy', 'chaos', 'too many'],
    steps: [
      { order: 1, modelCode: 'DE6', purpose: 'Find natural boundaries and seams' },
      { order: 2, modelCode: 'DE3', purpose: 'Identify the vital few that matter most' },
      { order: 3, modelCode: 'SY2', purpose: 'Understand how parts interact' },
      { order: 4, modelCode: 'CO4', purpose: 'See the forest and the trees' },
      { order: 5, modelCode: 'SY6', purpose: 'Find leverage points for change' }
    ]
  },

  // Risk Assessment
  {
    id: 'risk-assessment',
    name: 'Risk Assessment',
    description: 'Identify, evaluate, and prepare for potential failures',
    problemTypes: ['risk', 'danger', 'threat', 'vulnerability', 'failure', 'worst case', 'downside', 'protect'],
    steps: [
      { order: 1, modelCode: 'IN4', purpose: 'Imagine everything going wrong' },
      { order: 2, modelCode: 'IN1', purpose: 'Think backwards from failure' },
      { order: 3, modelCode: 'SY3', purpose: 'Trace cascading consequences' },
      { order: 4, modelCode: 'DE5', purpose: 'Distinguish reversible from irreversible' },
      { order: 5, modelCode: 'CO7', purpose: 'Build redundancy and resilience' }
    ]
  },

  // Learning & Growth
  {
    id: 'learning-growth',
    name: 'Learning & Growth',
    description: 'Accelerate personal or organizational learning',
    problemTypes: ['learn', 'growth', 'improve', 'skill', 'develop', 'master', 'better', 'progress', 'stuck'],
    steps: [
      { order: 1, modelCode: 'RE1', purpose: 'Commit to continuous small improvements' },
      { order: 2, modelCode: 'RE4', purpose: 'Create fast feedback loops' },
      { order: 3, modelCode: 'IN5', purpose: 'Learn from failures systematically' },
      { order: 4, modelCode: 'P6', purpose: 'Seek out opposing perspectives' },
      { order: 5, modelCode: 'RE11', purpose: 'Build calibration mechanisms' }
    ]
  },

  // System Design
  {
    id: 'system-design',
    name: 'System Design',
    description: 'Architect robust systems that scale and adapt',
    problemTypes: ['design', 'architect', 'build', 'system', 'scale', 'infrastructure', 'platform', 'structure'],
    steps: [
      { order: 1, modelCode: 'DE6', purpose: 'Define clean interfaces and boundaries' },
      { order: 2, modelCode: 'CO5', purpose: 'Create modular, composable parts' },
      { order: 3, modelCode: 'SY1', purpose: 'Design healthy feedback loops' },
      { order: 4, modelCode: 'CO7', purpose: 'Build in redundancy and fault tolerance' },
      { order: 5, modelCode: 'SY7', purpose: 'Consider path dependence and lock-in' }
    ]
  }
];

/**
 * Find workflows that match a problem description
 */
export function matchWorkflows(problem: string, limit: number = 3): Workflow[] {
  const problemLower = problem.toLowerCase();

  // Score each workflow by keyword matches
  const scored = WORKFLOWS.map(workflow => {
    let score = 0;
    for (const keyword of workflow.problemTypes) {
      if (problemLower.includes(keyword)) {
        score += 1;
        // Bonus for exact word match (not substring)
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(problem)) {
          score += 0.5;
        }
      }
    }
    return { workflow, score };
  });

  // Return top matches with score > 0
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.workflow);
}

/**
 * Get a workflow by ID
 */
export function getWorkflowById(id: string): Workflow | undefined {
  return WORKFLOWS.find(w => w.id === id);
}

/**
 * Get all workflows
 */
export function getAllWorkflows(): Workflow[] {
  return WORKFLOWS;
}
