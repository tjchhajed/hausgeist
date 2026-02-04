/**
 * Rules Engine Types
 */

export interface RuleTrigger {
  type?: string;
  status?: string;
  recurring?: boolean;
  frequency?: string;
  category?: string;
  last_completed?: string;
  due_date?: string;
  age?: string;
  age_in_status?: string;
  event?: string;
  person_birthday?: string;
}

export interface RuleAction {
  type: 'remind' | 'suggest' | 'alert' | 'summary';
  priority?: 'normal' | 'high';
  message: string;
  auto_action?: string;
  tasks?: string[];
}

export interface Rule {
  name: string;
  description?: string;
  schedule?: string;
  trigger: RuleTrigger;
  action: RuleAction;
  category: 'chores' | 'inventory' | 'documents' | 'suggestions';
}

export interface EvaluationResult {
  triggered: boolean;
  rule: Rule;
  data?: unknown[];
  message?: string;
}

export interface HeartbeatReport {
  choreSummary: {
    completed: number;
    totalPoints: number;
    byOwner: Record<string, { count: number; points: number }>;
    topPerformer?: string;
  };
  openTasks: {
    total: number;
    overdue: number;
    byOwner: Record<string, number>;
  };
  inventoryAlerts: string[];
  documentAlerts: string[];
  suggestions: string[];
}

export interface RulesConfig {
  chores?: Array<Omit<Rule, 'category'>>;
  inventory?: Array<Omit<Rule, 'category'>>;
  documents?: Array<Omit<Rule, 'category'>>;
  suggestions?: Array<Omit<Rule, 'category'>>;
  heartbeat?: {
    schedule: string;
    include: string[];
    format: string;
  };
}
