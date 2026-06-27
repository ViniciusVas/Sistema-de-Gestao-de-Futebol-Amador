import prisma from '../lib/prisma';

export class PlayerService {
  async getAll(userId: string) {
    const players = await prisma.player.findMany({ 
      where: { userId },
      orderBy: { name: 'asc' }
    });
    return players.map(p => ({
      id: p.id,
      nome: p.name,
      nivel_estrelas: p.stars,
      ativo: p.active,
      data_cadastro: p.createdAt.toISOString()
    }));
  }

  async getById(id: string) {
    const p = await prisma.player.findUnique({ 
      where: { id },
      include: {
        stats: true,
        estatisticaPelada: true,
        inscritos: {
          include: {
            pelada: true
          }
        }
      }
    });
    if (!p) return null;
    
    const ep = p.estatisticaPelada || p.stats;

    return {
      id: p.id,
      nome: p.name,
      nivel_estrelas: p.stars,
      ativo: p.active,
      data_cadastro: p.createdAt.toISOString(),
      estatisticas: ep ? {
        total_jogos: 'total_jogos' in ep ? ep.total_jogos : ep.matchesPlayed,
        total_gols: 'total_gols' in ep ? ep.total_gols : ep.goals,
        total_assistencias: 'total_assistencias' in ep ? ep.total_assistencias : ep.assists,
        total_vitorias: 'total_vitorias' in ep ? ep.total_vitorias : ep.wins,
        total_empates: 'total_empates' in ep ? ep.total_empates : ep.draws,
        total_derrotas: 'total_derrotas' in ep ? ep.total_derrotas : ep.losses,
        media_gols: 'media_gols' in ep ? ep.media_gols : (ep.matchesPlayed > 0 ? ep.goals / ep.matchesPlayed : 0)
      } : {
        total_jogos: 0,
        total_gols: 0,
        total_assistencias: 0,
        total_vitorias: 0,
        total_empates: 0,
        total_derrotas: 0,
        media_gols: 0
      },
      peladaJogadores: p.inscritos
    };
  }

  async create(data: any, userId: string) {
    return prisma.player.create({
      data: {
        name: data.nome || data.name,
        stars: Number(data.nivel_estrelas || data.stars || 0),
        active: data.ativo !== undefined ? data.ativo : true,
        userId
      }
    });
  }

  async update(id: string, data: any) {
    const updateData: any = {};
    if (data.nome) updateData.name = data.nome;
    if (data.nivel_estrelas !== undefined) updateData.stars = Number(data.nivel_estrelas);
    if (data.ativo !== undefined) updateData.active = data.ativo;

    return prisma.player.update({
      where: { id },
      data: updateData
    });
  }

  async delete(id: string) {
    return prisma.player.update({
      where: { id },
      data: { active: false }
    });
  }
}
