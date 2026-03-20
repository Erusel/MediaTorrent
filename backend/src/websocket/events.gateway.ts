import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`WS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`WS client disconnected: ${client.id}`);
  }

  broadcastTorrentProgress(
    mediaId: string,
    data: {
      progress: number;
      downloadSpeed: number;
      uploadSpeed: number;
      eta: number;
      state: string;
    },
  ) {
    this.server.emit('torrent:progress', { mediaId, ...data });
  }

  broadcastUploadProgress(uploadId: string, progress: number) {
    this.server.emit('upload:progress', { uploadId, progress });
  }

  broadcastNotification(userId: string, message: string) {
    this.server.emit('notification', { userId, message, timestamp: new Date() });
  }

  broadcastMediaUpdate(mediaId: string, status: string) {
    this.server.emit('media:update', { mediaId, status });
  }
}
