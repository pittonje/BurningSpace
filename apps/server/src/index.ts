import { createServer } from 'node:http';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import type { JoinRequest } from '@burningspace/shared';

const port = Number(process.env.PORT ?? 2567);
type FutureJoinRequest = JoinRequest;

const httpServer = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true, service: 'burningspace-server' }));
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ ok: false, error: 'not_found' }));
});

new Server({
  transport: new WebSocketTransport({
    server: httpServer
  })
});

httpServer.listen(port, () => {
  console.log(`BurningSpace server listening on http://localhost:${port}`);
  console.log('Health endpoint: /health');
});
