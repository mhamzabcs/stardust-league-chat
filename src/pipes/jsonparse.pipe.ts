import { ArgumentMetadata, Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';


@Injectable()
export class JsonparsePipe implements PipeTransform {
  transform(data: any, metadata: ArgumentMetadata) {
    try {
      console.log(data)
      return JSON.parse(data);
    } catch (e) {
      // console.log(2)
      // console.log(e)
      throw new WsException('Bad Request');
    }
  }
}

