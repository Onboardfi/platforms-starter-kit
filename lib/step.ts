// lib/types/step.ts

export type CompletionTool = 'email' | 'memory' | 'notesTaken' | 'notion' | null;

export interface Step {
  title: string;
  description: string;
  completionTool: CompletionTool;
  completed: boolean;
}
