#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceFile = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(here, '../scripts/portal/01-data-config.js');

const source = fs.readFileSync(sourceFile, 'utf8');

function extractConstLiteral(name) {
  const marker = `const ${name}`;
  const start = source.indexOf(marker);
  if (start < 0) {
    throw new Error(`Missing ${name} in ${sourceFile}`);
  }
  const equals = source.indexOf('=', start);
  if (equals < 0) {
    throw new Error(`Malformed declaration for ${name}`);
  }

  let index = equals + 1;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }

  const opener = source[index];
  const closer = opener === '{' ? '}' : opener === '[' ? ']' : '';
  if (!closer) {
    throw new Error(`Unsupported literal opener for ${name}: ${opener}`);
  }

  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;
  let end = index;

  for (; end < source.length; end += 1) {
    const char = source[end];
    const next = source[end + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        end += 1;
      }
      continue;
    }

    if (inSingle) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '\'') {
        inSingle = false;
      }
      continue;
    }

    if (inDouble) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inDouble = false;
      }
      continue;
    }

    if (inTemplate) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '`') {
        inTemplate = false;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      inLineComment = true;
      end += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      end += 1;
      continue;
    }

    if (char === '\'') {
      inSingle = true;
      continue;
    }

    if (char === '"') {
      inDouble = true;
      continue;
    }

    if (char === '`') {
      inTemplate = true;
      continue;
    }

    if (char === opener) {
      depth += 1;
      continue;
    }

    if (char === closer) {
      depth -= 1;
      if (depth === 0) {
        end += 1;
        break;
      }
    }
  }

  if (depth !== 0) {
    throw new Error(`Unbalanced literal for ${name}`);
  }

  return `const ${name} = ${source.slice(index, end)};`;
}

const rolesDecl = extractConstLiteral('ROLES');
const departmentsDecl = extractConstLiteral('DEFAULT_DEPARTMENTS');
const titlesDecl = extractConstLiteral('DEFAULT_DEPT_TITLES');

const script = `
${rolesDecl}
${departmentsDecl}
${titlesDecl}
result = {
  roles: Object.entries(ROLES).map(([code, value]) => ({ code, ...value })),
  departments: DEFAULT_DEPARTMENTS,
  deptTitles: DEFAULT_DEPT_TITLES
};
`;

const sandbox = { result: null };
vm.runInNewContext(script, sandbox, { timeout: 1000 });
process.stdout.write(`${JSON.stringify(sandbox.result, null, 2)}\n`);
