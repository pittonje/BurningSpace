export type NicknameValidationResult =
  | { ok: true; nickname: string }
  | { ok: false; reason: string };

const NICKNAME_PATTERN = /^[\p{L}\p{N}_ -]+$/u;
const CONTROL_CHAR_PATTERN = /\p{C}/u;
const REPEATED_SPACES_PATTERN = / {2,}/;

export function validateNickname(value: unknown): NicknameValidationResult {
  if (typeof value !== 'string') {
    return { ok: false, reason: 'Nickname must be text.' };
  }

  const nickname = value.trim();

  if (nickname.length < 3 || nickname.length > 20) {
    return { ok: false, reason: 'Nickname must contain 3-20 characters.' };
  }

  if (CONTROL_CHAR_PATTERN.test(nickname)) {
    return { ok: false, reason: 'Nickname contains unsupported characters.' };
  }

  if (REPEATED_SPACES_PATTERN.test(nickname)) {
    return { ok: false, reason: 'Nickname cannot contain repeated spaces.' };
  }

  if (!NICKNAME_PATTERN.test(nickname)) {
    return { ok: false, reason: 'Nickname may use letters, numbers, spaces, _ and -.' };
  }

  return { ok: true, nickname };
}
