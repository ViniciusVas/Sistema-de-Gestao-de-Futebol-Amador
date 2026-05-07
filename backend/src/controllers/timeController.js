import { prisma } from "../config/prisma.js";

export const listarOrdemTimes = async (req, res) => {
  const { id } = req.params;

  try {
    const times = await prisma.timePelada.findMany({
      where: {
        pelada_id: Number(id)
      },
      include: {
        jogadores: {
          include: {
            jogador: true
          }
        }
      },
      orderBy: {
        ordem: "asc"
      }
    });

    res.json(times);

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

export const substituirJogador = async (req, res) => {
  try {
    const {
      jogadorSaiId,
      jogadorEntraId,
      timeId
    } = req.body;

    // 🔥 remove jogador que vai entrar
    // de qualquer outro time
    await prisma.timeJogador.deleteMany({
      where: {
        jogador_id: jogadorEntraId
      }
    });

    // 🔥 remove jogador que saiu
    await prisma.timeJogador.deleteMany({
      where: {
        time_id: timeId,
        jogador_id: jogadorSaiId
      }
    });

    // 🔥 adiciona novo jogador
    await prisma.timeJogador.create({
      data: {
        time_id: timeId,
        jogador_id: jogadorEntraId
      }
    });

    // 🔥 recalcular soma
    const jogadores = await prisma.timeJogador.findMany({
      where: {
        time_id: timeId
      },
      include: {
        jogador: true
      }
    });

    const soma = jogadores.reduce(
      (acc, j) =>
        acc + j.jogador.nivel_estrelas,
      0
    );

    await prisma.timePelada.update({
      where: {
        id: timeId
      },
      data: {
        soma_estrelas: soma
      }
    });

    res.json({
      message: "Substituição feita corretamente"
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

export const rodarTimes = async (req, res) => {
  try {
    const { id } = req.params;
    const { timePerdedorId } = req.body;

    const peladaId = Number(id);

    // 🔥 buscar pelada
    const pelada = await prisma.pelada.findUnique({
      where: {
        id: peladaId
      }
    });

    if (!pelada) {
      return res.status(404).json({
        error: "Pelada não encontrada"
      });
    }

    // 🔥 buscar time perdedor
    const timePerdedor = await prisma.timePelada.findUnique({
      where: {
        id: timePerdedorId
      },
      include: {
        jogadores: {
          include: {
            jogador: true
          }
        }
      }
    });

    if (!timePerdedor) {
      return res.status(404).json({
        error: "Time perdedor não encontrado"
      });
    }

    // 🔥 buscar próximo time da fila
    const proximoTime = await prisma.timePelada.findFirst({
      where: {
        pelada_id: peladaId,
        em_jogo: false
      },
      include: {
        jogadores: {
          include: {
            jogador: true
          }
        }
      },
      orderBy: {
        ordem: "asc"
      }
    });

    // 🔥 se não existir fila
    if (!proximoTime) {
      return res.json({
        message: "Não há times na fila"
      });
    }

    // 🔥 quantidade atual do próximo time
    const quantidadeAtual =
      proximoTime.jogadores.length;

    // 🔥 quantos faltam
    const faltam =
      pelada.jogadores_por_time -
      quantidadeAtual;

    // 🔥 pegar jogadores do perdedor
    const jogadoresComplemento =
      timePerdedor.jogadores
        .slice(0, faltam);

    // 🔥 mover jogadores para próximo time
    for (const jogador of jogadoresComplemento) {
      await prisma.timeJogador.update({
        where: {
          id: jogador.id
        },
        data: {
          time_id: proximoTime.id
        }
      });
    }

    // 🔥 atualizar status dos times
    await prisma.timePelada.update({
      where: {
        id: timePerdedor.id
      },
      data: {
        em_jogo: false
      }
    });

    await prisma.timePelada.update({
      where: {
        id: proximoTime.id
      },
      data: {
        em_jogo: true
      }
    });

    // 🔥 reorganizar fila
    const times = await prisma.timePelada.findMany({
      where: {
        pelada_id: peladaId
      },
      orderBy: {
        ordem: "asc"
      }
    });

    let ordem = 1;

    // 🔥 manter times jogando primeiro
    const jogando = times.filter(
      t => t.em_jogo && t.id !== timePerdedor.id
    );

    const fila = times.filter(
      t => !t.em_jogo && t.id !== proximoTime.id
    );

    // 🔥 time que entrou vai para jogando
    const novaOrdem = [
      ...jogando,
      proximoTime,
      ...fila,
      timePerdedor
    ];

    for (const time of novaOrdem) {
      await prisma.timePelada.update({
        where: {
          id: time.id
        },
        data: {
          ordem: ordem++
        }
      });
    }

    // 🔥 recalcular soma dos times
    const recalcularSoma = async (timeId) => {
      const jogadores = await prisma.timeJogador.findMany({
        where: {
          time_id: timeId
        },
        include: {
          jogador: true
        }
      });

      const soma = jogadores.reduce(
        (acc, j) =>
          acc + j.jogador.nivel_estrelas,
        0
      );

      await prisma.timePelada.update({
        where: {
          id: timeId
        },
        data: {
          soma_estrelas: soma
        }
      });
    };

    await recalcularSoma(timePerdedor.id);
    await recalcularSoma(proximoTime.id);

    res.json({
      message: "Rotação realizada corretamente"
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};