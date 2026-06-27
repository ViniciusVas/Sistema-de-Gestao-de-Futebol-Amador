import prisma from '../lib/prisma';

export async function updateEstatisticaJogadorPelada(playerId: string) {
  const stats = await prisma.playerStats.findUnique({
    where: { playerId }
  });

  const totalJogos = stats?.matchesPlayed || 0;
  const totalGols = stats?.goals || 0;
  const totalAssistencias = stats?.assists || 0;
  const totalVitorias = stats?.wins || 0;
  const totalEmpates = stats?.draws || 0;
  const totalDerrotas = stats?.losses || 0;
  const mediaGols = totalJogos > 0 ? Number((totalGols / totalJogos).toFixed(2)) : 0;

  await prisma.estatisticaJogadorPelada.upsert({
    where: { jogador_id: playerId },
    create: {
      jogador_id: playerId,
      total_jogos: totalJogos,
      total_gols: totalGols,
      total_assistencias: totalAssistencias,
      total_vitorias: totalVitorias,
      total_empates: totalEmpates,
      total_derrotas: totalDerrotas,
      media_gols: mediaGols
    },
    update: {
      total_jogos: totalJogos,
      total_gols: totalGols,
      total_assistencias: totalAssistencias,
      total_vitorias: totalVitorias,
      total_empates: totalEmpates,
      total_derrotas: totalDerrotas,
      media_gols: mediaGols
    }
  });
}

export class PeladaService {
  async getAll(userId: string) {
    const peladas = await prisma.pelada.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: {
        inscritos: {
          include: {
            player: true
          }
        }
      }
    });

    return peladas.map(p => ({
      ...p,
      titulo: p.title,
      data_hora: p.date.toISOString(),
      local: p.location,
      jogadores_por_time: p.playersPerTeam,
      coletes: p.coletes.split(','),
      times_jogando: p.timesJogando ? p.timesJogando.split(',') : [],
      inscritos: p.inscritos.map(pj => ({
        id: pj.id,
        jogador: pj.playerId,
        jogador_nome: pj.player?.name || 'Unknown',
        jogador_nivel: pj.player?.stars || 0,
        ordem_chegada: pj.ordemChegada,
        presenca_confirmada: pj.presenceConfirmed,
        pagamento_confirmado: pj.paymentConfirmed
      }))
    }));
  }

  async getById(id: string) {
    const p = await prisma.pelada.findUnique({
      where: { id },
      include: {
        inscritos: {
          include: {
            player: true
          },
          orderBy: { ordemChegada: 'asc' }
        },
        times: true
      }
    });

    if (!p) return null;

    // Fetch players for all teams to get their names/stars
    const allPlayerIdsInTeams = p.times.flatMap(t => t.players ? t.players.split(',') : []);
    const playersMap = new Map();
    if (allPlayerIdsInTeams.length > 0) {
      const players = await prisma.player.findMany({
        where: { id: { in: allPlayerIdsInTeams } }
      });
      players.forEach(player => playersMap.set(player.id, player));
    }

    return {
      ...p,
      titulo: p.title,
      data_hora: p.date.toISOString(),
      local: p.location,
      jogadores_por_time: p.playersPerTeam,
      times_simultaneos: p.timesSimultaneos,
      duracao_minutos: p.duracaoMinutos,
      valor_por_jogador: p.valorPorJogador,
      valor_total: p.valorTotal,
      coletes: p.coletes.split(','),
      config_pagamento_visivel: p.configPagamentoVisivel,
      times_jogando: p.timesJogando ? p.timesJogando.split(',') : [],
      placar_casa: p.placarCasa,
      placar_visitante: p.placarVisitante,
      cronometro_segundos: p.cronometroSegundos,
      cronometro_ativo: p.cronometroAtivo,
      inscritos: p.inscritos.map(pj => ({
        id: pj.id,
        jogador: pj.playerId,
        jogador_nome: pj.player?.name || 'Unknown',
        jogador_nivel: pj.player?.stars || 0,
        ordem_chegada: pj.ordemChegada,
        presenca_confirmada: pj.presenceConfirmed,
        pagamento_confirmado: pj.paymentConfirmed
      })),
      times: p.times.map(t => ({
        id: t.id,
        nome_time: t.name,
        cor: t.color,
        vitorias: t.vitorias,
        empates: t.empates,
        derrotas: t.derrotas,
        gols_pro: t.golsPro,
        gols_contra: t.golsContra,
        jogadores: (t.players ? t.players.split(',') : []).map(pid => {
          const player = playersMap.get(pid);
          return {
            id: pid,
            jogador: pid,
            jogador_nome: player?.name || 'Unknown',
            jogador_nivel: player?.stars || 0
          };
        })
      }))
    };
  }

  async removeFromTeam(peladaId: string, playerId: string) {
    const times = await prisma.timePelada.findMany({ where: { peladaId } });
    for (const time of times) {
      if (time.players?.includes(playerId)) {
        const updatedPlayers = time.players.split(',').filter(id => id !== playerId).join(',');
        await prisma.timePelada.update({
          where: { id: time.id },
          data: { players: updatedPlayers }
        });
      }
    }
    return this.getById(peladaId);
  }

  async create(data: any, userId: string) {
    return prisma.pelada.create({
      data: {
        title: data.title || data.titulo,
        date: new Date(data.date || data.data_hora),
        location: data.location || data.local,
        playersPerTeam: data.playersPerTeam || data.jogadores_por_time || 5,
        timesSimultaneos: data.timesSimultaneos || data.times_simultaneos || 2,
        duracaoMinutos: data.duracaoMinutos || data.duracao_minutos || 10,
        valorPorJogador: data.valorPorJogador || data.valor_por_jogador,
        coletes: (data.coletes || ['#FF0000', '#0000FF']).join(','),
        userId
      }
    });
  }

  async update(id: string, data: any) {
    const updateData: any = {};
    if (data.titulo) updateData.title = data.titulo;
    if (data.data_hora) updateData.date = new Date(data.data_hora);
    if (data.local) updateData.location = data.local;
    if (data.jogadores_por_time !== undefined) updateData.playersPerTeam = data.jogadores_por_time;
    if (data.times_simultaneos !== undefined) updateData.timesSimultaneos = data.times_simultaneos;
    if (data.duracao_minutos !== undefined) updateData.duracaoMinutos = data.duracao_minutos;
    if (data.valor_por_jogador !== undefined) updateData.valorPorJogador = data.valor_por_jogador;
    if (data.valor_total !== undefined) updateData.valorTotal = data.valor_total;
    if (data.coletes !== undefined) updateData.coletes = data.coletes.join(',');
    if (data.config_pagamento_visivel !== undefined) updateData.configPagamentoVisivel = data.config_pagamento_visivel;
    
    return prisma.pelada.update({
      where: { id },
      data: updateData
    });
  }

  async addPlayer(peladaId: string, playerId: string) {
    const existing = await prisma.peladaJogador.findFirst({
      where: { peladaId, playerId }
    });
    if (existing) throw new Error('Jogador já está na lista desta pelada');

    const lastPlayer = await prisma.peladaJogador.findFirst({
      where: { peladaId },
      orderBy: { ordemChegada: 'desc' }
    });
    const order = (lastPlayer?.ordemChegada || 0) + 1;

    return prisma.peladaJogador.create({
      data: {
        peladaId,
        playerId,
        ordemChegada: order,
        presenceConfirmed: true
      }
    });
  }

  async removePlayer(peladaJogadorId: string) {
    return prisma.peladaJogador.delete({ where: { id: peladaJogadorId } });
  }

  async updatePlayer(peladaJogadorId: string, data: any) {
    const updateData: any = {};
    if (data.presenca_confirmada !== undefined) updateData.presenceConfirmed = data.presenca_confirmada;
    if (data.pagamento_confirmado !== undefined) updateData.paymentConfirmed = data.pagamento_confirmado;
    
    return prisma.peladaJogador.update({
      where: { id: peladaJogadorId },
      data: updateData
    });
  }

  async reorderPlayers(peladaId: string, playerIds: string[]) {
    for (let i = 0; i < playerIds.length; i++) {
      await prisma.peladaJogador.updateMany({
        where: { peladaId, playerId: playerIds[i] },
        data: { ordemChegada: i + 1 }
      });
    }
    return this.getById(peladaId);
  }

  async sortTeams(peladaId: string, type: 'aleatorio' | 'balanceado') {
    const pelada = await prisma.pelada.findUnique({ where: { id: peladaId } });
    if (!pelada) throw new Error('Pelada not found');

    let playersPerTeam = pelada.playersPerTeam || 5;

    let confirmedPresences = await prisma.peladaJogador.findMany({
      where: { peladaId, presenceConfirmed: true },
      include: { player: true }
    });

    if (confirmedPresences.length === 0) {
      confirmedPresences = await prisma.peladaJogador.findMany({
        where: { peladaId },
        include: { player: true }
      });
    }

    if (confirmedPresences.length < 2) {
      throw new Error('Necessário pelo menos 2 jogadores na pelada para o sorteio.');
    }

    const players = confirmedPresences.map(pj => pj.player);
    let sortedGroups: any[][] = [];

    if (type === 'aleatorio') {
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length; i += playersPerTeam) {
        sortedGroups.push(shuffled.slice(i, i + playersPerTeam));
      }
    } else {
      const sortedByStars = [...players].sort((a: any, b: any) => b.stars - a.stars);
      const numTeams = Math.ceil(players.length / playersPerTeam);
      const teams: { stars: number, players: any[] }[] = Array.from({ length: numTeams }, () => ({ stars: 0, players: [] }));

      sortedByStars.forEach((player: any) => {
        const availableTeams = teams.filter(t => t.players.length < playersPerTeam);
        if (availableTeams.length > 0) {
          availableTeams.sort((a, b) => a.stars - b.stars);
          const targetTeam = availableTeams[0];
          targetTeam.players.push(player);
          targetTeam.stars += player.stars;
        }
      });
      
      sortedGroups = teams.filter(t => t.players.length > 0).map(t => t.players);
    }

    await prisma.timePelada.deleteMany({ where: { peladaId } });
    
    for (let i = 0; i < sortedGroups.length; i++) {
        await prisma.timePelada.create({
            data: {
                name: `Time ${String.fromCharCode(65 + i)}`,
                peladaId,
                players: sortedGroups[i].map(p => p.id).join(',')
            }
        });
    }

    return this.getById(peladaId);
  }

  async getTeams(peladaId: string) {
    const teams = await prisma.timePelada.findMany({ where: { peladaId } });
    
    const allPlayerIds = teams.flatMap(t => t.players ? t.players.split(',') : []);
    const playersMap = new Map();
    if (allPlayerIds.length > 0) {
        const players = await prisma.player.findMany({ where: { id: { in: allPlayerIds } } });
        players.forEach(p => playersMap.set(p.id, p));
    }

    return teams.map(t => ({
      id: t.id,
      nome_time: t.name,
      cor: t.color,
      jogadores: (t.players ? t.players.split(',') : []).map(pid => {
        const p = playersMap.get(pid);
        return {
          id: pid,
          jogador: pid,
          jogador_nome: p?.name || 'Unknown',
          jogador_nivel: p?.stars || 0
        };
      })
    }));
  }

  async adjustTeams(peladaId: string, times: any[]) {
    await prisma.timePelada.deleteMany({ where: { peladaId } });
    
    for (const t of times) {
      await prisma.timePelada.create({
        data: {
          name: t.nome_time || t.name,
          peladaId,
          players: t.jogadores.map((p: any) => p.jogador || p.id).join(','),
          color: t.cor
        }
      });
    }
    return this.getById(peladaId);
  }

  async confirmTeams(peladaId: string) {
    return prisma.pelada.update({
      where: { id: peladaId },
      data: { status: 'em_andamento' }
    });
  }

  async updateMatchState(peladaId: string, data: any) {
    const updateData: any = {};
    if (data.placar_casa !== undefined) updateData.placarCasa = data.placar_casa;
    if (data.placar_visitante !== undefined) updateData.placarVisitante = data.placar_visitante;
    if (data.cronometro_segundos !== undefined) updateData.cronometroSegundos = data.cronometro_segundos;
    if (data.cronometro_ativo !== undefined) updateData.cronometroAtivo = data.cronometro_ativo;
    if (data.times_jogando !== undefined) updateData.timesJogando = (data.times_jogando || []).join(',');

    return prisma.pelada.update({
      where: { id: peladaId },
      data: updateData
    });
  }

  async rotateTeams(peladaId: string, timeId?: string) {
    const pelada = await prisma.pelada.findUnique({ where: { id: peladaId } });
    if (!pelada) return null;

    const times = await prisma.timePelada.findMany({ where: { peladaId } });
    if (times.length < 2) return this.getById(peladaId);

    const homeTeam = times[0];
    const awayTeam = times[1];
    const scoreCasa = pelada.placarCasa;
    const scoreVisitante = pelada.placarVisitante;

    const recordResult = async (playerId: string, result: 'win' | 'draw' | 'loss') => {
        await prisma.playerStats.upsert({
            where: { playerId },
            create: {
                playerId,
                wins: result === 'win' ? 1 : 0,
                draws: result === 'draw' ? 1 : 0,
                losses: result === 'loss' ? 1 : 0,
                matchesPlayed: 1
            },
            update: {
                wins: { increment: result === 'win' ? 1 : 0 },
                draws: { increment: result === 'draw' ? 1 : 0 },
                losses: { increment: result === 'loss' ? 1 : 0 },
                matchesPlayed: { increment: 1 }
            }
        });
        await updateEstatisticaJogadorPelada(playerId);
    };

    const homePlayers = homeTeam.players ? homeTeam.players.split(',') : [];
    const awayPlayers = awayTeam.players ? awayTeam.players.split(',') : [];

    if (scoreCasa > scoreVisitante) {
      for (const pid of homePlayers) await recordResult(pid, 'win');
      for (const pid of awayPlayers) await recordResult(pid, 'loss');
    } else if (scoreVisitante > scoreCasa) {
      for (const pid of homePlayers) await recordResult(pid, 'loss');
      for (const pid of awayPlayers) await recordResult(pid, 'win');
    } else {
      for (const pid of homePlayers) await recordResult(pid, 'draw');
      for (const pid of awayPlayers) await recordResult(pid, 'draw');
    }

    await prisma.pelada.update({
      where: { id: peladaId },
      data: { 
        placarCasa: 0, 
        placarVisitante: 0,
        cronometroSegundos: 0,
        cronometroAtivo: false
      }
    });

    return this.getById(peladaId);
  }

  async substitutePlayer(peladaId: string, saiId: string, entraId: string) {
    const times = await prisma.timePelada.findMany({ where: { peladaId } });
    const timeWithSai = times.find(t => t.players?.includes(saiId));

    if (!timeWithSai) throw new Error('Player to leave not found in any team');

    const updatedPlayers = timeWithSai.players.split(',').map(pid => pid === saiId ? entraId : pid).join(',');

    await prisma.timePelada.update({
        where: { id: timeWithSai.id },
        data: { players: updatedPlayers }
    });

    return this.getById(peladaId);
  }

  async finalizePelada(id: string) {
    const pelada = await prisma.pelada.findUnique({ where: { id } });
    if (!pelada) throw new Error('Pelada não encontrada');
    if (pelada.status === 'finalizada') return pelada;
    
    await prisma.pelada.update({
      where: { id },
      data: { status: 'finalizada' }
    });

    const times = await prisma.timePelada.findMany({ where: { peladaId: id } });
    if (times.length >= 2) {
      const homeTeam = times[0];
      const awayTeam = times[1];
      const scoreCasa = pelada.placarCasa || 0;
      const scoreVisitante = pelada.placarVisitante || 0;

      const homePlayers = homeTeam.players ? homeTeam.players.split(',') : [];
      const awayPlayers = awayTeam.players ? awayTeam.players.split(',') : [];

      const recordResult = async (pid: string, result: 'win' | 'draw' | 'loss') => {
          await prisma.playerStats.upsert({
              where: { playerId: pid },
              create: {
                  playerId: pid,
                  wins: result === 'win' ? 1 : 0,
                  draws: result === 'draw' ? 1 : 0,
                  losses: result === 'loss' ? 1 : 0,
                  matchesPlayed: 1
              },
              update: {
                  wins: { increment: result === 'win' ? 1 : 0 },
                  draws: { increment: result === 'draw' ? 1 : 0 },
                  losses: { increment: result === 'loss' ? 1 : 0 },
                  matchesPlayed: { increment: 1 }
              }
          });
          await updateEstatisticaJogadorPelada(pid);
      };

      if (scoreCasa > scoreVisitante) {
        for (const pid of homePlayers) await recordResult(pid, 'win');
        for (const pid of awayPlayers) await recordResult(pid, 'loss');
      } else if (scoreVisitante > scoreCasa) {
        for (const pid of homePlayers) await recordResult(pid, 'loss');
        for (const pid of awayPlayers) await recordResult(pid, 'win');
      } else {
        for (const pid of homePlayers) await recordResult(pid, 'draw');
        for (const pid of awayPlayers) await recordResult(pid, 'draw');
      }
    }

    const events = await prisma.event.findMany({ where: { peladaId: id } });
    const inscritos = await prisma.peladaJogador.findMany({ where: { peladaId: id } });

    // Process events separately to increment specific goals/assists/cols
    for (const pj of inscritos) {
      const goalsCount = events.filter(e => e.playerId === pj.playerId && e.type === 'gol').length;
      const assistCount = events.filter(e => e.assistPlayerId === pj.playerId).length;
      const yellowCount = events.filter(e => e.playerId === pj.playerId && e.type === 'cartao_amarelo').length;
      const redCount = events.filter(e => e.playerId === pj.playerId && e.type === 'cartao_vermelho').length;

      if (goalsCount > 0 || assistCount > 0 || yellowCount > 0 || redCount > 0) {
        await prisma.playerStats.upsert({
            where: { playerId: pj.playerId },
            create: {
                playerId: pj.playerId,
                goals: goalsCount,
                assists: assistCount,
                yellowCards: yellowCount,
                redCards: redCount,
                matchesPlayed: 0,
                wins: 0,
                draws: 0,
                losses: 0
            },
            update: {
                goals: { increment: goalsCount },
                assists: { increment: assistCount },
                yellowCards: { increment: yellowCount },
                redCards: { increment: redCount }
            }
        });
      }
      
      await updateEstatisticaJogadorPelada(pj.playerId);
    }

    return this.getById(id);
  }

  async delete(id: string) {
    await prisma.event.deleteMany({ where: { peladaId: id } });
    await prisma.peladaJogador.deleteMany({ where: { peladaId: id } });
    await prisma.timePelada.deleteMany({ where: { peladaId: id } });
    return prisma.pelada.delete({ where: { id } });
  }

  async togglePayment(peladaId: string, peladaJogadorId: string) {
    const pj = await prisma.peladaJogador.findUnique({ where: { id: peladaJogadorId } });
    if (!pj) throw new Error('Inscrição não encontrada');
    return prisma.peladaJogador.update({
      where: { id: peladaJogadorId },
      data: { paymentConfirmed: !pj.paymentConfirmed }
    });
  }

  async togglePresence(peladaId: string, peladaJogadorId: string) {
    const pj = await prisma.peladaJogador.findUnique({ where: { id: peladaJogadorId } });
    if (!pj) throw new Error('Inscrição não encontrada');
    return prisma.peladaJogador.update({
      where: { id: peladaJogadorId },
      data: { presenceConfirmed: !pj.presenceConfirmed }
    });
  }

  async getRateio(peladaId: string) {
    const pelada = await prisma.pelada.findUnique({ where: { id: peladaId } });
    if (!pelada) throw new Error('Pelada não encontrada');

    const numPagantes = await prisma.peladaJogador.count({
      where: { peladaId, presenceConfirmed: true }
    });
    const total = pelada.valorTotal || 0;
    const valorPorPessoa = numPagantes > 0 ? total / numPagantes : 0;

    return {
      total,
      num_pagantes: numPagantes,
      valor_por_pessoa: valorPorPessoa
    };
  }
}
