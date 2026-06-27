import prisma from '../lib/prisma';

export class ChampionshipService {
  async getAll(userId: string) {
    return prisma.championship.findMany({ 
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { times: true, jogos: true }
        }
      }
    });
  }

  async getById(id: string) {
    return prisma.championship.findUnique({ 
      where: { id },
      include: {
        times: {
          include: {
            jogadores: {
              include: { player: true }
            }
          }
        },
        jogos: {
          include: {
            homeTeam: true,
            awayTeam: true,
            eventos: {
              include: { player: true }
            }
          },
          orderBy: [{ round: 'asc' }, { date: 'asc' }]
        }
      }
    });
  }

  async create(data: any, userId: string) {
    return prisma.championship.create({
      data: {
        name: data.name || data.titulo,
        description: data.description || data.descricao,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        format: data.format || "pontos_corridos",
        isHomeAndAway: data.isHomeAndAway || false,
        status: "rascunho",
        userId
      }
    });
  }

  async update(id: string, data: any) {
    return prisma.championship.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        format: data.format,
        isHomeAndAway: data.isHomeAndAway,
        status: data.status
      }
    });
  }

  async delete(id: string) {
    await prisma.jogoCampeonato.deleteMany({ where: { championshipId: id } });
    const times = await prisma.timeCampeonato.findMany({ where: { championshipId: id } });
    for (const t of times) {
      await prisma.jogadorTime.deleteMany({ where: { timeId: t.id } });
    }
    await prisma.timeCampeonato.deleteMany({ where: { championshipId: id } });
    return prisma.championship.delete({ where: { id } });
  }

  async addTeam(championshipId: string, data: any) {
    return prisma.timeCampeonato.create({
      data: {
        name: data.name,
        color: data.color,
        logoUrl: data.logoUrl,
        championshipId
      }
    });
  }

  async removeTeam(teamId: string) {
    await prisma.jogadorTime.deleteMany({ where: { timeId: teamId } });
    return prisma.timeCampeonato.delete({ where: { id: teamId } });
  }

  async addPlayerToTeam(teamId: string, playerId: string) {
    const existing = await prisma.jogadorTime.findFirst({
      where: { timeId: teamId, playerId }
    });
    if (existing) return existing;

    return prisma.jogadorTime.create({
      data: { timeId: teamId, playerId }
    });
  }

  async removePlayerFromTeam(jogadorTimeId: string) {
    return prisma.jogadorTime.delete({ where: { id: jogadorTimeId } });
  }

  async generateTable(id: string) {
    const championship = await prisma.championship.findUnique({
      where: { id },
      include: { times: true }
    });

    if (!championship) throw new Error('Championship not found');
    if (championship.times.length < 2) throw new Error('At least 2 teams required to generate table');

    await prisma.jogoCampeonato.deleteMany({ where: { championshipId: id } });

    const teams = [...championship.times];
    if (teams.length % 2 !== 0) {
      teams.push({ id: 'BYE' } as any);
    }

    const baseTime = championship.startDate ? new Date(championship.startDate).getTime() : Date.now();

    if (championship.format === 'grupos_mata') {
      // Split teams into groups (e.g., 2 groups)
      const numGroups = 2;
      const groups: any[][] = [[], []];
      teams.forEach((t, i) => groups[i % numGroups].push(t));

      let matchCounter = 0;

      for (let gIdx = 0; gIdx < numGroups; gIdx++) {
        const groupTeams = groups[gIdx];
        if (groupTeams.length % 2 !== 0) groupTeams.push({ id: 'BYE' } as any);
        
        const n = groupTeams.length;
        const rounds = n - 1;
        const matches = n / 2;

        for (let r = 0; r < rounds; r++) {
          for (let m = 0; m < matches; m++) {
            const home = groupTeams[m];
            const away = groupTeams[n - 1 - m];

            if (home.id !== 'BYE' && away.id !== 'BYE') {
              // Schedule matches of each round to prevent conflicts (weekly and daily hourly spacing)
              const gameTime = new Date(baseTime + (r * 7 * 24 * 60 * 60 * 1000) + (matchCounter * 2 * 60 * 60 * 1000));
              matchCounter++;

              await prisma.jogoCampeonato.create({
                data: {
                  championshipId: id,
                  homeTeamId: home.id,
                  awayTeamId: away.id,
                  round: r + 1,
                  status: 'agendado',
                  date: gameTime
                }
              });
            }
          }
          groupTeams.splice(1, 0, groupTeams.pop()!);
        }
      }
    } else {
      // Original Round Robin logic with automatic non-conflicting date assignment
      const numTeams = teams.length;
      const numRounds = numTeams - 1;
      const matchesPerRound = numTeams / 2;

      const roundRobinGames: { home: any, away: any, round: number }[] = [];

      for (let round = 0; round < numRounds; round++) {
        for (let match = 0; match < matchesPerRound; match++) {
          const home = teams[match];
          const away = teams[numTeams - 1 - match];

          if (home.id !== 'BYE' && away.id !== 'BYE') {
            if (round % 2 === 0) {
              roundRobinGames.push({ home, away, round: round + 1 });
            } else {
              roundRobinGames.push({ home: away, away: home, round: round + 1 });
            }
          }
        }
        teams.splice(1, 0, teams.pop()!);
      }

      if (championship.isHomeAndAway) {
        const returnGames: any[] = [];
        roundRobinGames.forEach(g => {
          returnGames.push({
            home: g.away,
            away: g.home,
            round: g.round + numRounds
          });
        });
        roundRobinGames.push(...returnGames);
      }

      const roundCountMap: { [round: number]: number } = {};

      for (const g of roundRobinGames) {
        if (!roundCountMap[g.round]) {
          roundCountMap[g.round] = 0;
        }
        const matchIndexInRound = roundCountMap[g.round];
        roundCountMap[g.round]++;

        // Round r scheduled on week `r-1`. Inside the round, each game is scheduled 2 hours apart.
        const gameTime = new Date(baseTime + ((g.round - 1) * 7 * 24 * 60 * 60 * 1000) + (matchIndexInRound * 2 * 60 * 60 * 1000));

        await prisma.jogoCampeonato.create({
          data: {
            championshipId: id,
            homeTeamId: g.home.id,
            awayTeamId: g.away.id,
            round: g.round,
            status: 'agendado',
            date: gameTime
          }
        });
      }
    }

    return this.getById(id);
  }

  async updateMatch(id: string, data: any) {
    if (data.events && Array.isArray(data.events)) {
      await prisma.eventoCampeonato.deleteMany({ where: { jogoId: id } });
      for (const e of data.events) {
        await prisma.eventoCampeonato.create({
          data: {
            jogoId: id,
            type: e.type,
            playerId: e.playerId,
            teamId: e.teamId,
            minute: e.minute || 0
          }
        });
      }
    }

    // Verify time conflict: a team cannot have two matches scheduled at the exact same Date
    if (data.date) {
      const matchDate = new Date(data.date);
      const match = await prisma.jogoCampeonato.findUnique({
        where: { id },
        include: { homeTeam: true, awayTeam: true }
      });
      
      if (match) {
        const conflict = await prisma.jogoCampeonato.findFirst({
          where: {
            championshipId: match.championshipId,
            id: { not: id },
            date: matchDate,
            OR: [
              { homeTeamId: match.homeTeamId },
              { awayTeamId: match.homeTeamId },
              { homeTeamId: match.awayTeamId },
              { awayTeamId: match.awayTeamId }
            ]
          },
          include: {
            homeTeam: true,
            awayTeam: true
          }
        });
        
        if (conflict) {
          const conflictingTeam = conflict.homeTeamId === match.homeTeamId || conflict.homeTeamId === match.awayTeamId 
            ? conflict.homeTeam.name 
            : conflict.awayTeam.name;
          throw new Error(`Conflito: O time "${conflictingTeam}" já possui uma partida agendada para este horário!`);
        }
      }
    }

    return prisma.jogoCampeonato.update({
      where: { id },
      data: {
        date: data.date ? new Date(data.date) : undefined,
        location: data.location,
        homeScore: data.homeScore !== undefined ? Number(data.homeScore) : undefined,
        awayScore: data.awayScore !== undefined ? Number(data.awayScore) : undefined,
        status: data.status
      }
    });
  }

  async getStandings(id: string) {
    const championship = await prisma.championship.findUnique({
      where: { id },
      include: { 
        times: true,
        jogos: { where: { status: 'finalizado' } }
      }
    });

    if (!championship) return [];

    const standings = championship.times.map(team => ({
      id: team.id,
      nome: team.name,
      cor: team.color,
      pts: 0,
      pj: 0,
      v: 0,
      e: 0,
      d: 0,
      gp: 0,
      gc: 0,
      sg: 0
    }));

    championship.jogos.forEach(game => {
      const home = standings.find(s => s.id === game.homeTeamId);
      const away = standings.find(s => s.id === game.awayTeamId);

      if (home && away) {
        home.pj++;
        away.pj++;
        home.gp += game.homeScore;
        home.gc += game.awayScore;
        away.gp += game.awayScore;
        away.gc += game.homeScore;

        if (game.homeScore > game.awayScore) {
          home.pts += 3;
          home.v++;
          away.d++;
        } else if (game.homeScore < game.awayScore) {
          away.pts += 3;
          away.v++;
          home.d++;
        } else {
          home.pts += 1;
          away.pts += 1;
          home.e++;
          away.e++;
        }
      }
    });

    standings.forEach(s => {
      s.sg = s.gp - s.gc;
    });

    return standings.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.v !== a.v) return b.v - a.v;
      if (b.sg !== a.sg) return b.sg - a.sg;
      return b.gp - a.gp;
    });
  }

  async getScorers(id: string) {
    const events = await prisma.eventoCampeonato.findMany({
      where: {
        jogo: { championshipId: id },
        type: 'gol'
      },
      include: {
        player: true,
        team: true
      }
    });

    const scorers: any = {};
    events.forEach(e => {
      if (!scorers[e.playerId]) {
        scorers[e.playerId] = {
          id: e.playerId,
          nome: e.player.name,
          time: e.team.name,
          gols: 0
        };
      }
      scorers[e.playerId].gols++;
    });

    return Object.values(scorers).sort((a: any, b: any) => b.gols - a.gols);
  }

  async getCards(id: string) {
    const events = await prisma.eventoCampeonato.findMany({
      where: {
        jogo: { championshipId: id },
        type: { in: ['cartao_amarelo', 'cartao_vermelho'] }
      },
      include: {
        player: true,
        team: true,
        jogo: true
      }
    });

    const cardStats: any = {};
    events.forEach(e => {
      if (!cardStats[e.playerId]) {
        cardStats[e.playerId] = {
          id: e.playerId,
          nome: e.player.name,
          time: e.team.name,
          amarelos: 0,
          vermelhos: 0,
          suspenso: false
        };
      }
      if (e.type === 'cartao_amarelo') cardStats[e.playerId].amarelos++;
      if (e.type === 'cartao_vermelho') cardStats[e.playerId].vermelhos++;
    });

    // Suspension logic: 
    // In a real scenario, we'd check if the LAST game of the player had events that lead to suspension
    // For this sprint, we'll mark as suspended if they have 3 yellows (standard) or 1 red in the tournament
    // Actually the requirement says: "2 amarelos ou 1 vermelho = próximo jogo suspenso"
    Object.values(cardStats).forEach((stats: any) => {
      if (stats.amarelos >= 2 || stats.vermelhos >= 1) {
        stats.suspenso = true;
      }
    });

    return Object.values(cardStats);
  }

  async getAssists(id: string) {
    const events = await prisma.eventoCampeonato.findMany({
      where: {
        jogo: { championshipId: id },
        type: 'assistencia'
      },
      include: {
        player: true,
        team: true
      }
    });

    const assistants: any = {};
    events.forEach(e => {
      if (!assistants[e.playerId]) {
        assistants[e.playerId] = {
          id: e.playerId,
          nome: e.player.name,
          time: e.team.name,
          assistencias: 0
        };
      }
      assistants[e.playerId].assistencias++;
    });

    return Object.values(assistants).sort((a: any, b: any) => b.assistencias - a.assistencias);
  }

  async getMatch(matchId: string) {
    return prisma.jogoCampeonato.findUnique({
      where: { id: matchId },
      include: {
        championship: true,
        homeTeam: {
          include: {
            jogadores: {
              include: { player: true }
            }
          }
        },
        awayTeam: {
          include: {
            jogadores: {
              include: { player: true }
            }
          }
        },
        eventos: {
          include: {
            player: true,
            team: true
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  async createEvent(data: any) {
    const { jogoId, playerId, teamId, type, minute } = data;
    // Auto-update match score if event is a gol
    if (type === 'gol') {
      const match = await prisma.jogoCampeonato.findUnique({
        where: { id: jogoId }
      });
      if (match) {
        if (match.homeTeamId === teamId) {
          await prisma.jogoCampeonato.update({
            where: { id: jogoId },
            data: { homeScore: match.homeScore + 1 }
          });
        } else if (match.awayTeamId === teamId) {
          await prisma.jogoCampeonato.update({
            where: { id: jogoId },
            data: { awayScore: match.awayScore + 1 }
          });
        }
      }
    }

    return prisma.eventoCampeonato.create({
      data: {
        jogoId,
        playerId,
        teamId,
        type,
        minute: minute !== undefined ? Number(minute) : 0
      },
      include: {
        player: true,
        team: true
      }
    });
  }

  async saveResult(gameId: string, data: any) {
    return prisma.jogoCampeonato.update({
      where: { id: gameId },
      data: {
        homeScore: data.homeScore !== undefined ? Number(data.homeScore) : undefined,
        awayScore: data.awayScore !== undefined ? Number(data.awayScore) : undefined,
        status: data.status || 'finalizado'
      }
    });
  }
}
