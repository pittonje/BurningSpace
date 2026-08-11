import { describe, expect, it } from 'vitest';
import {
  DEVELOPMENT_SERVER_ORIGIN,
  normalizeClientServerOrigin,
  parseClientRuntimeConfig
} from '../../client/src/config/runtimeConfig';

describe('client runtime server configuration', () => {
  it('uses the loopback development default', () => {
    expect(parseClientRuntimeConfig({ PROD: false })).toEqual({
      serverOrigin: DEVELOPMENT_SERVER_ORIGIN
    });
    expect(DEVELOPMENT_SERVER_ORIGIN).toBe('http://127.0.0.1:2567');
  });

  it('fails a production build when the value is missing', () => {
    expect(() => parseClientRuntimeConfig({ PROD: true })).toThrow(
      'VITE_BURNINGSPACE_SERVER_URL is required for production client builds.'
    );
  });

  it.each(['', '   '])('rejects an explicit empty value %j in every mode', (value) => {
    expect(() => parseClientRuntimeConfig({
      PROD: false,
      VITE_BURNINGSPACE_SERVER_URL: value
    })).toThrow('VITE_BURNINGSPACE_SERVER_URL must not be empty.');
    expect(() => parseClientRuntimeConfig({
      PROD: true,
      VITE_BURNINGSPACE_SERVER_URL: value
    })).toThrow('VITE_BURNINGSPACE_SERVER_URL must not be empty.');
  });

  it.each([
    ['http://arena-api.example.com', 'http://arena-api.example.com'],
    ['https://arena-api.example.com', 'https://arena-api.example.com'],
    ['HTTPS://ARENA-API.EXAMPLE.COM:443/', 'https://arena-api.example.com'],
    ['http://arena-api.example.com:80', 'http://arena-api.example.com'],
    ['https://arena-api.example.com:8443', 'https://arena-api.example.com:8443']
  ])('accepts and normalizes exact origin %s', (input, expected) => {
    expect(normalizeClientServerOrigin(input)).toBe(expected);
  });

  it.each([
    'https://arena-api.example.com/path',
    'https://arena-api.example.com/./',
    'https://arena-api.example.com/%2e',
    'https://arena-api.example.com?query=1',
    'https://arena-api.example.com#fragment',
    'https://user@arena-api.example.com',
    'https://user:password@arena-api.example.com',
    'https://arena-api.example.com:',
    'ws://arena-api.example.com',
    'wss://arena-api.example.com',
    'file:///tmp/server',
    'arena-api.example.com',
    'https:\\arena-api.example.com'
  ])('rejects non-origin server URL %s', (input) => {
    expect(() => normalizeClientServerOrigin(input)).toThrow();
  });

  it('uses and validates an explicit development override', () => {
    expect(parseClientRuntimeConfig({
      PROD: false,
      VITE_BURNINGSPACE_SERVER_URL: 'https://arena-api.example.com:443/'
    })).toEqual({ serverOrigin: 'https://arena-api.example.com' });

    expect(() => parseClientRuntimeConfig({
      PROD: false,
      VITE_BURNINGSPACE_SERVER_URL: 'not-a-url'
    })).toThrow();
  });
});
