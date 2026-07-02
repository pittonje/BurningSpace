import Phaser from 'phaser';
import {
  ASTEROID_MAX_COUNT,
  ASTEROID_MAX_RADIUS,
  ASTEROID_MIN_RADIUS,
  ASTEROID_RESPAWN_MAX_MS,
  ASTEROID_RESPAWN_MIN_MS,
  ASTEROID_SPAWN_PLAYER_SAFE_DISTANCE,
  ASTEROID_ZONE_HEIGHT,
  ASTEROID_ZONE_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '../config/gameConfig';
import { Asteroid } from '../entities/Asteroid';
import { distanceSquared } from '../utils/math';

type SpawnPoint = {
  x: number;
  y: number;
  radius: number;
};

type PlayerPositionProvider = () => {
  x: number;
  y: number;
};

const SPAWN_ATTEMPTS = 80;
const ASTEROID_GAP = 18;

export class AsteroidManager {
  private readonly scene: Phaser.Scene;
  private readonly asteroids: Asteroid[] = [];
  private readonly debugGraphics: Phaser.GameObjects.Graphics;
  private debugVisible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.debugGraphics = scene.add.graphics();
    this.debugGraphics.setDepth(5);
    this.debugGraphics.setVisible(false);

    for (let i = 0; i < ASTEROID_MAX_COUNT; i += 1) {
      this.asteroids.push(new Asteroid(scene, i));
    }
  }

  get activeAsteroids(): readonly Asteroid[] {
    return this.asteroids;
  }

  get activeCount(): number {
    let count = 0;

    for (const asteroid of this.asteroids) {
      if (asteroid.isAlive) {
        count += 1;
      }
    }

    return count;
  }

  createInitialField(playerX: number, playerY: number): void {
    for (const asteroid of this.asteroids) {
      this.spawnAsteroid(asteroid, playerX, playerY);
    }
  }

  respawnAll(playerX: number, playerY: number): void {
    this.destroyAll();
    this.createInitialField(playerX, playerY);
  }

  destroyAll(): void {
    for (const asteroid of this.asteroids) {
      asteroid.deactivate();
    }
  }

  update(deltaSeconds: number): void {
    for (const asteroid of this.asteroids) {
      asteroid.update(deltaSeconds);
    }
  }

  scheduleRespawn(asteroid: Asteroid, getPlayerPosition: PlayerPositionProvider): void {
    const delay = Phaser.Math.Between(ASTEROID_RESPAWN_MIN_MS, ASTEROID_RESPAWN_MAX_MS);

    this.scene.time.delayedCall(delay, () => {
      if (asteroid.isAlive || this.activeCount >= ASTEROID_MAX_COUNT) {
        return;
      }

      const playerPosition = getPlayerPosition();
      this.spawnAsteroid(asteroid, playerPosition.x, playerPosition.y);
    });
  }

  setDebugVisible(value: boolean): void {
    this.debugVisible = value;
    this.drawDebugZone();
  }

  destroy(): void {
    this.debugGraphics.destroy();

    for (const asteroid of this.asteroids) {
      asteroid.destroy();
    }
  }

  private spawnAsteroid(asteroid: Asteroid, playerX: number, playerY: number): void {
    const radius = Phaser.Math.Between(ASTEROID_MIN_RADIUS, ASTEROID_MAX_RADIUS);
    const point = this.findSpawnPoint(radius, playerX, playerY);
    asteroid.activate(point.x, point.y, point.radius);
  }

  private findSpawnPoint(radius: number, playerX: number, playerY: number): SpawnPoint {
    let fallback = this.randomPoint(radius);
    let fallbackScore = -Infinity;

    for (let attempt = 0; attempt < SPAWN_ATTEMPTS; attempt += 1) {
      const candidate = this.randomPoint(radius);
      const score = this.scoreSpawnPoint(candidate, playerX, playerY);

      if (score > fallbackScore) {
        fallback = candidate;
        fallbackScore = score;
      }

      if (this.isSpawnPointValid(candidate, playerX, playerY)) {
        return candidate;
      }
    }

    return fallback;
  }

  private randomPoint(radius: number): SpawnPoint {
    const left = WORLD_WIDTH / 2 - ASTEROID_ZONE_WIDTH / 2;
    const right = WORLD_WIDTH / 2 + ASTEROID_ZONE_WIDTH / 2;
    const top = WORLD_HEIGHT / 2 - ASTEROID_ZONE_HEIGHT / 2;
    const bottom = WORLD_HEIGHT / 2 + ASTEROID_ZONE_HEIGHT / 2;

    return {
      x: Phaser.Math.Between(Math.ceil(left + radius), Math.floor(right - radius)),
      y: Phaser.Math.Between(Math.ceil(top + radius), Math.floor(bottom - radius)),
      radius
    };
  }

  private isSpawnPointValid(point: SpawnPoint, playerX: number, playerY: number): boolean {
    if (
      distanceSquared(point.x, point.y, playerX, playerY) <
      Math.pow(ASTEROID_SPAWN_PLAYER_SAFE_DISTANCE + point.radius, 2)
    ) {
      return false;
    }

    for (const asteroid of this.asteroids) {
      if (!asteroid.isAlive) {
        continue;
      }

      const minimumDistance = point.radius + asteroid.radius + ASTEROID_GAP;

      if (distanceSquared(point.x, point.y, asteroid.x, asteroid.y) < minimumDistance * minimumDistance) {
        return false;
      }
    }

    return true;
  }

  private scoreSpawnPoint(point: SpawnPoint, playerX: number, playerY: number): number {
    let nearestDistanceSquared = distanceSquared(point.x, point.y, playerX, playerY);

    for (const asteroid of this.asteroids) {
      if (!asteroid.isAlive) {
        continue;
      }

      nearestDistanceSquared = Math.min(
        nearestDistanceSquared,
        distanceSquared(point.x, point.y, asteroid.x, asteroid.y)
      );
    }

    return nearestDistanceSquared;
  }

  private drawDebugZone(): void {
    this.debugGraphics.clear();
    this.debugGraphics.setVisible(this.debugVisible);

    if (!this.debugVisible) {
      return;
    }

    const x = WORLD_WIDTH / 2 - ASTEROID_ZONE_WIDTH / 2;
    const y = WORLD_HEIGHT / 2 - ASTEROID_ZONE_HEIGHT / 2;

    this.debugGraphics.lineStyle(2, 0xfacc15, 0.38);
    this.debugGraphics.strokeRect(x, y, ASTEROID_ZONE_WIDTH, ASTEROID_ZONE_HEIGHT);
  }
}
