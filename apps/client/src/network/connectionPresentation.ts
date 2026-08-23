export type ConnectionLifecycle =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'connection_lost'
  | 'reconnecting'
  | 'reconnected'
  | 'terminal_failure';

export type ConnectionOperation = 'none' | 'initial_connect' | 'reconnect';

export type ConnectionErrorCategory =
  | 'server_unavailable'
  | 'join_failed'
  | 'connection_lost'
  | 'reconnect_failed'
  | 'unexpected_failure';

export type ConnectionRecovery = 'none' | 'retry_connection' | 'disconnect';

export interface ConnectionPresentation {
  lifecycle: ConnectionLifecycle;
  operation: ConnectionOperation;
  recovery: ConnectionRecovery;
  errorCategory?: ConnectionErrorCategory;
}

export interface ConnectionPresentationCopy {
  label: string;
  detail: string;
  tone: 'neutral' | 'progress' | 'success' | 'warning' | 'failure';
}

const PLAYER_ERROR_MESSAGES: Readonly<Record<ConnectionErrorCategory, string>> = Object.freeze({
  server_unavailable: 'The arena server is unavailable. Check your connection and try again.',
  join_failed: 'The Public Arena could not be joined. Please try again.',
  connection_lost: 'Connection to the arena was lost.',
  reconnect_failed: 'Your arena session could not be restored. Start a new connection to continue.',
  unexpected_failure: 'An unexpected connection problem occurred. Please try again.'
});

const SERVER_UNAVAILABLE_PATTERNS = Object.freeze([
  'econnrefused',
  'failed to fetch',
  'networkerror',
  'network error',
  'socket',
  'timed out',
  'timeout',
  'websocket'
]);

export function createIdleConnectionPresentation(): ConnectionPresentation {
  return {
    lifecycle: 'idle',
    operation: 'none',
    recovery: 'none'
  };
}

export function classifyInitialConnectionError(error: unknown): ConnectionErrorCategory {
  const diagnostic = error instanceof Error ? error.message.toLowerCase() : '';

  return SERVER_UNAVAILABLE_PATTERNS.some((pattern) => diagnostic.includes(pattern))
    ? 'server_unavailable'
    : 'join_failed';
}

export function getPlayerConnectionErrorMessage(category: ConnectionErrorCategory): string {
  return PLAYER_ERROR_MESSAGES[category];
}

export function getConnectionPresentationCopy(
  presentation: ConnectionPresentation
): ConnectionPresentationCopy {
  switch (presentation.lifecycle) {
    case 'connecting':
      return {
        label: 'Connecting',
        detail: 'Joining the Public Arena…',
        tone: 'progress'
      };
    case 'connected':
      return {
        label: 'Connected',
        detail: 'Arena connection ready.',
        tone: 'success'
      };
    case 'connection_lost':
      return {
        label: 'Connection lost',
        detail: 'The arena connection was interrupted.',
        tone: 'warning'
      };
    case 'reconnecting':
      return {
        label: 'Reconnecting',
        detail: 'Connection lost. Trying to restore your arena session…',
        tone: 'warning'
      };
    case 'reconnected':
      return {
        label: 'Reconnected',
        detail: 'Your arena session was restored.',
        tone: 'success'
      };
    case 'terminal_failure':
      return {
        label: 'Connection failed',
        detail: presentation.errorCategory
          ? getPlayerConnectionErrorMessage(presentation.errorCategory)
          : PLAYER_ERROR_MESSAGES.unexpected_failure,
        tone: 'failure'
      };
    case 'idle':
    default:
      return {
        label: 'Not connected',
        detail: 'Connect when you are ready to enter the Public Arena.',
        tone: 'neutral'
      };
  }
}
