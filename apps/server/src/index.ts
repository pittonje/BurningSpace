import { createServer } from 'node:http';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { registerProductionRooms } from './rooms/productionRoomRegistry.js';

const port = Number(process.env.PORT ?? 2567);

const httpServer = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true, service: 'burningspace-server' }));
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ ok: false, error: 'not_found' }));
});

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer
  })
});

registerProductionRooms(gameServer);

httpServer.listen(port, () => {
  console.log(`BurningSpace server listening on http://localhost:${port}`);
  console.log('Health endpoint: /health');
  console.log('Colyseus room: battle');
});
