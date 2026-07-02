import Phaser from 'phaser';
import {
  BaseCombatSettings,
  NpcCombatSettings,
  PlayerCombatSettings,
  resetRuntimeBalance,
  runtimeBalance,
  saveRuntimeBalance,
  setAiPaused,
  setBaseSetting,
  setNpcSetting,
  setPlayerSetting
} from '../config/runtimeBalance';

type NumberField<TSection extends 'player' | 'npc' | 'redBase' | 'blueBase'> = {
  label: string;
  section: TSection;
  key: TSection extends 'player'
    ? keyof PlayerCombatSettings
    : TSection extends 'npc'
      ? keyof NpcCombatSettings
      : Exclude<keyof BaseCombatSettings, 'defenseEnabled'>;
  min: number;
  max: number;
  step: number;
};

export type AdminPanelActions = {
  healPlayer: () => void;
  killPlayer: () => void;
  respawnPlayer: () => void;
  teleportPlayerToRedBase: () => void;
  teleportPlayerToCenter: () => void;
  healNpc: () => void;
  damageNpc: () => void;
  killNpc: () => void;
  respawnNpc: () => void;
  teleportNpcToBlueBase: () => void;
  teleportNpcToCenter: () => void;
  forceNpcRetreat: () => void;
  resetNpcState: () => void;
  respawnAllAsteroids: () => void;
  destroyAllAsteroids: () => void;
};

const playerFields: Array<NumberField<'player'>> = [
  { label: 'Max health', section: 'player', key: 'maxHealth', min: 1, max: 5000, step: 1 },
  { label: 'Projectile damage', section: 'player', key: 'projectileDamage', min: 0, max: 1000, step: 1 },
  { label: 'Projectile speed', section: 'player', key: 'projectileSpeed', min: 100, max: 10000, step: 50 },
  { label: 'Projectile range', section: 'player', key: 'projectileRange', min: 100, max: 10000, step: 50 },
  { label: 'Fire cooldown', section: 'player', key: 'fireCooldownMs', min: 20, max: 5000, step: 10 },
  { label: 'Max ship speed', section: 'player', key: 'maxSpeed', min: 50, max: 10000, step: 25 },
  { label: 'Acceleration', section: 'player', key: 'acceleration', min: 50, max: 20000, step: 50 },
  { label: 'Normal regeneration', section: 'player', key: 'healthRegenPerSecond', min: 0, max: 1000, step: 1 },
  { label: 'Base regeneration', section: 'player', key: 'baseHealthRegenPerSecond', min: 0, max: 5000, step: 5 },
  { label: 'Asteroid collision damage', section: 'player', key: 'asteroidCollisionDamage', min: 0, max: 1000, step: 1 },
  { label: 'Respawn delay', section: 'player', key: 'respawnDelayMs', min: 0, max: 30000, step: 100 },
  { label: 'Respawn invulnerability', section: 'player', key: 'respawnInvulnerabilityMs', min: 0, max: 30000, step: 100 }
];

const npcFields: Array<NumberField<'npc'>> = [
  { label: 'Max health', section: 'npc', key: 'maxHealth', min: 1, max: 5000, step: 1 },
  { label: 'Projectile damage', section: 'npc', key: 'projectileDamage', min: 0, max: 1000, step: 1 },
  { label: 'Projectile speed', section: 'npc', key: 'projectileSpeed', min: 100, max: 10000, step: 50 },
  { label: 'Projectile range', section: 'npc', key: 'projectileRange', min: 100, max: 10000, step: 50 },
  { label: 'Fire cooldown', section: 'npc', key: 'fireCooldownMs', min: 20, max: 5000, step: 10 },
  { label: 'Max ship speed', section: 'npc', key: 'maxSpeed', min: 50, max: 10000, step: 25 },
  { label: 'Acceleration', section: 'npc', key: 'acceleration', min: 50, max: 20000, step: 50 },
  { label: 'Normal regeneration', section: 'npc', key: 'healthRegenPerSecond', min: 0, max: 1000, step: 1 },
  { label: 'Base repair', section: 'npc', key: 'baseRepairPerSecond', min: 0, max: 5000, step: 5 },
  { label: 'Retreat HP threshold', section: 'npc', key: 'retreatHealthThreshold', min: 0, max: 5000, step: 1 },
  { label: 'Player detection radius', section: 'npc', key: 'detectionRadius', min: 100, max: 10000, step: 50 },
  { label: 'Player lose radius', section: 'npc', key: 'loseRadius', min: 100, max: 15000, step: 50 },
  { label: 'Attack range', section: 'npc', key: 'attackRange', min: 50, max: 10000, step: 50 },
  { label: 'Preferred attack range', section: 'npc', key: 'preferredAttackRange', min: 50, max: 10000, step: 50 },
  { label: 'Respawn delay', section: 'npc', key: 'respawnDelayMs', min: 0, max: 30000, step: 100 }
];

const baseFields: Array<NumberField<'redBase'>> = [
  { label: 'Regen zone radius', section: 'redBase', key: 'zoneRadius', min: 50, max: 5000, step: 25 },
  { label: 'Defense radius', section: 'redBase', key: 'defenseRadius', min: 50, max: 8000, step: 25 },
  { label: 'Allied regen', section: 'redBase', key: 'alliedRegenPerSecond', min: 0, max: 5000, step: 5 },
  { label: 'Enemy damage/tick', section: 'redBase', key: 'enemyDamagePerTick', min: 0, max: 5000, step: 5 },
  { label: 'Damage interval', section: 'redBase', key: 'enemyDamageIntervalMs', min: 50, max: 10000, step: 50 }
];

export class AdminPanel {
  private readonly root: HTMLElement;
  private readonly actions: AdminPanelActions;
  private readonly inputs = new Map<string, HTMLInputElement>();
  private readonly message: HTMLElement;

  constructor(scene: Phaser.Scene, actions: AdminPanelActions) {
    this.actions = actions;
    this.root = document.createElement('section');
    this.root.className = 'admin-panel';
    this.root.hidden = true;

    const title = document.createElement('div');
    title.className = 'admin-panel__title';
    title.textContent = 'Admin panel';

    this.message = document.createElement('div');
    this.message.className = 'admin-panel__message';

    this.root.append(
      title,
      this.createSummary(),
      this.createSection('Player', playerFields, [
        ['Heal player', this.actions.healPlayer],
        ['Kill player', this.actions.killPlayer],
        ['Respawn player', this.actions.respawnPlayer],
        ['Player -> red base', this.actions.teleportPlayerToRedBase],
        ['Player -> center', this.actions.teleportPlayerToCenter]
      ]),
      this.createSection('NPC', npcFields, [
        ['Heal NPC', this.actions.healNpc],
        ['Damage NPC by 10', this.actions.damageNpc],
        ['Kill NPC', this.actions.killNpc],
        ['Respawn NPC', this.actions.respawnNpc],
        ['NPC -> blue base', this.actions.teleportNpcToBlueBase],
        ['NPC -> center', this.actions.teleportNpcToCenter],
        ['Force NPC retreat', this.actions.forceNpcRetreat],
        ['Reset NPC state', this.actions.resetNpcState]
      ]),
      this.createBaseSection('Red base', 'redBase'),
      this.createBaseSection('Blue base', 'blueBase'),
      this.createDebugSection(),
      this.message
    );

    document.body.append(this.root);
    this.root.addEventListener('pointerdown', this.stopGamePointerEvent);
    this.root.addEventListener('pointermove', this.stopGamePointerEvent);
    this.root.addEventListener('pointerup', this.stopGamePointerEvent);
    this.root.addEventListener('click', this.stopGamePointerEvent);
    this.root.addEventListener('wheel', this.stopGamePointerEvent, { passive: false });
    this.root.addEventListener('keydown', this.handlePanelKeyDown);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.refresh();
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
      this.refresh();
      this.root.focus({ preventScroll: true });
    }
  }

  layout(): void {
    return;
  }

  refresh(): void {
    for (const [key, input] of this.inputs) {
      const [section, field] = key.split('.');
      const value = this.readValue(section, field);
      input.value = typeof value === 'boolean' ? String(value) : String(Math.round(value * 100) / 100);
      input.checked = Boolean(value);
    }

    this.message.textContent = this.validationMessage();
  }

  private createSummary(): HTMLElement {
    const summary = document.createElement('div');
    summary.className = 'admin-panel__summary';
    summary.textContent = 'Runtime balance. Changes apply to new actions immediately.';
    return summary;
  }

  private createSection(
    title: string,
    fields: Array<NumberField<'player'> | NumberField<'npc'>>,
    buttons: Array<[string, () => void]>
  ): HTMLElement {
    const section = document.createElement('details');
    section.className = 'admin-panel__section';
    section.open = title === 'Player';

    const summary = document.createElement('summary');
    summary.textContent = title;
    section.append(summary);

    for (const field of fields) {
      section.append(this.createNumberField(field));
    }

    section.append(this.createButtonGrid(buttons));
    return section;
  }

  private createBaseSection(title: string, side: 'redBase' | 'blueBase'): HTMLElement {
    const section = document.createElement('details');
    section.className = 'admin-panel__section';

    const summary = document.createElement('summary');
    summary.textContent = title;
    section.append(summary);

    for (const field of baseFields) {
      section.append(this.createNumberField({ ...field, section: side }));
    }

    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'admin-panel__toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = runtimeBalance[side].defenseEnabled;
    checkbox.addEventListener('change', () => {
      setBaseSetting(side, 'defenseEnabled', checkbox.checked);
      this.refresh();
    });
    this.inputs.set(`${side}.defenseEnabled`, checkbox);
    toggleLabel.append(checkbox, document.createTextNode(' Defense enabled'));
    section.append(toggleLabel);

    return section;
  }

  private createDebugSection(): HTMLElement {
    const section = document.createElement('details');
    section.className = 'admin-panel__section';

    const summary = document.createElement('summary');
    summary.textContent = 'Debug';
    section.append(summary);

    const aiToggle = document.createElement('label');
    aiToggle.className = 'admin-panel__toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = runtimeBalance.aiPaused;
    checkbox.addEventListener('change', () => {
      setAiPaused(checkbox.checked);
      this.refresh();
    });
    this.inputs.set('debug.aiPaused', checkbox);
    aiToggle.append(checkbox, document.createTextNode(' Pause AI'));

    section.append(
      aiToggle,
      this.createButtonGrid([
        ['Destroy all asteroids', this.actions.destroyAllAsteroids],
        ['Respawn all asteroids', this.actions.respawnAllAsteroids],
        ['Save', () => {
          saveRuntimeBalance();
          this.refresh();
        }],
        ['Reset to defaults', () => {
          resetRuntimeBalance();
          this.refresh();
        }]
      ])
    );

    return section;
  }

  private createNumberField(
    field: NumberField<'player'> | NumberField<'npc'> | NumberField<'redBase'> | NumberField<'blueBase'>
  ): HTMLElement {
    const wrapper = document.createElement('label');
    wrapper.className = 'admin-panel__field';

    const text = document.createElement('span');
    text.textContent = field.label;

    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(field.min);
    input.max = String(field.max);
    input.step = String(field.step);
    input.value = String(this.readValue(field.section, String(field.key)));
    input.addEventListener('change', () => this.handleNumberChange(field, input));
    input.addEventListener('blur', () => this.handleNumberChange(field, input));

    this.inputs.set(`${field.section}.${String(field.key)}`, input);
    wrapper.append(text, input);
    return wrapper;
  }

  private createButtonGrid(buttons: Array<[string, () => void]>): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'admin-panel__buttons';

    for (const [label, handler] of buttons) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => {
        handler();
        this.refresh();
      });
      grid.append(button);
    }

    return grid;
  }

  private handleNumberChange(
    field: NumberField<'player'> | NumberField<'npc'> | NumberField<'redBase'> | NumberField<'blueBase'>,
    input: HTMLInputElement
  ): void {
    const value = Number(input.value);

    if (field.section === 'player') {
      setPlayerSetting(field.key as keyof PlayerCombatSettings, value);
    } else if (field.section === 'npc') {
      setNpcSetting(field.key as keyof NpcCombatSettings, value);
    } else {
      setBaseSetting(field.section, field.key as keyof BaseCombatSettings, value);
    }

    this.refresh();
  }

  private readValue(section: string, field: string): number | boolean {
    if (section === 'debug') {
      return runtimeBalance.aiPaused;
    }

    const source = runtimeBalance[section as 'player' | 'npc' | 'redBase' | 'blueBase'] as unknown as Record<string, number | boolean>;
    return source[field] ?? 0;
  }

  private validationMessage(): string {
    const messages: string[] = [];

    if (runtimeBalance.npc.loseRadius === runtimeBalance.npc.detectionRadius) {
      messages.push('NPC lose radius was clamped to detection radius.');
    }

    if (runtimeBalance.npc.attackRange === runtimeBalance.npc.preferredAttackRange) {
      messages.push('NPC attack range was clamped to preferred range.');
    }

    if (runtimeBalance.npc.retreatHealthThreshold >= runtimeBalance.npc.maxHealth) {
      messages.push('NPC retreat threshold must stay below max health.');
    }

    return messages.join(' ');
  }

  private readonly handlePanelKeyDown = (event: KeyboardEvent): void => {
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

  private destroy(): void {
    this.root.remove();
  }
}
