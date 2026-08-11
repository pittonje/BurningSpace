export const DEVELOPMENT_SERVER_ORIGIN = 'http://127.0.0.1:2567';

export interface ClientRuntimeEnvironment {
  readonly PROD?: boolean;
  readonly VITE_BURNINGSPACE_SERVER_URL?: string;
}

export interface ClientRuntimeConfig {
  readonly serverOrigin: string;
}

export function normalizeClientServerOrigin(value: string): string {
  const candidate = value.trim();

  if (candidate.length === 0) {
    throw new Error('VITE_BURNINGSPACE_SERVER_URL must not be empty.');
  }

  if (/\s/u.test(candidate) || /[\u0000-\u001f\u007f]/u.test(candidate)) {
    throw new Error(
      'VITE_BURNINGSPACE_SERVER_URL must not contain whitespace or control characters.'
    );
  }

  if (candidate.includes('\\') || !/^https?:\/\//iu.test(candidate)) {
    throw new Error(
      'VITE_BURNINGSPACE_SERVER_URL must be an absolute HTTP or HTTPS origin.'
    );
  }

  const authorityStart = candidate.indexOf('://') + 3;
  const remainderOffset = candidate.slice(authorityStart).search(/[/?#]/u);
  const rawAuthority = remainderOffset === -1
    ? candidate.slice(authorityStart)
    : candidate.slice(authorityStart, authorityStart + remainderOffset);
  const rawRemainder = remainderOffset === -1
    ? ''
    : candidate.slice(authorityStart + remainderOffset);

  if (
    rawAuthority.length === 0 ||
    rawAuthority.endsWith(':') ||
    rawRemainder !== '' && rawRemainder !== '/'
  ) {
    throw new Error(
      'VITE_BURNINGSPACE_SERVER_URL must not contain credentials, path, query, or fragment.'
    );
  }

  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    throw new Error(
      'VITE_BURNINGSPACE_SERVER_URL must be an absolute HTTP or HTTPS origin.'
    );
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(
      'VITE_BURNINGSPACE_SERVER_URL must be an absolute HTTP or HTTPS origin.'
    );
  }

  if (
    url.username !== '' ||
    url.password !== '' ||
    url.pathname !== '/' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new Error(
      'VITE_BURNINGSPACE_SERVER_URL must not contain credentials, path, query, or fragment.'
    );
  }

  return url.origin;
}

export function parseClientRuntimeConfig(
  environment: ClientRuntimeEnvironment
): ClientRuntimeConfig {
  const explicitServerUrl = environment.VITE_BURNINGSPACE_SERVER_URL;

  if (explicitServerUrl === undefined) {
    if (environment.PROD) {
      throw new Error(
        'VITE_BURNINGSPACE_SERVER_URL is required for production client builds.'
      );
    }

    return Object.freeze({ serverOrigin: DEVELOPMENT_SERVER_ORIGIN });
  }

  return Object.freeze({
    serverOrigin: normalizeClientServerOrigin(explicitServerUrl)
  });
}

export function loadClientRuntimeConfig(): ClientRuntimeConfig {
  const environment = (
    import.meta as ImportMeta & { env: ClientRuntimeEnvironment }
  ).env;
  return parseClientRuntimeConfig(environment);
}
