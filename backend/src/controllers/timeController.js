import { prisma } from "../config/prisma.js";

export const listarOrdemTimes = async (req, res) => {
  const { id } = req.params;

  const times = await prisma.timePelada.findMany({
    where: { pelada_id: Number(id) },
    include: {
      jogadores: {
        include: { jogador: true }
      }
    },
    orderBy: { ordem: "asc" }
  });

  res.json(times);
};

export const substituirJogador = async (req, res) => {
  try {
    const { jogadorSaiId, jogadorEntraId, timeId } = req.body;

    // 🔥 remover jogador que vai entrar de QUALQUER time (evita duplicação)
    await prisma.timeJogador.deleteMany({
      where: {
        jogador_id: jogadorEntraId
      }
    });

    // 🔥 remove quem saiu do time atual
    await prisma.timeJogador.deleteMany({
      where: {
        time_id: timeId,
        jogador_id: jogadorSaiId
      }
    });

    // 🔥 adiciona o novo jogador
    await prisma.timeJogador.create({
      data: {
        time_id: timeId,
        jogador_id: jogadorEntraId
      }
    });

    // 🔥 recalcular soma do time
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

    res.json({ message: "Substituição feita corretamente" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const rodarTimes = async (req, res) => {
  try {
    const { id } = req.params;

    const peladaId = Number(id);

    const times = await prisma.timePelada.findMany({
      where: { pelada_id: peladaId },
      orderBy: { ordem: "asc" }
    });

    if (times.length === 0) {
      return res.status(400).json({ error: "Nenhum time encontrado" });
    }

    const primeiro = times[0];

    // 🔥 shift geral (todos sobem na fila)
    for (let i = 1; i < times.length; i++) {
      await prisma.timePelada.update({
        where: { id: times[i].id },
        data: { ordem: i }
      });
    }

    // 🔥 primeiro vai para o final
    await prisma.timePelada.update({
      where: { id: primeiro.id },
      data: { ordem: times.length }
    });

    res.json({ message: "Fila de times atualizada corretamente" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};