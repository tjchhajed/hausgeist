/**
 * Natural Language Parser
 * Extracts intent, owner, and task details from messages
 */

export type Intent = 'add_task' | 'complete_task' | 'list_tasks' | 'summary';
export type Timeframe = 'today' | 'week' | 'month' | 'all';

export interface ParsedCommand {
  intent: Intent;
  owner?: string;
  title?: string;
  taskIdentifier?: string;
  timeframe?: Timeframe;
  recurring?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
  dueDate?: string;
  points?: number;
}

// Family members to recognize (lowercase for matching)
const FAMILY_MEMBERS = ['ira', 'isha', 'papa', 'mama', 'family'];

// Intent detection patterns (order matters — first match wins)
const INTENT_PATTERNS: Array<{ intent: Intent; patterns: RegExp[] }> = [
  {
    intent: 'add_task',
    patterns: [
      /\b(add|create|new)\b.*\b(task|chore)\b/i,
      /\b(add|create)\b/i,
      /\bneeds?\s+to\b/i,
      /\bshould\b/i,
      /\bassign\b/i,
    ],
  },
  {
    intent: 'summary',
    patterns: [
      /\bhow\s+did\b/i,
      /\b(summary|report|stats)\b/i,
      /\bhow\b.*\b(do|doing|week)\b/i,
    ],
  },
  {
    intent: 'complete_task',
    patterns: [
      /\b(finished|completed|done\s+with)\b/i,
      /\bmark\b.*\b(done|complete|finished)\b/i,
      /^(\w+)\s+did\b/i,
    ],
  },
  {
    intent: 'list_tasks',
    patterns: [
      /\bwhat'?s?\s+left\b/i,
      /\b(show|list|get)\b.*\b(task|chore|open)\b/i,
      /\btasks?\s+(for|today|this)\b/i,
      /\bopen\s+(task|chore)s?\b/i,
      /\boverdue\b/i,
      /\bwhat\b.*\b(task|chore|to\s*do|left|open|pending)\b/i,
      /\bwhat\s+are\b/i,
    ],
  },
];

/**
 * Extract a family member name from the message.
 */
function extractOwner(message: string): string | undefined {
  const lower = message.toLowerCase();

  // Check possessive forms first: "Ira's tasks"
  for (const member of FAMILY_MEMBERS) {
    if (lower.includes(`${member}'s`) || lower.includes(`${member}s `)) {
      return member;
    }
  }

  // Check "for {owner}" pattern
  const forMatch = lower.match(/\bfor\s+(\w+)/);
  if (forMatch && FAMILY_MEMBERS.includes(forMatch[1])) {
    return forMatch[1];
  }

  // Check "{owner} finished/needs/should/did"
  const subjectMatch = lower.match(/^(\w+)\s+(finished|completed|needs|should|did)\b/);
  if (subjectMatch && FAMILY_MEMBERS.includes(subjectMatch[1])) {
    return subjectMatch[1];
  }

  // General check — name appears anywhere
  for (const member of FAMILY_MEMBERS) {
    if (lower.includes(member)) {
      return member;
    }
  }

  return undefined;
}

/**
 * Capitalize first letter.
 */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Extract task title from an "add task" message.
 */
function extractAddTitle(message: string): string | undefined {
  // "Add task for Ira: brush teeth" → "brush teeth"
  const colonMatch = message.match(/:\s*(.+)$/);
  if (colonMatch) {
    return colonMatch[1].trim();
  }

  // "{owner} needs to {task}" → "{task}"
  const needsMatch = message.match(/needs?\s+to\s+(.+)/i);
  if (needsMatch) {
    return needsMatch[1].trim();
  }

  // "{owner} should {task}" → "{task}"
  const shouldMatch = message.match(/should\s+(.+)/i);
  if (shouldMatch) {
    return shouldMatch[1].trim();
  }

  // "Add task {title} for {owner}"
  const addMatch = message.match(/(?:add|create)\s+(?:task|chore)\s+(.+?)\s+for\s+/i);
  if (addMatch) {
    return addMatch[1].trim();
  }

  return undefined;
}

/**
 * Extract task identifier from a "complete task" message.
 */
function extractCompleteIdentifier(message: string): string | undefined {
  // "Ira finished brushing teeth" → "brushing teeth"
  const finishedMatch = message.match(/(?:finished|completed|did)\s+(.+)/i);
  if (finishedMatch) {
    // Strip possessive pronouns
    return finishedMatch[1].replace(/\b(his|her|their|the)\b/gi, '').trim();
  }

  // "Mark tidy toys as done" → "tidy toys"
  const markMatch = message.match(/mark\s+(.+?)\s+as\s+(?:done|complete|finished)/i);
  if (markMatch) {
    return markMatch[1].trim();
  }

  // "Done with brushing teeth" → "brushing teeth"
  const doneWithMatch = message.match(/done\s+with\s+(.+)/i);
  if (doneWithMatch) {
    return doneWithMatch[1].trim();
  }

  return undefined;
}

/**
 * Extract timeframe from a message.
 */
function extractTimeframe(message: string): Timeframe | undefined {
  const lower = message.toLowerCase();
  if (lower.includes('today')) return 'today';
  if (lower.includes('this week') || lower.includes('week')) return 'week';
  if (lower.includes('this month') || lower.includes('month')) return 'month';
  return undefined;
}

/**
 * Check if the message mentions recurring patterns.
 */
function extractRecurring(message: string): { recurring?: boolean; frequency?: 'daily' | 'weekly' | 'monthly' } {
  const lower = message.toLowerCase();
  if (lower.includes('every day') || lower.includes('daily') || lower.includes('each day') || lower.includes('every morning') || lower.includes('every evening')) {
    return { recurring: true, frequency: 'daily' };
  }
  if (lower.includes('every week') || lower.includes('weekly')) {
    return { recurring: true, frequency: 'weekly' };
  }
  if (lower.includes('every month') || lower.includes('monthly')) {
    return { recurring: true, frequency: 'monthly' };
  }
  if (lower.includes('recurring') || lower.includes('repeat')) {
    return { recurring: true };
  }
  return {};
}

/**
 * Detect the intent from a message.
 */
function detectIntent(message: string): Intent | null {
  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        return intent;
      }
    }
  }
  return null;
}

/**
 * Parse a natural language message into a structured command.
 */
export function parseCommand(message: string): ParsedCommand {
  const intent = detectIntent(message);

  if (!intent) {
    throw new ParseError(message);
  }

  const owner = extractOwner(message);
  const capitalizedOwner = owner ? capitalize(owner) : undefined;

  switch (intent) {
    case 'add_task': {
      const { recurring, frequency } = extractRecurring(message);
      return {
        intent,
        owner: capitalizedOwner,
        title: extractAddTitle(message),
        recurring,
        frequency,
      };
    }
    case 'complete_task':
      return {
        intent,
        owner: capitalizedOwner,
        taskIdentifier: extractCompleteIdentifier(message),
      };
    case 'list_tasks':
      return {
        intent,
        owner: capitalizedOwner,
        timeframe: extractTimeframe(message) || 'all',
      };
    case 'summary':
      return {
        intent,
        owner: capitalizedOwner,
        timeframe: extractTimeframe(message) || 'week',
      };
  }
}

export class ParseError extends Error {
  constructor(public originalMessage: string) {
    super(`Could not understand: "${originalMessage}"`);
    this.name = 'ParseError';
  }
}
