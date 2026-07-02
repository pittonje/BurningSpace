# BurningSpace

BurningSpace - локальный прототип браузерной космической аркады на Phaser 3, TypeScript и Vite.

Проект подготовлен к будущей мультиплеерной архитектуре и теперь использует структуру монорепозитория. Текущая игровая логика пока остается локальной на клиенте: игрок, NPC, астероиды, снаряды, здоровье, базы, защита баз, HUD и админская панель работают в браузере как раньше.

## Структура

```text
apps/client      Phaser/Vite клиент и все текущие игровые ассеты
apps/server      минимальная серверная заготовка с health endpoint
packages/shared  общие типы и константы будущего сетевого протокола
```

Сервер на этом этапе не содержит игровой комнаты, синхронизации движения, серверных снарядов или переноса логики астероидов/NPC. Это только стартовая сетeвая основа.

## Установка

```bash
npm install
```

## Запуск

Клиент:

```bash
npm run dev:client
```

Сервер:

```bash
npm run dev:server
```

Health endpoint сервера:

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

## Проверка

```bash
npm run typecheck
npm run build
```

Отдельно:

```bash
npm run typecheck:client
npm run typecheck:server
npm run build:client
npm run build:server
```

## Текущий статус

- Стабильный тег локального прототипа: `local-prototype-v0.4`.
- Рабочая ветка мультиплеерной подготовки: `multiplayer-foundation`.
- Клиент: `apps/client`.
- Сервер: `apps/server`.
- Общие типы: `packages/shared`.

## Управление в игре

- `WASD` - движение.
- Мышь - направление корабля.
- ЛКМ - стрельба.
- `M` - большая карта.
- `F1` - debug-информация.
- `P` - админская панель в dev-режиме.
