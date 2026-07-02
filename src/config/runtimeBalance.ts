import {
  ASTEROID_COLLISION_DAMAGE,
  BASE_DEFENSE_ENABLED,
  BASE_DEFENSE_RADIUS,
  BASE_ENEMY_DAMAGE_INTERVAL_MS,
  BASE_ENEMY_DAMAGE_PER_TICK,
  BASE_REGEN_RADIUS,
  FIRE_COOLDOWN_MS,
  NPC_ACCELERATION,
  NPC_ATTACK_RANGE,
  NPC_FIRE_COOLDOWN_MS,
  NPC_HEALTH_REGEN_PER_SECOND,
  NPC_MAX_HEALTH,
  NPC_MAX_SPEED,
  NPC_PLAYER_DETECTION_RADIUS,
  NPC_PLAYER_LOSE_RADIUS,
  NPC_PREFERRED_ATTACK_RANGE,
  NPC_PROJECTILE_DAMAGE,
  NPC_PROJECTILE_RANGE,
  NPC_PROJECTILE_SPEED,
  NPC_REPAIR_RATE_PER_SECOND,
  NPC_RESPAWN_DELAY_MS,
  NPC_RETREAT_HEALTH_THRESHOLD,
  PLAYER_ACCELERATION,
  PLAYER_BASE_REGEN_PER_SECOND,
  PLAYER_HEALTH_REGEN_PER_SECOND,
  PLAYER_MAX_HEALTH,
  PLAYER_MAX_SPEED,
  PLAYER_PROJECTILE_DAMAGE_TO_NPC,
  PLAYER_PROJECTILE_RANGE,
  PLAYER_RESPAWN_DELAY_MS,
  PLAYER_RESPAWN_INVULNERABILITY_MS,
  PROJECTILE_SPEED
} from './gameConfig';

export interface PlayerCombatSettings {
  maxHealth: number;
  projectileDamage: number;
  projectileSpeed: number;
  projectileRange: number;
  fireCooldownMs: number;
  maxSpeed: number;
  acceleration: number;
  healthRegenPerSecond: number;
  baseHealthRegenPerSecond: number;
  asteroidCollisionDamage: number;
  respawnDelayMs: number;
  respawnInvulnerabilityMs: number;
}

export interface NpcCombatSettings {
  maxHealth: number;
  projectileDamage: number;
  projectileSpeed: number;
  projectileRange: number;
  fireCooldownMs: number;
  maxSpeed: number;
  acceleration: number;
  healthRegenPerSecond: number;
  baseRepairPerSecond: number;
  retreatHealthThreshold: number;
  detectionRadius: number;
  loseRadius: number;
  attackRange: number;
  preferredAttackRange: number;
  respawnDelayMs: number;
}

export interface BaseCombatSettings {
  zoneRadius: number;
  defenseRadius: number;
  alliedRegenPerSecond: number;
  enemyDamagePerTick: number;
  enemyDamageIntervalMs: number;
  defenseEnabled: boolean;
}

export interface RuntimeBalance {
  version: 1;
  player: PlayerCombatSettings;
  npc: NpcCombatSettings;
  redBase: BaseCombatSettings;
  blueBase: BaseCombatSettings;
  aiPaused: boolean;
}

type NumericRange = {
  min: number;
  max: number;
};

const STORAGE_KEY = 'burning-space-runtime-balance-v1';

export const defaultRuntimeBalance: RuntimeBalance = {
  version: 1,
  player: {
    maxHealth: PLAYER_MAX_HEALTH,
    projectileDamage: PLAYER_PROJECTILE_DAMAGE_TO_NPC,
    projectileSpeed: PROJECTILE_SPEED,
    projectileRange: PLAYER_PROJECTILE_RANGE,
    fireCooldownMs: FIRE_COOLDOWN_MS,
    maxSpeed: PLAYER_MAX_SPEED,
    acceleration: PLAYER_ACCELERATION,
    healthRegenPerSecond: PLAYER_HEALTH_REGEN_PER_SECOND,
    baseHealthRegenPerSecond: PLAYER_BASE_REGEN_PER_SECOND,
    asteroidCollisionDamage: ASTEROID_COLLISION_DAMAGE,
    respawnDelayMs: PLAYER_RESPAWN_DELAY_MS,
    respawnInvulnerabilityMs: PLAYER_RESPAWN_INVULNERABILITY_MS
  },
  npc: {
    maxHealth: NPC_MAX_HEALTH,
    projectileDamage: NPC_PROJECTILE_DAMAGE,
    projectileSpeed: NPC_PROJECTILE_SPEED,
    projectileRange: NPC_PROJECTILE_RANGE,
    fireCooldownMs: NPC_FIRE_COOLDOWN_MS,
    maxSpeed: NPC_MAX_SPEED,
    acceleration: NPC_ACCELERATION,
    healthRegenPerSecond: NPC_HEALTH_REGEN_PER_SECOND,
    baseRepairPerSecond: NPC_REPAIR_RATE_PER_SECOND,
    retreatHealthThreshold: NPC_RETREAT_HEALTH_THRESHOLD,
    detectionRadius: NPC_PLAYER_DETECTION_RADIUS,
    loseRadius: NPC_PLAYER_LOSE_RADIUS,
    attackRange: NPC_ATTACK_RANGE,
    preferredAttackRange: NPC_PREFERRED_ATTACK_RANGE,
    respawnDelayMs: NPC_RESPAWN_DELAY_MS
  },
  redBase: {
    zoneRadius: BASE_REGEN_RADIUS,
    defenseRadius: BASE_DEFENSE_RADIUS,
    alliedRegenPerSecond: PLAYER_BASE_REGEN_PER_SECOND,
    enemyDamagePerTick: BASE_ENEMY_DAMAGE_PER_TICK,
    enemyDamageIntervalMs: BASE_ENEMY_DAMAGE_INTERVAL_MS,
    defenseEnabled: BASE_DEFENSE_ENABLED
  },
  blueBase: {
    zoneRadius: BASE_REGEN_RADIUS,
    defenseRadius: BASE_DEFENSE_RADIUS,
    alliedRegenPerSecond: NPC_REPAIR_RATE_PER_SECOND,
    enemyDamagePerTick: BASE_ENEMY_DAMAGE_PER_TICK,
    enemyDamageIntervalMs: BASE_ENEMY_DAMAGE_INTERVAL_MS,
    defenseEnabled: BASE_DEFENSE_ENABLED
  },
  aiPaused: false
};

export const runtimeBalance: RuntimeBalance = cloneBalance(defaultRuntimeBalance);

const playerRanges = {
  maxHealth: { min: 1, max: 5000 },
  projectileDamage: { min: 0, max: 1000 },
  projectileSpeed: { min: 100, max: 10000 },
  projectileRange: { min: 100, max: 10000 },
  fireCooldownMs: { min: 20, max: 5000 },
  maxSpeed: { min: 50, max: 10000 },
  acceleration: { min: 50, max: 20000 },
  healthRegenPerSecond: { min: 0, max: 1000 },
  baseHealthRegenPerSecond: { min: 0, max: 5000 },
  asteroidCollisionDamage: { min: 0, max: 1000 },
  respawnDelayMs: { min: 0, max: 30000 },
  respawnInvulnerabilityMs: { min: 0, max: 30000 }
} satisfies Record<keyof PlayerCombatSettings, NumericRange>;

const npcRanges = {
  maxHealth: { min: 1, max: 5000 },
  projectileDamage: { min: 0, max: 1000 },
  projectileSpeed: { min: 100, max: 10000 },
  projectileRange: { min: 100, max: 10000 },
  fireCooldownMs: { min: 20, max: 5000 },
  maxSpeed: { min: 50, max: 10000 },
  acceleration: { min: 50, max: 20000 },
  healthRegenPerSecond: { min: 0, max: 1000 },
  baseRepairPerSecond: { min: 0, max: 5000 },
  retreatHealthThreshold: { min: 0, max: 5000 },
  detectionRadius: { min: 100, max: 10000 },
  loseRadius: { min: 100, max: 15000 },
  attackRange: { min: 50, max: 10000 },
  preferredAttackRange: { min: 50, max: 10000 },
  respawnDelayMs: { min: 0, max: 30000 }
} satisfies Record<keyof NpcCombatSettings, NumericRange>;

const baseRanges = {
  zoneRadius: { min: 50, max: 5000 },
  defenseRadius: { min: 50, max: 8000 },
  alliedRegenPerSecond: { min: 0, max: 5000 },
  enemyDamagePerTick: { min: 0, max: 5000 },
  enemyDamageIntervalMs: { min: 50, max: 10000 }
} satisfies Record<Exclude<keyof BaseCombatSettings, 'defenseEnabled'>, NumericRange>;

export function resetRuntimeBalance(): void {
  applyRuntimeBalance(defaultRuntimeBalance);
  saveRuntimeBalance();
}

export function loadRuntimeBalance(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Partial<RuntimeBalance>;

    if (parsed.version !== 1) {
      return;
    }

    applyRuntimeBalance(parsed);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function saveRuntimeBalance(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(runtimeBalance));
}

export function applyRuntimeBalance(next: Partial<RuntimeBalance>): void {
  runtimeBalance.version = 1;
  mergePlayer(next.player);
  mergeNpc(next.npc);
  mergeBase(runtimeBalance.redBase, next.redBase);
  mergeBase(runtimeBalance.blueBase, next.blueBase);
  runtimeBalance.aiPaused = Boolean(next.aiPaused);
  normalizeLinkedSettings();
}

export function setPlayerSetting(key: keyof PlayerCombatSettings, value: number): void {
  runtimeBalance.player[key] = clampFinite(value, playerRanges[key]);
  normalizeLinkedSettings();
  saveRuntimeBalance();
}

export function setNpcSetting(key: keyof NpcCombatSettings, value: number): void {
  runtimeBalance.npc[key] = clampFinite(value, npcRanges[key]);
  normalizeLinkedSettings();
  saveRuntimeBalance();
}

export function setBaseSetting(
  side: 'redBase' | 'blueBase',
  key: keyof BaseCombatSettings,
  value: number | boolean
): void {
  if (key === 'defenseEnabled') {
    runtimeBalance[side].defenseEnabled = Boolean(value);
  } else if (typeof value === 'number') {
    runtimeBalance[side][key] = clampFinite(value, baseRanges[key]);
  }

  saveRuntimeBalance();
}

export function setAiPaused(value: boolean): void {
  runtimeBalance.aiPaused = value;
  saveRuntimeBalance();
}

export function cloneBalance(balance: RuntimeBalance): RuntimeBalance {
  return {
    version: 1,
    player: { ...balance.player },
    npc: { ...balance.npc },
    redBase: { ...balance.redBase },
    blueBase: { ...balance.blueBase },
    aiPaused: balance.aiPaused
  };
}

function mergePlayer(next?: Partial<PlayerCombatSettings>): void {
  for (const key of Object.keys(playerRanges) as Array<keyof PlayerCombatSettings>) {
    runtimeBalance.player[key] = clampFinite(next?.[key] ?? runtimeBalance.player[key], playerRanges[key]);
  }
}

function mergeNpc(next?: Partial<NpcCombatSettings>): void {
  for (const key of Object.keys(npcRanges) as Array<keyof NpcCombatSettings>) {
    runtimeBalance.npc[key] = clampFinite(next?.[key] ?? runtimeBalance.npc[key], npcRanges[key]);
  }
}

function mergeBase(target: BaseCombatSettings, next?: Partial<BaseCombatSettings>): void {
  for (const key of Object.keys(baseRanges) as Array<Exclude<keyof BaseCombatSettings, 'defenseEnabled'>>) {
    target[key] = clampFinite(next?.[key] ?? target[key], baseRanges[key]);
  }

  target.defenseEnabled = typeof next?.defenseEnabled === 'boolean' ? next.defenseEnabled : target.defenseEnabled;
}

function normalizeLinkedSettings(): void {
  runtimeBalance.npc.loseRadius = Math.max(runtimeBalance.npc.loseRadius, runtimeBalance.npc.detectionRadius);
  runtimeBalance.npc.attackRange = Math.max(runtimeBalance.npc.attackRange, runtimeBalance.npc.preferredAttackRange);
  runtimeBalance.npc.retreatHealthThreshold = Math.min(
    runtimeBalance.npc.retreatHealthThreshold,
    Math.max(0, runtimeBalance.npc.maxHealth - 1)
  );
}

function clampFinite(value: number, range: NumericRange): number {
  if (!Number.isFinite(value)) {
    return range.min;
  }

  return Math.min(range.max, Math.max(range.min, value));
}
