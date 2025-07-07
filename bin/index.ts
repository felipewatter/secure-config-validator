#!/usr/bin/env node
import { validateConfig } from '../src/validator';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ Please provide a config file path');
  process.exit(1);
}

console.log('🔒 Secure Config Validator\n---------------------------------------');

const issues = validateConfig(args[0]);
if (issues.length === 0) {
  console.log('✔️ No insecure configs found');
} else {
  for (const issue of issues) {
    console.log(issue);
  }
  console.log(`---------------------------------------\nSummary: ${issues.length} potential issues found`);
}