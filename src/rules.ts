export const rules: { key: string; pattern: RegExp; message: string }[] = [
  { key: 'DEBUG', pattern: /true/i, message: 'Debug mode should be disabled in production' },
  { key: 'ALLOW_ALL_ORIGINS', pattern: /true/i, message: 'CORS should not allow all origins' },
  { key: 'SECRET', pattern: /(changeme|12345|default)/i, message: 'Weak secret detected' },
  { key: 'PASSWORD', pattern: /(changeme|12345|default)/i, message: 'Weak password detected' },
];