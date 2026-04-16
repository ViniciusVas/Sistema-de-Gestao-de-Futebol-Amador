import { prisma } from "../config/prisma.js";

export const criarPelada = async (req, res) => {
  try {
    const pelada = await prisma.pelada.create({
      data: {
        titulo: req.body.titulo,
        data_hora: new Date(req.body.data_hora),
        local: req.body.local,
        duracao_minutos: req.body.duracao_minutos,
        jogadores_por_time: req.body.jogadores_por_time,
        times_simultaneos: req.body.times_simultaneos,
        valor_por_jogador: req.body.valor_por_jogador,

        organizador: {
          connect: { id: req.user.id }
        }
      }
    });

    res.status(201).json(pelada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const listarPeladas = async (req, res) => {
  try {
    const peladas = await prisma.pelada.findMany({
      where: {
        organizador_id: req.user.id
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json(peladas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const detalharPelada = async (req, res) => {
  const { id } = req.params;

  try {
    const pelada = await prisma.pelada.findUnique({
      where: { id: Number(id) },
      include: {
        jogadores: {
          include: {
            jogador: true
          },
          orderBy: {
            ordem_chegada: "asc"
          }
        }
      }
    });

    res.json(pelada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const adicionarJogador = async (req, res) => {
  const { id } = req.params;
  const { jogadorId } = req.body;

  try {
    // evitar duplicado
    const existe = await prisma.peladaJogador.findUnique({
      where: {
        pelada_id_jogador_id: {
          pelada_id: Number(id),
          jogador_id: jogadorId
        }
      }
    });

    if (existe) {
      return res.status(400).json({ error: "Jogador já está na pelada" });
    }

    // pegar última ordem
    const ultimo = await prisma.peladaJogador.findFirst({
      where: { pelada_id: Number(id) },
      orderBy: { ordem_chegada: "desc" }
    });

    const novaOrdem = ultimo ? ultimo.ordem_chegada + 1 : 1;

    const relacao = await prisma.peladaJogador.create({
      data: {
        pelada_id: Number(id),
        jogador_id: jogadorId,
        ordem_chegada: novaOrdem
      }
    });

    res.status(201).json(relacao);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const removerJogador = async (req, res) => {
  const { id, jogadorId } = req.params;

  try {
    await prisma.peladaJogador.delete({
      where: {
        pelada_id_jogador_id: {
          pelada_id: Number(id),
          jogador_id: Number(jogadorId)
        }
      }
    });

    res.json({ message: "Removido" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const reordenar = async (req, res) => {
  const { ordem } = req.body;

  try {
    const updates = ordem.map((id, index) =>
      prisma.peladaJogador.update({
        where: { id },
        data: { ordem_chegada: index + 1 }
      })
    );

    await prisma.$transaction(updates);

    res.json({ message: "Reordenado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const confirmarPresenca = async (req, res) => {
  const { jogadores } = req.body;

  try {
    const updates = jogadores.map(j =>
      prisma.peladaJogador.update({
        where: { id: j.id },
        data: { presenca_confirmada: j.presenca_confirmada }
      })
    );

    await prisma.$transaction(updates);

    res.json({ message: "Presença atualizada" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};