import { MessageBody, SubscribeMessage, WebSocketGateway, OnGatewayConnection, WebSocketServer, OnGatewayDisconnect, ConnectedSocket } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@WebSocketGateway({ transports: ['websocket'] })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  server;
  client: any;
  wsClients = [];

  handleConnection(client: any, @MessageBody() data: string, @ConnectedSocket() socket: Socket): void {
    this.client = client;
    console.log("client connected")
    this.wsClients.push({
      id: client.id,
      username: client.handshake.query.username,
      status: "online"
    });
    let result = this.wsClients.filter(user => client.handshake.query.username != user.username)
      .map((user) => {
        return { username: user.username, status: user.status }
      });
    client.emit('fetchPlayersList', JSON.stringify(result));
  }

  handleDisconnect(client: any): void {
    this.client = null;
    let username;
    for (let i = 0; i < this.wsClients.length; i++) {
      if (this.wsClients[i].id === client.id) {
        username = this.wsClients[i].username;
        this.wsClients.splice(i, 1);
        break;
      }
    }
    console.log("client disconnected, " + username);
    client.broadcast.emit('playerLeft', username);
  }

  @SubscribeMessage('playerJoined')
  handlePlayerJoin(@ConnectedSocket() socket: Socket, @MessageBody() data: string): void {
    console.log('handlePlayerJoin', data)
    socket.broadcast.emit('playerJoined', JSON.stringify({ username: data, status: "online" }));
  }

  @SubscribeMessage('playerLeft')
  handlePlayerLeft(@ConnectedSocket() socket: Socket, @MessageBody() data: string): void {
    console.log('handlePlayerLeft', data)
    socket.broadcast.emit('playerLeft', data);
  }



}
