import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ShipSnapshot } from '@burningspace/shared';
import { WORLD_WIDTH } from '@burningspace/shared';
import type { GameplayInputSource, PlayerInputContext } from '../src/input/GameplayInputSource';
import { MultiplayerGameScene } from '../src/scenes/MultiplayerGameScene';

const mocks = vi.hoisted(() => ({
  network: {
    profile: { mode: 'player' },
    getConnectionState: vi.fn(() => ({ lifecycle: 'idle' })),
    getOwnShipSnapshot: vi.fn<() => unknown>(),
    getEstimatedServerTime: vi.fn(() => 0),
    sendPlayerInput: vi.fn()
  },
  desktop: vi.fn(),
  touch: vi.fn(),
  preference: vi.fn(() => 'auto'),
  resolve: vi.fn(() => 'desktop')
}));
vi.mock('../src/network/networkSession', () => ({ networkClient: mocks.network }));
vi.mock('../src/input/DesktopInputSource', () => ({ DesktopInputSource: mocks.desktop }));
vi.mock('../src/input/TouchInputSource', () => ({ TouchInputSource: mocks.touch }));
vi.mock('../src/input/inputMode', () => ({ readInputPreference: mocks.preference, resolveInputMode: mocks.resolve }));
vi.mock('../src/entities/NetworkShipView', () => ({ NetworkShipView: class {} }));
vi.mock('../src/entities/NetworkProjectileView', () => ({ NetworkProjectileView: class {} }));
vi.mock('../src/world/SpaceMap', () => ({ SpaceMap: class {} }));
vi.mock('phaser', () => ({ default: {
  Scene: class {},
  Core: { Events: { BLUR: 'blur' } },
  Scale: { Events: { RESIZE: 'resize' } },
  Math: {
    Clamp: (n: number, min: number, max: number) => Math.max(min, Math.min(max, n)),
    Linear: (a: number, b: number, t: number) => a + (b - a) * t
  }
} }));

interface SceneInputInternals {
  inputSource?: GameplayInputSource;
  setupInput(): void;
  updateInput(delta: number): void;
  createPlayerInput(): unknown;
  updateSpectatorCamera(delta: number): void;
  handleFocusLost(): void;
  handleVisibilityChange(): void;
  cleanup(): void;
  spectatorCameraVelocityX: number;
  spectatorCameraVelocityY: number;
}

function fixture() {
  mocks.network.profile = { mode: 'player' };
  mocks.resolve.mockReturnValue('desktop');
  mocks.network.getOwnShipSnapshot.mockReturnValue(undefined);
  const source = {
    getMovement: vi.fn(() => ({ up: false, down: false, left: false, right: false })),
    samplePlayerInput: vi.fn((_context: PlayerInputContext) => ({ up: true, down: false, left: false, right: false, aimAngle: 0.7, shooting: true })),
    consumeBackRequest: vi.fn(() => false),
    destroy: vi.fn(),
    reset: vi.fn()
  };
  const camera = { width: 100, height: 100, zoom: 1, midPoint: { x: 1000, y: 1000 }, getWorldPoint: vi.fn(), centerOn: vi.fn() };
  const scene = new MultiplayerGameScene();
  const internals = scene as unknown as SceneInputInternals;
  Object.assign(scene, {
    cameras: { main: camera }, scene: { start: vi.fn() },
    game: { events: { on: vi.fn(), off: vi.fn() } },
    scale: { off: vi.fn(), displaySize: { minWidth: 720, minHeight: 420, setMin: vi.fn() }, refresh: vi.fn() },
    input: {}
  });
  internals.inputSource = source;
  return { scene, internals, source, camera };
}

afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe('MultiplayerGameScene semantic input integration', () => {
  it('keeps 50 ms cadence, remainder and at most one send per update', () => {
    const f = fixture();
    f.internals.updateInput(49);
    expect(mocks.network.sendPlayerInput).not.toHaveBeenCalled();
    f.internals.updateInput(1);
    expect(mocks.network.sendPlayerInput).toHaveBeenCalledTimes(1);
    f.internals.updateInput(125);
    expect(mocks.network.sendPlayerInput).toHaveBeenCalledTimes(2);
    f.internals.updateInput(24);
    expect(mocks.network.sendPlayerInput).toHaveBeenCalledTimes(2);
    f.internals.updateInput(1);
    expect(mocks.network.sendPlayerInput).toHaveBeenCalledTimes(3);
    expect(mocks.network.sendPlayerInput).toHaveBeenLastCalledWith(f.source.samplePlayerInput.mock.results[2]!.value);
  });

  it('does not sample or send player input for spectators', () => {
    const f = fixture(); mocks.network.profile.mode = 'spectator';
    f.internals.updateInput(500);
    expect(f.source.samplePlayerInput).not.toHaveBeenCalled();
    expect(mocks.network.sendPlayerInput).not.toHaveBeenCalled();
  });

  it.each([true, false])('passes snapshot position and alive=%s eligibility, not display position', alive => {
    const f = fixture();
    const ship = { x: 12, y: 34, rotation: 1.2, alive } as ShipSnapshot;
    mocks.network.getOwnShipSnapshot.mockReturnValue(ship);
    f.internals.createPlayerInput();
    expect(f.source.samplePlayerInput).toHaveBeenCalledWith({ camera: f.camera, aimOrigin: ship, canShoot: alive, fallbackAimAngle: 1.2 });
  });

  it('uses camera midpoint and disables shooting without an own ship', () => {
    const f = fixture(); f.internals.createPlayerInput();
    expect(f.source.samplePlayerInput).toHaveBeenCalledWith({ camera: f.camera, aimOrigin: f.camera.midPoint, canShoot: false, fallbackAimAngle: 0 });
  });

  it('preserves normalized diagonal spectator acceleration from semantic intent', () => {
    const f = fixture(); f.source.getMovement.mockReturnValue({ up: true, down: false, left: false, right: true });
    f.internals.updateSpectatorCamera(0.1);
    expect(f.internals.spectatorCameraVelocityX).toBeCloseTo(720 / Math.sqrt(2));
    expect(f.internals.spectatorCameraVelocityY).toBeCloseTo(-720 / Math.sqrt(2));
    expect(f.camera.centerOn).toHaveBeenCalledWith(1000 + 72 / Math.sqrt(2), 1000 - 72 / Math.sqrt(2));
  });

  it('preserves spectator max speed and neutral deceleration', () => {
    const f = fixture(); f.source.getMovement.mockReturnValue({ up: false, down: false, left: false, right: true });
    f.internals.spectatorCameraVelocityX = 9000;
    f.internals.updateSpectatorCamera(0.1);
    expect(f.internals.spectatorCameraVelocityX).toBe(9500);
    f.source.getMovement.mockReturnValue({ up: false, down: false, left: false, right: false });
    f.internals.updateSpectatorCamera(0.1);
    expect(f.internals.spectatorCameraVelocityX).toBe(8600);
    f.internals.updateSpectatorCamera(1);
    expect(f.internals.spectatorCameraVelocityX).toBe(0);
  });

  it('clamps the spectator camera and resets velocity on the clamped axis', () => {
    const f = fixture(); f.camera.midPoint.x = WORLD_WIDTH - 50;
    f.source.getMovement.mockReturnValue({ up: false, down: false, left: false, right: true });
    f.internals.updateSpectatorCamera(0.1);
    expect(f.camera.centerOn).toHaveBeenCalledWith(WORLD_WIDTH - 50, 1000);
    expect(f.internals.spectatorCameraVelocityX).toBe(0);
  });

  it('neutralizes before the semantic back action transitions to the lobby', () => {
    const f = fixture(); f.source.consumeBackRequest.mockReturnValueOnce(true);
    f.scene.update(0, 0);
    expect(mocks.network.sendPlayerInput).toHaveBeenCalledWith({ up: false, down: false, left: false, right: false, aimAngle: 0, shooting: false });
    expect(f.scene.scene.start).toHaveBeenCalledWith('NetworkTestScene');
    expect(mocks.network.sendPlayerInput.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(f.scene.scene.start).mock.invocationCallOrder[0]!);
    f.scene.update(1, 0);
    expect(f.scene.scene.start).toHaveBeenCalledTimes(1);
  });

  it('preserves blur/hidden neutralization, and unregisters lifecycle handlers on shutdown', () => {
    const f = fixture();
    const documentStub = { hidden: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.stubGlobal('document', documentStub);
    mocks.desktop.mockImplementation(function () { return f.source; });
    f.internals.setupInput();
    expect(f.scene.game.events.on).toHaveBeenCalledWith('blur', f.internals.handleFocusLost, f.scene);
    expect(documentStub.addEventListener).toHaveBeenCalledWith('visibilitychange', f.internals.handleVisibilityChange);
    f.internals.handleFocusLost();
    expect(mocks.network.sendPlayerInput).toHaveBeenCalledTimes(1);
    f.internals.handleVisibilityChange();
    expect(mocks.network.sendPlayerInput).toHaveBeenCalledTimes(1);
    documentStub.hidden = true;
    f.internals.handleVisibilityChange();
    expect(mocks.network.sendPlayerInput).toHaveBeenCalledTimes(2);
    f.internals.cleanup();
    expect(mocks.network.sendPlayerInput).toHaveBeenCalledTimes(3);
    expect(f.source.destroy).toHaveBeenCalledTimes(1);
    expect(f.source.reset).toHaveBeenCalledTimes(3);
    for (let i = 0; i < 3; i++) {
      expect(f.source.reset.mock.invocationCallOrder[i]).toBeLessThan(mocks.network.sendPlayerInput.mock.invocationCallOrder[i]!);
    }
    expect(f.internals.inputSource).toBeUndefined();
    expect(f.scene.game.events.off).toHaveBeenCalledWith('blur', f.internals.handleFocusLost, f.scene);
    expect(documentStub.removeEventListener).toHaveBeenCalledWith('visibilitychange', f.internals.handleVisibilityChange);
  });

  it.each(['desktop', 'touch'])('creates exactly one %s source and retains the mode until scene re-entry', mode => {
    const f = fixture();
    vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
    mocks.resolve.mockReturnValue(mode);
    mocks.desktop.mockImplementation(function () { return f.source; });
    mocks.touch.mockImplementation(function () { return f.source; });
    f.internals.setupInput();
    expect(mocks.desktop).toHaveBeenCalledTimes(mode === 'desktop' ? 1 : 0);
    expect(mocks.touch).toHaveBeenCalledTimes(mode === 'touch' ? 1 : 0);
    if (mode === 'touch') expect(f.scene.scale.displaySize.setMin).toHaveBeenCalledWith(0, 0);
    else expect(f.scene.scale.displaySize.setMin).not.toHaveBeenCalled();
    mocks.resolve.mockReturnValue(mode === 'touch' ? 'desktop' : 'touch');
    f.scene.update(0, 50);
    expect(mocks.resolve).toHaveBeenCalledTimes(1);
    expect(f.internals.inputSource).toBe(f.source);
    f.internals.cleanup();
    expect(f.source.reset).toHaveBeenCalledTimes(1);
    expect(f.source.destroy).toHaveBeenCalledTimes(1);
    if (mode === 'touch') expect(f.scene.scale.displaySize.setMin).toHaveBeenLastCalledWith(720, 420);
    f.internals.setupInput();
    expect(mocks.resolve).toHaveBeenCalledTimes(2);
    expect(mocks.desktop).toHaveBeenCalledTimes(1);
    expect(mocks.touch).toHaveBeenCalledTimes(1);
  });
});
