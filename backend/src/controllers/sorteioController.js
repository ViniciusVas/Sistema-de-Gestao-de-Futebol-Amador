import { prisma } from "../config/prisma.js";
import { sortearAleatorio, sortearBalanceado } from "../utils/sorteio.js";

export const sortearTimes = async (req, res) => {
  const { id } = req.params;
  const { tipo } = req.query;

  try {
    // 1. Buscar jogadores confirmados
    const peladaJogadores = await prisma.peladaJogador.findMany({
      where: {
        pelada_id: Number(id),
        presenca_confirmada: true
      },
      include: {
        jogador: true
      }
    });

    const jogadores = peladaJogadores.map(pj => pj.jogador);

    if (jogadores.length === 0) {
      return res.status(400).json({ error: "Nenhum jogador confirmado" });
    }

    // 2. Buscar config da pelada
    const pelada = await prisma.pelada.findUnique({
      where: { id: Number(id) }
    });

    const numTimes = pelada.times_simultaneos;

    let resultado;

    // 3. Sortear
    if (tipo === "balanceado") {
      resultado = sortearBalanceado(jogadores, numTimes);
    } else {
      resultado = sortearAleatorio(jogadores, numTimes);
    }

    // 4. Limpar times antigos (se já existirem)
    await prisma.timeJogador.deleteMany({
      where: {
        time: { pelada_id: Number(id) }
      }
    });

    await prisma.timePelada.deleteMany({
      where: { pelada_id: Number(id) }
    });

    // 5. Salvar novos times
    const timesCriados = [];

    for (let i = 0; i < resultado.length; i++) {
      const timeData = resultado[i];

      const jogadoresTime = tipo === "balanceado" ? timeData.jogadores : timeData;

      const soma = jogadoresTime.reduce(
        (acc, j) => acc + j.nivel_estrelas,
        0
      );

      const time = await prisma.timePelada.create({
        data: {
          nome_time: `Time ${i + 1}`,
          soma_estrelas: soma,
          pelada_id: Number(id)
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

    return res.json({ message: "Times sorteados com sucesso", timesCriados });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const listarTimes = async (req, res) => {
  const { id } = req.params;

  const times = await prisma.timePelada.findMany({
    where: { pelada_id: Number(id) },
    include: {
      jogadores: {
        include: {
          jogador: true
        }
      }
    }
  });

  res.json(times);
};

export const ajustarTimes = async (req, res) => {
  const { jogadorId, novoTimeId } = req.body;

  try {
    // 🔎 Encontrar o vínculo atual
    const registro = await prisma.timeJogador.findFirst({
      where: { jogador_id: jogadorId },
      include: { time: true }
    });

    if (!registro) {
      return res.status(404).json({ error: "Jogador não está em nenhum time" });
    }

    const timeAntigoId = registro.time_id;

    // 🔄 Atualizar para novo time
    await prisma.timeJogador.update({
      where: { id: registro.id },
      data: { time_id: novoTimeId }
    });

    // 🔁 Recalcular soma dos dois times
    const recalcularSoma = async (timeId) => {
      const jogadores = await prisma.timeJogador.findMany({
        where: { time_id: timeId },
        include: { jogador: true }
      });

      const soma = jogadores.reduce(
        (acc, j) => acc + j.jogador.nivel_estrelas,
        0
      );

      await prisma.timePelada.update({
        where: { id: timeId },
        data: { soma_estrelas: soma }
      });
    };

    await recalcularSoma(timeAntigoId);
    await recalcularSoma(novoTimeId);

    res.json({ message: "Jogador movido com sucesso" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const confirmarTimes = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.pelada.update({
      where: { id: Number(id) },
      data: {
        status: "em_andamento"
      }
    });

    res.json({ message: "Times confirmados e jogo iniciado" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};