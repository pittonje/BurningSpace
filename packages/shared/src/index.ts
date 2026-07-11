export * from './constants.js';
export * from './factions.js';
export * from './messages.js';
export * from './movement.js';
// Keep the narrow contract explicit at the package root; legacy modules retain
// their compatibility type re-exports until a later cleanup phase.
export {
  ProfileClientMessages,
  ProfileServerMessages,
  type JoinMode,
  type JoinRequest,
  type ProfileAcceptedMessage,
  type ProfileRejectedMessage,
  type RoomParticipant
} from './profile-contract.js';
