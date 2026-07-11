import Phaser from 'phaser';
import type { JoinMode, JoinRequest, RoomParticipant } from '@burningspace/protocol';
import type { Faction } from '@burningspace/shared';
import { NetworkClient, type ConnectionState, type Unsubscribe } from '../network/NetworkClient';
import { networkClient } from '../network/networkSession';

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  textContent?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (textContent !== undefined) {
    element.textContent = textContent;
  }

  return element;
}

export class NetworkTestScene extends Phaser.Scene {
  private network?: NetworkClient;
  private root?: HTMLDivElement;
  private statusValue?: HTMLSpanElement;
  private errorText?: HTMLDivElement;
  private profileErrorText?: HTMLDivElement;
  private roomInfoText?: HTMLDivElement;
  private nicknameInput?: HTMLInputElement;
  private modeSelect?: HTMLSelectElement;
  private factionSelect?: HTMLSelectElement;
  private factionField?: HTMLLabelElement;
  private connectButton?: HTMLButtonElement;
  private applyButton?: HTMLButtonElement;
  private enterMultiplayerButton?: HTMLButtonElement;
  private disconnectButton?: HTMLButtonElement;
  private participantsList?: HTMLUListElement;
  private connectionState: ConnectionState = { status: 'disconnected' };
  private readonly disposers: Unsubscribe[] = [];
  private keepConnectionOnShutdown = false;

  constructor() {
    super('NetworkTestScene');
  }

  create(): void {
    this.network = networkClient;
    this.keepConnectionOnShutdown = false;
    this.createUi();
    this.bindNetwork();
    this.render();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyUi());
  }

  private createUi(): void {
    const root = createElement('div', 'network-test');
    const panel = createElement('section', 'network-test__panel');
    const title = createElement('h1', 'network-test__title', 'BurningSpace Multiplayer Test');

    const status = createElement('div', 'network-test__status');
    status.append('Server: ');
    this.statusValue = createElement('span', 'network-test__status-value', 'disconnected');
    status.append(this.statusValue);

    this.roomInfoText = createElement('div', 'network-test__room-info', '');
    this.errorText = createElement('div', 'network-test__error', '');
    this.profileErrorText = createElement('div', 'network-test__error', '');

    this.nicknameInput = createElement('input', 'network-test__input');
    this.nicknameInput.value = `Guest${Math.floor(100 + Math.random() * 900)}`;
    this.nicknameInput.maxLength = 20;

    this.modeSelect = createElement('select', 'network-test__input');
    this.addOption(this.modeSelect, 'player', 'player');
    this.addOption(this.modeSelect, 'spectator', 'spectator');
    this.modeSelect.value = 'player';

    this.factionSelect = createElement('select', 'network-test__input');
    this.addOption(this.factionSelect, 'red', 'red');
    this.addOption(this.factionSelect, 'blue', 'blue');
    this.factionSelect.value = 'red';

    const form = createElement('div', 'network-test__form');
    form.append(
      this.createField('Nickname', this.nicknameInput),
      this.createField('Mode', this.modeSelect)
    );
    this.factionField = this.createField('Faction', this.factionSelect);
    form.append(this.factionField);

    this.connectButton = createElement('button', 'network-test__button', 'Connect');
    this.applyButton = createElement('button', 'network-test__button', 'Apply profile');
    this.enterMultiplayerButton = createElement('button', 'network-test__button', 'Enter multiplayer');
    this.disconnectButton = createElement('button', 'network-test__button', 'Disconnect');
    const openLocalButton = createElement('button', 'network-test__button network-test__button--secondary', 'Open local prototype');

    const buttons = createElement('div', 'network-test__buttons');
    buttons.append(this.connectButton, this.applyButton, this.enterMultiplayerButton, this.disconnectButton, openLocalButton);

    const participantsTitle = createElement('h2', 'network-test__subtitle', 'Participants');
    this.participantsList = createElement('ul', 'network-test__participants');

    panel.append(
      title,
      status,
      this.roomInfoText,
      this.errorText,
      this.profileErrorText,
      form,
      buttons,
      participantsTitle,
      this.participantsList
    );
    root.append(panel);
    document.body.append(root);
    this.root = root;

    this.connectButton.addEventListener('click', () => {
      void this.network?.connect().then(() => {
        this.network?.setProfile(this.getProfile());
      });
    });
    this.applyButton.addEventListener('click', () => this.network?.setProfile(this.getProfile()));
    this.enterMultiplayerButton.addEventListener('click', () => {
      this.keepConnectionOnShutdown = true;
      this.scene.start('MultiplayerGameScene');
    });
    this.disconnectButton.addEventListener('click', () => {
      void this.network?.disconnect();
    });
    openLocalButton.addEventListener('click', () => {
      void this.network?.disconnect().finally(() => {
        this.scene.start('GameScene');
      });
    });
    this.modeSelect.addEventListener('change', () => this.render());
  }

  private bindNetwork(): void {
    if (!this.network) {
      return;
    }

    this.disposers.push(
      this.network.onConnectionStateChanged((state) => {
        this.connectionState = state;
        this.render();
      }),
      this.network.onParticipantAdded(() => this.renderParticipants()),
      this.network.onParticipantChanged(() => this.renderParticipants()),
      this.network.onParticipantRemoved(() => this.renderParticipants())
    );
  }

  private addOption(select: HTMLSelectElement, value: string, label: string): void {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  }

  private createField(labelText: string, input: HTMLElement): HTMLLabelElement {
    const label = createElement('label', 'network-test__field');
    const span = createElement('span', undefined, labelText);
    label.append(span, input);
    return label;
  }

  private getProfile(): JoinRequest {
    const mode = (this.modeSelect?.value === 'spectator' ? 'spectator' : 'player') satisfies JoinMode;
    const faction = this.factionSelect?.value === 'blue' ? 'blue' : 'red';

    return {
      nickname: this.nicknameInput?.value ?? '',
      mode,
      faction: mode === 'player' ? (faction satisfies Faction) : undefined
    };
  }

  private render(): void {
    const status = this.connectionState.status;

    if (this.statusValue) {
      this.statusValue.textContent = status;
      this.statusValue.dataset.status = status;
    }

    if (this.errorText) {
      this.errorText.textContent = this.connectionState.error ?? '';
      this.errorText.hidden = !this.connectionState.error;
    }

    if (this.profileErrorText) {
      this.profileErrorText.textContent = this.connectionState.profileError ?? '';
      this.profileErrorText.hidden = !this.connectionState.profileError;
    }

    if (this.roomInfoText) {
      const roomInfo = this.connectionState.roomInfo;
      this.roomInfoText.textContent = roomInfo
        ? `Room ${roomInfo.roomId} | ${roomInfo.connectedClients}/${roomInfo.maxClients}`
        : 'Room: -';
    }

    const connected = status === 'connected';
    const canDisconnect = status === 'connected' || status === 'error';
    const connecting = status === 'connecting';

    if (this.connectButton) {
      this.connectButton.disabled = connecting || canDisconnect;
    }

    if (this.applyButton) {
      this.applyButton.disabled = !connected || connecting;
    }

    if (this.enterMultiplayerButton) {
      this.enterMultiplayerButton.disabled = !this.network?.profile || !connected || connecting;
    }

    if (this.disconnectButton) {
      this.disconnectButton.disabled = !canDisconnect || connecting;
    }

    const spectator = this.modeSelect?.value === 'spectator';

    if (this.factionField) {
      this.factionField.hidden = spectator;
    }

    if (this.factionSelect) {
      this.factionSelect.disabled = spectator;
    }

    this.renderParticipants();
  }

  private renderParticipants(): void {
    if (!this.participantsList || !this.network) {
      return;
    }

    this.participantsList.replaceChildren();
    const participants = this.network.currentParticipants;

    if (participants.length === 0) {
      this.participantsList.append(createElement('li', 'network-test__participant-empty', 'No participants yet.'));
      return;
    }

    for (const participant of participants) {
      this.participantsList.append(this.createParticipantItem(participant));
    }
  }

  private createParticipantItem(participant: RoomParticipant): HTMLLIElement {
    const item = createElement('li', 'network-test__participant');
    const faction = participant.faction ?? '-';
    item.textContent = `${participant.nickname} | ${faction} | ${participant.mode}`;
    return item;
  }

  private destroyUi(): void {
    for (const dispose of this.disposers.splice(0)) {
      dispose();
    }

    if (!this.keepConnectionOnShutdown) {
      void this.network?.disconnect();
    }
    this.root?.remove();
    this.root = undefined;
    this.network = undefined;
  }
}
