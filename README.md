# BurningSpace

BurningSpace - браузерный космический прототип на Phaser 3, TypeScript, Vite и Colyseus.

Перед архитектурной или технической работой прочитайте `PROJECT_CONTEXT.md`, затем `AGENTS.md` и актуальный файл задачи в `docs/tasks/`.

Проект использует монорепозиторий. Локальная аркада остается отдельной клиентской сценой, а multiplayer-сцена постепенно переносится на серверно-авторитетную модель. Сейчас сервер уже отвечает за сетевых игроков, движение, снаряды, попадания, здоровье, смерть и респавн.

## Структура

```text
apps/client      Phaser/Vite клиент и игровые ассеты
apps/server      Node.js/TypeScript/Colyseus сервер
packages/shared  текущие общие типы, константы и сетевой контракт
packages/protocol будущая граница сетевых сообщений и снимков
packages/balance принятые версионированные константы баланса
packages/config  конфигурация карты и топологии
```

## Установка

```bash
npm install
```

## Запуск

Сервер:

```bash
npm run dev:server
```

Клиент:

```bash
npm run dev:client
```

Health endpoint:

```text
http://localhost:2567/health
```

Ожидаемый ответ:

```json
{
  "ok": true,
  "service": "burningspace-server"
}
```

## Базовый сетевой тест

1. Запустить сервер: `npm run dev:server`.
2. Запустить клиент: `npm run dev:client`.
3. Открыть две вкладки клиента.
4. Нажать `Connect` в обеих вкладках.
5. Задать разные ники.
6. Выбрать разные фракции: `red` и `blue`.
7. Нажать `Apply profile`.
8. Проверить одинаковый список участников.
9. Нажать `Enter multiplayer` в обеих вкладках.
10. Проверить, что оба корабля видны в сетевой сцене.

## Сетевой бой игроков

BattleRoom синхронизирует через Colyseus Schema:

- `participants` - подключенные участники;
- `ships` - серверные корабли игроков;
- `projectiles` - серверные снаряды.

Клиентская сцена отправляет только состояние ввода: движение, `aimAngle` и `shooting`. `NetworkClient` добавляет monotonically increasing `sequence`, а сервер сам считает движение, создает снаряды, двигает их с фиксированной скоростью, проверяет swept circle collision, запрещает friendly fire и self-hit, применяет урон, рассылает hit/death events и выполняет respawn.

Текущие сетевые правила:

- один player-профиль с faction `red` или `blue` получает один корабль;
- spectator видит корабли и снаряды, но не получает собственный корабль;
- ЛКМ или `Space` стреляют в multiplayer-сцене;
- попадание снаряда снимает 15 HP;
- корабль имеет 100 HP;
- при 0 HP корабль скрывается, получает таймер респавна и появляется на базе своей фракции;
- после респавна действует короткая неуязвимость;
- снаряды не наносят урон владельцу и союзникам.

Локальная сцена `GameScene` не использует эту сетевую механику. Астероиды, NPC, базы, runtime balance и админ-панель остаются частью локального прототипа.

## Multiplayer Combat Lifecycle Hardening

- Input sequence хранится в `NetworkClient`, поэтому переход `MultiplayerGameScene -> NetworkTestScene -> MultiplayerGameScene` не сбрасывает управление.
- Stale input автоматически нейтрализуется сервером через `NETWORK_INPUT_TIMEOUT_MS`: корабль перестает ускоряться и стрелять, если новые input-сообщения не приходят.
- `mode` и `faction` фиксируются после первого принятого профиля до disconnect; менять можно только nickname.
- Ошибка валидации профиля отделена от connection error: соединение остается `connected`, а UI показывает profile error отдельно.
- Уже выпущенные `ProjectileState` переживают disconnect владельца и удаляются только по попаданию, дальности или выходу за границы мира.
- Клиент хранит `serverClockOffsetMs` из `roomInfo.serverTime` и использует оценку серверного времени для respawn countdown и invulnerability visual.
- Test teleport удалён из обычной `BattleRoom`; lifecycle-проверки используют отдельную `TestBattleRoom`, не зарегистрированную в production entrypoint.

## Управление

Сетевая сцена:

- `WASD` или стрелки - движение игрока или свободная камера spectator.
- Мышь - направление поворота корабля.
- ЛКМ или `Space` - стрельба.
- `Esc` - вернуться в сетевое lobby без отключения от комнаты.

Локальная игра:

- `WASD` - движение.
- Мышь - направление корабля.
- ЛКМ - стрельба.
- `M` - большая карта.
- `F1` - debug-информация.
- `P` - админская панель в dev-режиме.

## Проверка

```bash
npm run typecheck
npm run build
```

Диагностические скрипты:

```bash
npx tsx apps/server/scripts/movement-check.ts
npx tsx apps/server/scripts/combat-check.ts
npx tsx apps/client/scripts/network-client-callback-check.ts
```

`network-client-callback-check.ts` сам запускает test-only Colyseus room, подключает двух игроков и spectator, проверяет синхронизацию участников/кораблей, profile lifecycle, stale input timeout, death/respawn, invulnerability и то, что снаряды переживают disconnect владельца.

## Текущий статус

- Стабильный тег локального прототипа: `local-prototype-v0.4`.
- Рабочая ветка мультиплеерной архитектуры: `multiplayer-foundation`.
- Клиент: `apps/client`.
- Сервер: `apps/server`.
- Текущий общий runtime-контракт: `packages/shared`.
- Будущие структурные границы: `packages/protocol`, `packages/balance`, `packages/config`.

## Ограничения

- Астероиды, NPC, базы и боевой баланс пока не перенесены на сервер.
- Нет выбора свободных командных слотов и spectator-камеры по игрокам.
- Нет server reconciliation/prediction; клиент интерполирует серверные состояния.
- Нет постоянной базы данных, Docker и production deployment.
