/**
 * Transitional profile-protocol facade.
 *
 * packages/shared remains the canonical active owner until a coordinated
 * client/server consumer cutover is completed.
 */
export {
  ClientMessages,
  ServerMessages,
  type JoinMode,
  type JoinRequest,
  type ProfileAcceptedMessage,
  type ProfileRejectedMessage,
  type RoomParticipant
} from '@burningspace/shared';
