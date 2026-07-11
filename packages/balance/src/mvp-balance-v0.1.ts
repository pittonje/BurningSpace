export const MVP_BALANCE_V0_1 = {
  server: {
    tickRate: 20
  },
  ships: {
    miner: {
      hull: 1200,
      shield: 500,
      cargo: 100
    },
    scout: {
      hull: 500,
      shield: 400
    },
    fighter: {
      hull: 900,
      shield: 700
    }
  },
  sector: {
    turretsPerSector: 3,
    ownerSwitchControl: 50,
    creepAdvanceControl: 80,
    stableControl: 100
  },
  outpost: {
    hull: 80000,
    captureHpPercent: 50,
    emergencyResources: 500,
    maxResources: 5000,
    rawOreStorage: 3000
  },
  creeps: {
    maxGroupsPerFaction: 12,
    spawnIntervalSeconds: 90,
    baseGroup: {
      normal: 6,
      repair: 1,
      heavy: 2
    },
    lostLineCGroup: {
      normal: 8,
      repair: 2,
      heavy: 2
    },
    lostLineCBGroup: {
      normal: 8,
      repair: 2,
      heavy: 4
    },
    lostLineCBAGroup: {
      normal: 9,
      repair: 3,
      heavy: 5,
      shieldBonusPercent: 30
    }
  },
  portals: {
    outpostStabilitySeconds: 180,
    baseToOutpostCooldownSeconds: 300,
    cargoLimitPercent: 10
  }
} as const;
