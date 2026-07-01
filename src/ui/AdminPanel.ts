import Phaser from 'phaser';
import { PLAYER_MAX_SPEED } from '../config/gameConfig';

const MIN_SPEED = 100;
const MAX_SPEED = 10000;
const SLIDER_STEPS = 1000;

export class AdminPanel {
  private readonly root: HTMLElement;
  private readonly valueText: HTMLElement;
  private readonly slider: HTMLInputElement;
  private readonly onSpeedLimitChange: (speedLimit: number) => void;
  private speedLimit: number;

  constructor(
    scene: Phaser.Scene,
    initialSpeedLimit: number,
    onSpeedLimitChange: (speedLimit: number) => void
  ) {
    this.speedLimit = initialSpeedLimit;
    this.onSpeedLimitChange = onSpeedLimitChange;
    this.root = document.createElement('section');
    this.root.className = 'admin-panel';
    this.root.hidden = true;

    const title = document.createElement('div');
    title.className = 'admin-panel__title';
    title.textContent = 'Admin panel';

    this.valueText = document.createElement('div');
    this.valueText.className = 'admin-panel__value';

    this.slider = document.createElement('input');
    this.slider.className = 'admin-panel__slider';
    this.slider.type = 'range';
    this.slider.min = '0';
    this.slider.max = String(SLIDER_STEPS);
    this.slider.step = '1';
    this.slider.value = String(Math.round(this.speedToPercent(this.speedLimit) * SLIDER_STEPS));
    this.slider.setAttribute('aria-label', 'Ship speed');

    this.root.append(title, this.valueText, this.slider);
    document.body.append(this.root);

    this.root.addEventListener('pointerdown', this.stopGamePointerEvent);
    this.root.addEventListener('pointermove', this.stopGamePointerEvent);
    this.root.addEventListener('pointerup', this.stopGamePointerEvent);
    this.root.addEventListener('click', this.stopGamePointerEvent);
    this.root.addEventListener('wheel', this.stopGamePointerEvent, { passive: false });
    this.slider.addEventListener('input', this.handleSliderInput);
    this.slider.addEventListener('keydown', this.handleSliderKeyDown);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);

    this.render();
  }

  get isInteracting(): boolean {
    return this.isVisible;
  }

  get isVisible(): boolean {
    return !this.root.hidden;
  }

  blocksPointer(): boolean {
    return this.isVisible;
  }

  toggle(): void {
    this.root.hidden = !this.root.hidden;

    if (this.isVisible) {
      this.slider.focus({ preventScroll: true });
    } else {
      this.slider.blur();
    }
  }

  layout(): void {
    return;
  }

  private readonly handleSliderInput = (): void => {
    const percent = Number(this.slider.value) / SLIDER_STEPS;
    const speedLimit = this.percentToSpeed(percent);

    if (speedLimit === this.speedLimit) {
      return;
    }

    this.speedLimit = speedLimit;
    this.onSpeedLimitChange(speedLimit);
    this.render();
  };

  private readonly handleSliderKeyDown = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() !== 'p') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.toggle();
  };

  private readonly stopGamePointerEvent = (event: Event): void => {
    event.stopPropagation();
  };

  private render(): void {
    this.valueText.textContent = `Ship speed ${this.speedLimit} u/s`;
  }

  private speedToPercent(speedLimit: number): number {
    const minLog = Math.log(MIN_SPEED);
    const maxLog = Math.log(MAX_SPEED);
    return this.clamp((Math.log(speedLimit) - minLog) / (maxLog - minLog), 0, 1);
  }

  private percentToSpeed(percent: number): number {
    const minLog = Math.log(MIN_SPEED);
    const maxLog = Math.log(MAX_SPEED);
    const rawSpeed = Math.exp(minLog + (maxLog - minLog) * this.clamp(percent, 0, 1));

    return this.roundSpeed(rawSpeed);
  }

  private roundSpeed(speed: number): number {
    const step = speed < PLAYER_MAX_SPEED * 2 ? 25 : speed < 4000 ? 100 : 250;
    return Math.round(speed / step) * step;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private destroy(): void {
    this.root.remove();
  }
}
