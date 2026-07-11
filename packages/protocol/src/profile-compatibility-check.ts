import {
  ClientMessages as protocolClientMessages,
  ServerMessages as protocolServerMessages,
  type JoinMode as ProtocolJoinMode,
  type JoinRequest as ProtocolJoinRequest,
  type ProfileAcceptedMessage as ProtocolProfileAcceptedMessage,
  type ProfileRejectedMessage as ProtocolProfileRejectedMessage,
  type RoomParticipant as ProtocolRoomParticipant
} from '@burningspace/protocol';
import {
  ClientMessages as sharedClientMessages,
  ServerMessages as sharedServerMessages,
  type JoinMode as SharedJoinMode,
  type JoinRequest as SharedJoinRequest,
  type ProfileAcceptedMessage as SharedProfileAcceptedMessage,
  type ProfileRejectedMessage as SharedProfileRejectedMessage,
  type RoomParticipant as SharedRoomParticipant
} from '@burningspace/shared';

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;

type JoinModeSharedToProtocol = Assert<IsAssignable<SharedJoinMode, ProtocolJoinMode>>;
type JoinModeProtocolToShared = Assert<IsAssignable<ProtocolJoinMode, SharedJoinMode>>;
type JoinRequestSharedToProtocol = Assert<IsAssignable<SharedJoinRequest, ProtocolJoinRequest>>;
type JoinRequestProtocolToShared = Assert<IsAssignable<ProtocolJoinRequest, SharedJoinRequest>>;
type RoomParticipantSharedToProtocol = Assert<IsAssignable<SharedRoomParticipant, ProtocolRoomParticipant>>;
type RoomParticipantProtocolToShared = Assert<IsAssignable<ProtocolRoomParticipant, SharedRoomParticipant>>;
type ProfileAcceptedSharedToProtocol = Assert<
  IsAssignable<SharedProfileAcceptedMessage, ProtocolProfileAcceptedMessage>
>;
type ProfileAcceptedProtocolToShared = Assert<
  IsAssignable<ProtocolProfileAcceptedMessage, SharedProfileAcceptedMessage>
>;
type ProfileRejectedSharedToProtocol = Assert<
  IsAssignable<SharedProfileRejectedMessage, ProtocolProfileRejectedMessage>
>;
type ProfileRejectedProtocolToShared = Assert<
  IsAssignable<ProtocolProfileRejectedMessage, SharedProfileRejectedMessage>
>;

type CompatibilityAssertions = [
  JoinModeSharedToProtocol,
  JoinModeProtocolToShared,
  JoinRequestSharedToProtocol,
  JoinRequestProtocolToShared,
  RoomParticipantSharedToProtocol,
  RoomParticipantProtocolToShared,
  ProfileAcceptedSharedToProtocol,
  ProfileAcceptedProtocolToShared,
  ProfileRejectedSharedToProtocol,
  ProfileRejectedProtocolToShared
];

const compatibilityAssertions: CompatibilityAssertions = [
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true
];

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  protocolClientMessages === sharedClientMessages,
  'ClientMessages must preserve strict runtime object identity.'
);
assert(
  protocolServerMessages === sharedServerMessages,
  'ServerMessages must preserve strict runtime object identity.'
);
assert(protocolClientMessages.SET_PROFILE === 'setProfile', 'SET_PROFILE wire value changed.');
assert(protocolClientMessages.SET_PROFILE === sharedClientMessages.SET_PROFILE, 'SET_PROFILE exports differ.');
assert(protocolServerMessages.PROFILE_ACCEPTED === 'profileAccepted', 'PROFILE_ACCEPTED wire value changed.');
assert(
  protocolServerMessages.PROFILE_ACCEPTED === sharedServerMessages.PROFILE_ACCEPTED,
  'PROFILE_ACCEPTED exports differ.'
);
assert(protocolServerMessages.PROFILE_REJECTED === 'profileRejected', 'PROFILE_REJECTED wire value changed.');
assert(
  protocolServerMessages.PROFILE_REJECTED === sharedServerMessages.PROFILE_REJECTED,
  'PROFILE_REJECTED exports differ.'
);
assert(compatibilityAssertions.every(Boolean), 'Compile-time compatibility assertions were not emitted as true.');

console.log('Profile protocol compatibility check passed.');
