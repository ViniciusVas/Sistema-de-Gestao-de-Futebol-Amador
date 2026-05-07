import { prisma } from "../config/prisma.js";
import { sortearAleatorio, sortearBalanceado } from "../utils/sorteio.js";

export const sortearTimes = async (req, res) => {
  const { id } = req.params;
  const { tipo } = req.query;

  try {
    const peladaId = Number(id);

    // 🔥 buscar somente confirmados
    const peladaJogadores = await prisma.peladaJogador.findMany({
      where: {
        pelada_id: peladaId,
        presenca_confirmada: true
      },
      include: {
        jogador: true
      }
    });

    if (peladaJogadores.length === 0) {
      return res.status(400).json({
        error: "Nenhum jogador confirmado"
      });
    }

    // 🔥 buscar pelada
    const pelada = await prisma.pelada.findUnique({
      where: { id: peladaId }
    });

    if (!pelada) {
      return res.status(404).json({
        error: "Pelada não encontrada"
      });
    }

    // 🔥 quantidade máxima jogando
    const limiteJogando =
      pelada.jogadores_por_time * pelada.times_simultaneos;

    // 🔥 ordenar por chegada
    const jogadoresOrdenados = peladaJogadores
      .sort((a, b) => a.ordem_chegada - b.ordem_chegada)
      .map(pj => pj.jogador);

    // 🔥 primeiros confirmados entram nos times principais
    const jogadoresParaTimes = jogadoresOrdenados.slice(
      0,
      limiteJogando
    );

    // 🔥 restante fica na fila
    const jogadoresFila = jogadoresOrdenados.slice(
      limiteJogando
    );

    // 🔥 gerar times principais
    let resultado =
      tipo === "balanceado"
        ? sortearBalanceado(
            jogadoresParaTimes,
            pelada.times_simultaneos,
            pelada.jogadores_por_time
          )
        : sortearAleatorio(
            jogadoresParaTimes,
            pelada.times_simultaneos,
            pelada.jogadores_por_time
          );

    // 🔥 limpar times antigos
    await prisma.timeJogador.deleteMany({
      where: {
        time: {
          pelada_id: peladaId
        }
      }
    });

    await prisma.timePelada.deleteMany({
      where: {
        pelada_id: peladaId
      }
    });

    const timesCriados = [];

    // 🔥 criar times jogando
    for (let i = 0; i < resultado.length; i++) {
      const jogadoresTime =
        tipo === "balanceado"
          ? resultado[i].jogadores
          : resultado[i];

      const soma = jogadoresTime.reduce(
        (acc, jogador) =>
          acc + jogador.nivel_estrelas,
        0
      );

      const time = await prisma.timePelada.create({
        data: {
          nome_time: `Time ${i + 1}`,
          soma_estrelas: soma,
          pelada_id: peladaId,
          ordem: i + 1,
          em_jogo: true
        }
      });

      for (const jogador of jogadoresTime) {
        await prisma.timeJogador.create({
          data: {
            time_id: time.id,
            jogador_id: jogador.id
          }
        });
      }

      timesCriados.push(time);
    }

    // 🔥 criar fila/próximas
    let contador = resultado.length;

    const fila = [...jogadoresFila];

    while (fila.length > 0) {
      const grupo = fila.splice(
        0,
        pelada.jogadores_por_time
      );

      const soma = grupo.reduce(
        (acc, jogador) =>
          acc + jogador.nivel_estrelas,
        0
      );

      contador++;

      const time = await prisma.timePelada.create({
        data: {
          nome_time: `Time ${contador}`,
          soma_estrelas: soma,
          pelada_id: peladaId,
          ordem: contador,
          em_jogo: false
        }
      });

      for (const jogador of grupo) {
        await prisma.timeJogador.create({
          data: {
            time_id: time.id,
            jogador_id: jogador.id
          }
        });
      }

      timesCriados.push(time);
    }

    res.json({
      message: "Times sorteados com sucesso",
      times: timesCriados
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

export const listarTimes = async (req, res) => {
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

export const ajustarTimes = async (req, res) => {
  const {
    jogadorId,
    novoTimeId,
    peladaId
  } = req.body;

  try {
    const registro = await prisma.timeJogador.findFirst({
      where: {
        jogador_id: jogadorId,
        time: {
          pelada_id: peladaId
        }
      }
    });

    if (!registro) {
      return res.status(404).json({
        error: "Jogador não está em nenhum time"
      });
    }

    const timeAntigoId = registro.time_id;

    // 🔥 mover jogador
    await prisma.timeJogador.update({
      where: {
        id: registro.id
      },
      data: {
        time_id: novoTimeId
      }
    });

    // 🔥 recalcular soma
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

    await recalcularSoma(timeAntigoId);
    await recalcularSoma(novoTimeId);

    res.json({
      message: "Jogador movido com sucesso"
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

export const confirmarTimes = async (req, res) => {
  const { id } = req.params;

  try {
    const peladaId = Number(id);

    // 🔥 atualizar status
    const pelada = await prisma.pelada.update({
      where: {
        id: peladaId
      },
      data: {
        status: "em_andamento"
      }
    });

    // 🔥 buscar times ordenados
    const times = await prisma.timePelada.findMany({
      where: {
        pelada_id: peladaId
      },
      orderBy: {
        ordem: "asc"
      }
    });

    // 🔥 atualizar fila e quem está jogando
    for (let i = 0; i < times.length; i++) {
      await prisma.timePelada.update({
        where: {
          id: times[i].id
        },
        data: {
          ordem: i + 1,
          em_jogo:
            i < pelada.times_simultaneos
        }
      });
    }

    res.json({
      message: "Times confirmados corretamente"
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};