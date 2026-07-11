/**
 * Transitional profile-protocol facade.
 *
 * packages/shared remains the canonical active owner. Narrow profile message
 * objects are the intended profile-specific API; broad objects remain
 * available while application consumers complete a later narrow cutover.
 */
export {
  ClientMessages,
  ProfileClientMessages,
  ProfileServerMessages,
  ServerMessages,
  type JoinMode,
  type JoinRequest,
  type ProfileAcceptedMessage,
  type ProfileRejectedMessage,
  type RoomParticipant
} from '@burningspace/shared';
