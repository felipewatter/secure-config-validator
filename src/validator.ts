import fs from 'fs';
import { rules } from './rules';

export function validateConfig(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const warnings: string[] = [];

  for (const line of lines) {
    for (const rule of rules) {
      if (line.includes(rule.key) && rule.pattern.test(line)) {
        warnings.push(`⚠️ ${rule.message}: "${line.trim()}"`);
      }
    }
  }
  return warnings;
}