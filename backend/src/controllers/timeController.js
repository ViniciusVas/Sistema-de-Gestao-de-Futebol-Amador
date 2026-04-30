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

    // remove quem saiu
    await prisma.timeJogador.deleteMany({
      where: {
        time_id: timeId,
        jogador_id: jogadorSaiId
      }
    });

    // adiciona quem entra
    await prisma.timeJogador.create({
      data: {
        time_id: timeId,
        jogador_id: jogadorEntraId
      }
    });

    res.json({ message: "Substituição feita" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const rodarTimes = async (req, res) => {
  try {
    const { id } = req.params;

    const times = await prisma.timePelada.findMany({
      where: { pelada_id: Number(id) },
      orderBy: { ordem: "asc" }
    });

    const primeiro = times[0];
    const ultimaOrdem = times[times.length - 1].ordem;

    await prisma.timePelada.update({
      where: { id: primeiro.id },
      data: { ordem: ultimaOrdem + 1 }
    });

    res.json({ message: "Times rodados com sucesso" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};