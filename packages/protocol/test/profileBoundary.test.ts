import { readdir, readFile } from 'node:fs/promises';
import { relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ProfileClientMessages as protocolProfileClientMessages,
  ProfileServerMessages as protocolProfileServerMessages
} from '@burningspace/protocol';
import {
  ProfileClientMessages as sharedProfileClientMessages,
  ProfileServerMessages as sharedProfileServerMessages
} from '@burningspace/shared';
import { describe, expect, it } from 'vitest';

interface SourceToken {
  kind: 'identifier' | 'punctuation' | 'string';
  value: string;
}

const sharedSourceDirectory = fileURLToPath(
  new URL('../../shared/src/', import.meta.url)
);

function tokenizeTypeScript(source: string): SourceToken[] {
  const tokens: SourceToken[] = [];
  let index = 0;

  while (index < source.length) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (character === '/' && nextCharacter === '/') {
      index += 2;
      while (index < source.length && source[index] !== '\n') {
        index += 1;
      }
      continue;
    }

    if (character === '/' && nextCharacter === '*') {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === '*' && source[index + 1] === '/')
      ) {
        index += 1;
      }
      index += 2;
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      const quote = character;
      let value = '';
      index += 1;

      while (index < source.length) {
        const stringCharacter = source[index];

        if (stringCharacter === '\\' && index + 1 < source.length) {
          value += source[index + 1];
          index += 2;
          continue;
        }

        if (stringCharacter === quote) {
          index += 1;
          break;
        }

        value += stringCharacter;
        index += 1;
      }

      tokens.push({ kind: 'string', value });
      continue;
    }

    if (character !== undefined && /[A-Za-z_$]/.test(character)) {
      const start = index;
      index += 1;

      while (
        index < source.length &&
        /[A-Za-z0-9_$]/.test(source[index] ?? '')
      ) {
        index += 1;
      }

      tokens.push({ kind: 'identifier', value: source.slice(start, index) });
      continue;
    }

    if (character !== undefined && !/\s/.test(character)) {
      tokens.push({ kind: 'punctuation', value: character });
    }

    index += 1;
  }

  return tokens;
}

function collectModuleSpecifiers(source: string): string[] {
  const tokens = tokenizeTypeScript(source);
  const specifiers: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token?.kind !== 'identifier') {
      continue;
    }

    if (tokens[index - 1]?.value === '.') {
      continue;
    }

    if (token.value === 'require') {
      if (
        tokens[index + 1]?.value === '(' &&
        tokens[index + 2]?.kind === 'string'
      ) {
        specifiers.push(tokens[index + 2]?.value ?? '');
      }
      continue;
    }

    if (token.value !== 'import' && token.value !== 'export') {
      continue;
    }

    if (token.value === 'import' && tokens[index + 1]?.value === '.') {
      continue;
    }

    if (
      token.value === 'import' &&
      tokens[index + 1]?.value === '(' &&
      tokens[index + 2]?.kind === 'string'
    ) {
      specifiers.push(tokens[index + 2]?.value ?? '');
      continue;
    }

    if (token.value === 'import' && tokens[index + 1]?.kind === 'string') {
      specifiers.push(tokens[index + 1]?.value ?? '');
      continue;
    }

    for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
      const candidate = tokens[cursor];

      if (candidate?.value === ';') {
        break;
      }

      if (
        candidate?.kind === 'identifier' &&
        candidate.value === 'from' &&
        tokens[cursor + 1]?.kind === 'string'
      ) {
        specifiers.push(tokens[cursor + 1]?.value ?? '');
        break;
      }
    }
  }

  return specifiers;
}

function isProtocolDependency(specifier: string): boolean {
  return (
    specifier === '@burningspace/protocol' ||
    specifier.startsWith('@burningspace/protocol/')
  );
}

async function listTypeScriptFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = `${directory}/${entry.name}`;

    if (entry.isDirectory()) {
      files.push(...await listTypeScriptFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(entryPath);
    }
  }

  return files;
}

describe('profile protocol boundary', () => {
  it('re-exports the canonical ProfileClientMessages object', () => {
    expect(protocolProfileClientMessages).toBe(sharedProfileClientMessages);
  });

  it('re-exports the canonical ProfileServerMessages object', () => {
    expect(protocolProfileServerMessages).toBe(sharedProfileServerMessages);
  });

  it('keeps shared source independent from the protocol package', async () => {
    const matches: string[] = [];

    for (const file of await listTypeScriptFiles(sharedSourceDirectory)) {
      const source = await readFile(file, 'utf8');

      if (collectModuleSpecifiers(source).some(isProtocolDependency)) {
        matches.push(relative(sharedSourceDirectory, file).split(sep).join('/'));
      }
    }

    expect(
      matches,
      `Shared source imports @burningspace/protocol in: ${matches.join(', ')}`
    ).toEqual([]);
  });
});
