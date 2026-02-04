/**
 * Rules Engine
 * Loads rules from YAML config and evaluates them
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Rule, RulesConfig, EvaluationResult } from './types';
import { evaluateRule } from './evaluators';

export class RulesEngine {
  private rules: Rule[] = [];

  constructor(configPath?: string) {
    const resolvedPath = configPath || path.join(process.cwd(), 'config', 'rules.yaml');
    this.rules = loadRules(resolvedPath);
  }

  getRules(): Rule[] {
    return this.rules;
  }

  async evaluateAll(): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];

    for (const rule of this.rules) {
      const result = await evaluateRule(rule);
      if (result.triggered) {
        results.push(result);
      }
    }

    return results;
  }

  async evaluateByCategory(category: Rule['category']): Promise<EvaluationResult[]> {
    const filtered = this.rules.filter((r) => r.category === category);
    const results: EvaluationResult[] = [];

    for (const rule of filtered) {
      const result = await evaluateRule(rule);
      if (result.triggered) {
        results.push(result);
      }
    }

    return results;
  }

  async evaluateBySchedule(schedule: string): Promise<EvaluationResult[]> {
    const filtered = this.rules.filter((r) => r.schedule === schedule);
    const results: EvaluationResult[] = [];

    for (const rule of filtered) {
      const result = await evaluateRule(rule);
      if (result.triggered) {
        results.push(result);
      }
    }

    return results;
  }
}

function loadRules(configPath: string): Rule[] {
  if (!fs.existsSync(configPath)) {
    console.warn(`Rules config not found at ${configPath}, using empty rules`);
    return [];
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  const config = yaml.load(raw) as RulesConfig;
  const rules: Rule[] = [];

  if (config.chores) {
    for (const r of config.chores) {
      rules.push({ ...r, category: 'chores' } as Rule);
    }
  }

  if (config.inventory) {
    for (const r of config.inventory) {
      rules.push({ ...r, category: 'inventory' } as Rule);
    }
  }

  if (config.documents) {
    for (const r of config.documents) {
      rules.push({ ...r, category: 'documents' } as Rule);
    }
  }

  if (config.suggestions) {
    for (const r of config.suggestions) {
      rules.push({ ...r, category: 'suggestions' } as Rule);
    }
  }

  return rules;
}
