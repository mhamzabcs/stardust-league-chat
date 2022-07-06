import { MessageBody, SubscribeMessage, WebSocketGateway, OnGatewayConnection, WebSocketServer, OnGatewayDisconnect, ConnectedSocket } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { JsonparsePipe } from 'src/pipes/jsonparse.pipe';

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
      username: data ? data : "Guest" + Math.floor(Math.random() * 1000),
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
  handlePlayerStatusUpdate(@ConnectedSocket() socket: Socket, @MessageBody(new JsonparsePipe()) body: any): void {
    console.log('handlePlayerStatusUpdate', body)
    this.wsClients.forEach(client => {
      if (body.username == client.username) {
        client.status = body.status
      }
    });
    socket.broadcast.emit('updatePlayerStatus', { username: body.username, status: body.status });
  }


  @SubscribeMessage('newMessage')
  handleNewMessage(@ConnectedSocket() socket: Socket, @MessageBody(new JsonparsePipe()) body: any): void {
    console.log('handleNewMessage', body);
    let message = { username: body.username, text: body.text, sentAt: new Date().toDateString() };
    this.messages.push(message);
    if (this.messages.length > 50) {
      this.messages.splice(0, 1);
    }
    socket.broadcast.emit('newMessage', message);
    // success response to sender
    this.client.emit('messageSent', message);
  }

  @SubscribeMessage('updateUsername')
  handleUsernameChange(@ConnectedSocket() socket: Socket, @MessageBody(new JsonparsePipe()) body: any): void {
    console.log('handleUsernameChange', body);
    this.wsClients.forEach(client => {
      if (body.oldUsername == client.username) {
        client.username = body.newUsername
      }
    });
    this.messages.forEach(message => {
      if (body.oldUsername == message.username) {
        message.username = body.newUsername
      }
    });
  }

  @SubscribeMessage('sendInvite')
  handlePrivateInvite(@ConnectedSocket() socket: Socket, @MessageBody(new JsonparsePipe()) body: any): void {
    console.log('handlePrivateInvite', body);
    const { receiver, sender, roomId } = body;
    if (sender != receiver) {
      this.wsClients.forEach(client => {
        if (receiver == client.username) {
          this.server.to(client.id).emit('newInvite', JSON.stringify({ receiver, sender, roomId }));
        }
      });
    }
  }

  @SubscribeMessage('inviteResponse')
  handleInviteResponse(@ConnectedSocket() socket: Socket, @MessageBody(new JsonparsePipe()) body: any): void {
    console.log('handleInviteResponse', body);
    const { receiver, sender, status, roomId } = body;
    if (sender != receiver) {
      this.wsClients.forEach(client => {
        if (sender == client.username) {
          this.server.to(client.id).emit('inviteResponse', JSON.stringify({ receiver, sender, status, roomId })); // added room id here too
        }
      });
    }
  }

}
