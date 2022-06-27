import { MessageBody, SubscribeMessage, WebSocketGateway, OnGatewayConnection, WebSocketServer, OnGatewayDisconnect, ConnectedSocket } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';

@WebSocketGateway({ pingTimeout: 30000 })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  server: Server;
  client: any;
  wsClients = [];
  messages = [];

  handleConnection(client: any, @MessageBody() data: string): void {
    this.client = client;
    console.log("client connected")
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
    this.wsClients.push({
      id: socket.id,
      username: data,
      status: "online"
    });
    let result = this.wsClients.filter(user => data != user.username)
      .map((user) => {
        return { username: user.username, status: user.status }
      });
    socket.broadcast.emit('playerJoined', { username: data, status: "online" });
    this.client.emit('fetchPlayersList', result);
    this.client.emit('fetchMessages', this.messages);
  }

  @SubscribeMessage('playerLeft')
  handlePlayerLeft(@ConnectedSocket() socket: Socket, @MessageBody() data: string): void {
    console.log('handlePlayerLeft', data)
    socket.broadcast.emit('playerLeft', data);
  }

  @SubscribeMessage('updatePlayerStatus')
  handlePlayerStatusUpdate(@ConnectedSocket() socket: Socket, @MessageBody() data: { username, status }): void {
    console.log('handlePlayerStatusUpdate', data)
    socket.broadcast.emit('updatePlayerStatus', { username: data.username, status: data.status });
  }


  @SubscribeMessage('newMessage')
  handleNewMessage(@ConnectedSocket() socket: Socket, @MessageBody() data: { username, text }): void {
    console.log('handleNewMessage', data);
    let message = { username: data.username, text: data.text, sentAt: new Date().toDateString() };
    this.messages.push(message);
    if (this.messages.length > 50) {
      this.messages.splice(0, 1);
    }
    socket.broadcast.emit('newMessage', message);
    // success response to sender
    this.client.emit('messageSent', message);
  }

}
