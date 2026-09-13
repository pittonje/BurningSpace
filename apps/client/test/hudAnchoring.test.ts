import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
import { MultiplayerGameScene } from '../src/scenes/MultiplayerGameScene';

vi.mock('phaser', () => ({ default: { Scene: class {} } }));
vi.mock('../src/network/networkSession', () => ({ networkClient: { getConnectionState: () => ({ lifecycle: 'idle' }) } }));
vi.mock('../src/entities/NetworkShipView', () => ({ NetworkShipView: class {} }));
vi.mock('../src/entities/NetworkProjectileView', () => ({ NetworkProjectileView: class {} }));
vi.mock('../src/world/SpaceMap', () => ({ SpaceMap: class {} }));
const require = createRequire(import.meta.url);
// The same installed Phaser matrices used by the renderer, without a DOM/WebGL context.
const TransformMatrix = require('phaser/src/gameobjects/components/TransformMatrix.js');
const GetCalcMatrix = require('phaser/src/gameobjects/GetCalcMatrix.js');

class TextObject {
  x = 0; y = 0; rotation = 0; scaleX = 1; scaleY = 1;
  scrollFactorX = 0; scrollFactorY = 0; visible = true;
  wrap = 0; fontSize = 13;
  constructor(readonly width: number, readonly height: number, readonly originX = 0, readonly originY = 0) {}
  get displayHeight() { return this.height * this.scaleY; }
  setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
  setScale(scale: number) { this.scaleX = scale; this.scaleY = scale; return this; }
  setWordWrapWidth(width: number) { this.wrap = width; return this; }
  setFontSize(size: number) { this.fontSize = size; return this; }
}

function fixture(zoom: number, scrollX: number, scrollY: number, visible: boolean) {
  const scene = new MultiplayerGameScene();
  const camera = { x: 0, y: 0, width: 844, height: 390, originX: 0.5, originY: 0.5, zoom, scrollX, scrollY, matrix: new TransformMatrix() };
  const hud = new TextObject(360, 150);
  const banner = new TextObject(400, 36, 0.5); banner.visible = visible;
  const respawn = new TextObject(220, 60, 0.5, 0.5);
  Object.assign(scene, { cameras: { main: camera }, scale: { width: 844, height: 390 }, hudText: hud, connectionBanner: banner, respawnText: respawn, inputMode: 'touch' });
  const internals = scene as unknown as { layoutHud(): void; anchorHud(): void; updateViews(dt: number): void; updateInput(dt: number): void; updateCamera(dt: number): void; updateHud(): void };
  function preRender() {
    // Phaser Camera.preRender's unrotated transform (installed Camera.js).
    // Scroll is applied separately by the real GetCalcMatrix through scrollFactor.
    camera.matrix.applyITRS(Math.floor(camera.x + camera.width * camera.originX + 0.5), Math.floor(camera.y + camera.height * camera.originY + 0.5), 0, camera.zoom, camera.zoom);
    camera.matrix.translate(-camera.width * camera.originX, -camera.height * camera.originY);
  }
  function rendered(text: TextObject) {
    const matrix = GetCalcMatrix(text, camera).calc;
    const anchor = matrix.transformPoint(0, 0);
    const unitX = matrix.transformPoint(1, 0);
    const unitY = matrix.transformPoint(0, 1);
    const topLeft = matrix.transformPoint(-text.width * text.originX, -text.height * text.originY);
    const bottomRight = matrix.transformPoint(text.width * (1 - text.originX), text.height * (1 - text.originY));
    return { anchor, topLeft, bottomRight, scaleX: Math.hypot(unitX.x - anchor.x, unitX.y - anchor.y), scaleY: Math.hypot(unitY.x - anchor.x, unitY.y - anchor.y) };
  }
  return { scene, internals, camera, hud, banner, respawn, preRender, rendered };
}

describe('M001C-UX-01 rendered screen-space HUD', () => {
  for (const zoom of [0.40, 0.86, 1.15]) {
    for (const [scrollX, scrollY] of [[800, 1400], [9300, 8700]]) {
      it.each([false, true])(`844x390 zoom=${zoom} scroll=(${scrollX},${scrollY}) banner=%s keeps visual anchors and scale`, visible => {
        const f = fixture(zoom, scrollX!, scrollY!, visible);
        // Layout runs before the renderer refreshes the camera matrix.
        f.internals.layoutHud(); f.preRender();
        const h = f.rendered(f.hud); const b = f.rendered(f.banner); const r = f.rendered(f.respawn);
        expect(h.topLeft.x).toBeCloseTo(16, 3);
        expect(h.topLeft.y).toBeCloseTo(visible ? 26 + 36 : 14, 3);
        expect(b.anchor.x).toBeCloseTo(422, 3); expect(b.topLeft.y).toBeCloseTo(14, 3);
        expect(b.topLeft.x).toBeGreaterThanOrEqual(0); expect(b.bottomRight.x).toBeLessThanOrEqual(844);
        expect(b.bottomRight.y - b.topLeft.y).toBeCloseTo(36, 3);
        expect(r.anchor.x).toBeCloseTo(422, 3); expect(r.anchor.y).toBeCloseTo(390 * 0.42, 3);
        for (const rendered of [h, b, r]) {
          expect(rendered.scaleX).toBeCloseTo(1, 4); expect(rendered.scaleY).toBeCloseTo(1, 4);
        }
        expect(f.banner.wrap).toBe(520); // Screen width policy, independent of zoom.
      });
    }
  }

  it('anchors in the same update after final camera movement/zoom and HUD content height changes', () => {
    const f = fixture(0.86, 800, 1400, false); f.preRender();
    const views = vi.spyOn(f.internals, 'updateViews').mockImplementation(() => {});
    const input = vi.spyOn(f.internals, 'updateInput').mockImplementation(() => {});
    const camera = vi.spyOn(f.internals, 'updateCamera').mockImplementation(() => { f.camera.zoom = 1.15; f.camera.scrollX = 9300; f.camera.scrollY = 8700; });
    const content = vi.spyOn(f.internals, 'updateHud').mockImplementation(() => { f.banner.visible = true; });
    const layout = vi.spyOn(f.internals, 'anchorHud');
    f.scene.update(0, 16); f.preRender();
    expect(views.mock.invocationCallOrder[0]).toBeLessThan(input.mock.invocationCallOrder[0]!);
    expect(input.mock.invocationCallOrder[0]).toBeLessThan(camera.mock.invocationCallOrder[0]!);
    expect(camera.mock.invocationCallOrder[0]).toBeLessThan(content.mock.invocationCallOrder[0]!);
    expect(content.mock.invocationCallOrder[0]).toBeLessThan(layout.mock.invocationCallOrder[0]!);
    expect(f.rendered(f.hud).topLeft.y).toBeCloseTo(62, 3);
    expect(f.rendered(f.respawn).anchor.y).toBeCloseTo(163.8, 3);
  });

  it('demonstrates the reviewed scrollFactor-only placement fails the actual render transform', () => {
    const f = fixture(0.4, 9300, 8700, false);
    f.hud.setPosition(16, 14); f.respawn.setPosition(422, 163.8); f.preRender();
    const h = f.rendered(f.hud);
    expect(h.scaleX).toBeCloseTo(0.4, 4);
    expect(Math.abs(h.topLeft.x - 16)).toBeGreaterThan(200);
    expect(Math.abs(f.rendered(f.respawn).anchor.y - 163.8)).toBeGreaterThan(10);
  });
});
