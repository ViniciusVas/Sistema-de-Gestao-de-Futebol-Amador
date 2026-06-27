import { Server, Socket } from 'socket.io';

export const setupGameSockets = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-game', (peladaId: string) => {
      socket.join(`game:${peladaId}`);
      console.log(`User joined game room: ${peladaId}`);
    });

    socket.on('cronometro:iniciar', (data: { peladaId: string, segundos: number }) => {
      io.to(`game:${data.peladaId}`).emit('cronometro:atualizado', { status: 'running', segundos: data.segundos });
    });

    socket.on('cronometro:pausar', (data: { peladaId: string, segundos: number }) => {
      io.to(`game:${data.peladaId}`).emit('cronometro:atualizado', { status: 'paused', segundos: data.segundos });
    });

    socket.on('cronometro:reiniciar', (data: { peladaId: string }) => {
      io.to(`game:${data.peladaId}`).emit('cronometro:atualizado', { status: 'reset', segundos: 0 });
    });

    socket.on('placar:atualizar', (data: { peladaId: string, casa: number, visitante: number }) => {
      io.to(`game:${data.peladaId}`).emit('placar:atualizado', { casa: data.casa, visitante: data.visitante });
    });

    socket.on('evento:novo', (data: { peladaId: string, evento: any }) => {
      io.to(`game:${data.peladaId}`).emit('evento:recebido', data.evento);
    });

    socket.on('game:atualizar', (peladaId: string) => {
      io.to(`game:${peladaId}`).emit('game:refresh');
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};
