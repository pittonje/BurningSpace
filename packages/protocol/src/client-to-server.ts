/**
 * Future campaign protocol boundary; this is not an active runtime contract.
 * Concrete types must be migrated from packages/shared incrementally and retain
 * field-level compatibility until client and server cut over together.
 */
export interface ClientToServerMessage {
  type: string;
  payload?: unknown;
}
