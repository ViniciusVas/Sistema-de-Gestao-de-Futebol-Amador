import prisma from '../lib/prisma';

export class EventService {
  async getAll(peladaId: string) {
    return prisma.event.findMany({ 
      where: { peladaId },
      orderBy: { minute: 'asc' }
    });
  }

  async getByPelada(peladaId: string) {
    return this.getAll(peladaId);
  }

  async create(data: any) {
    return prisma.event.create({
      data: {
        peladaId: data.peladaId,
        type: data.type,
        playerId: data.playerId,
        assistPlayerId: data.assistPlayerId,
        minute: data.minute || 0
      }
    });
  }

  async delete(id: string) {
    return prisma.event.delete({ where: { id } });
  }
}
