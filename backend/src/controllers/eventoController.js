import { prisma } from "../config/prisma.js";
import { io } from "../server.js";

export const registrarEvento = async (req, res) => {

  try {

    const { id } = req.params;

    const {
      tipo,
      time_id,
      jogador_id,
      jogador_assistencia_id
    } = req.body;

    // validar tipo
    const tiposValidos = [
      "gol",
      "cartao_amarelo",
      "cartao_vermelho"
    ];

    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({
        erro: "Tipo de evento inválido"
      });
    }

    // validar assistência para si mesmo
    if (
      jogador_assistencia_id &&
      Number(jogador_assistencia_id) === Number(jogador_id)
    ) {
      return res.status(400).json({
        erro: "Jogador não pode dar assistência para si mesmo"
      });
    }

    // verificar pelada
    const pelada = await prisma.pelada.findUnique({
      where: {
        id: Number(id)
      }
    });

    if (!pelada) {
      return res.status(404).json({
        erro: "Pelada não encontrada"
      });
    }

    // verificar time
    const time = await prisma.timePelada.findUnique({
      where: {
        id: Number(time_id)
      }
    });

    if (!time) {
      return res.status(404).json({
        erro: "Time não encontrado"
      });
    }

    // verificar se time pertence à pelada
    if (time.pelada_id !== Number(id)) {
      return res.status(400).json({
        erro: "Time não pertence à pelada"
      });
    }

    // verificar jogador
    const jogador = await prisma.jogador.findUnique({
      where: {
        id: Number(jogador_id)
      }
    });

    if (!jogador) {
      return res.status(404).json({
        erro: "Jogador não encontrado"
      });
    }

    // verificar se jogador pertence ao time
    const jogadorNoTime = await prisma.timeJogador.findFirst({
      where: {
        time_id: Number(time_id),
        jogador_id: Number(jogador_id)
      }
    });

    if (!jogadorNoTime) {
      return res.status(400).json({
        erro: "Jogador não pertence ao time informado"
      });
    }

    // validar assistência
    if (jogador_assistencia_id) {

      const assistente = await prisma.jogador.findUnique({
        where: {
          id: Number(jogador_assistencia_id)
        }
      });

      if (!assistente) {
        return res.status(404).json({
          erro: "Jogador da assistência não encontrado"
        });
      }

      // verificar se assistente pertence ao mesmo time
      const assistenteNoTime = await prisma.timeJogador.findFirst({
        where: {
          time_id: Number(time_id),
          jogador_id: Number(jogador_assistencia_id)
        }
      });

      if (!assistenteNoTime) {
        return res.status(400).json({
          erro: "Assistência deve ser de um jogador do mesmo time"
        });
      }
    }

    // calcular minuto automaticamente
    const minutoAtual = Math.floor(
      (
        (pelada.duracao_minutos * 60) -
        (pelada.tempo_restante || 0)
      ) / 60
    );

    // criar evento
    const evento = await prisma.eventoJogo.create({
      data: {
        pelada_id: Number(id),
        tipo,
        time_id: Number(time_id),
        jogador_id: Number(jogador_id),

        jogador_assistencia_id:
          jogador_assistencia_id
            ? Number(jogador_assistencia_id)
            : null,

        minuto: minutoAtual
      },

      include: {
        jogador: true,
        jogadorAssistencia: true,
        time: true
      }
    });

    // atualizar placar se for gol
    if (tipo === "gol") {

      // incrementar gols do time
      await prisma.timePelada.update({
        where: {
          id: Number(time_id)
        },

        data: {
          gols: {
            increment: 1
          }
        }
      });

      // buscar times jogando
      const timesJogando = await prisma.timePelada.findMany({
        where: {
          pelada_id: Number(id),
          em_jogo: true
        },

        orderBy: {
          ordem: "asc"
        }
      });

      // atualizar placar da pelada
      if (timesJogando.length >= 2) {

        const time1Atualizado =
          timesJogando[0].id === Number(time_id)
            ? timesJogando[0].gols + 1
            : timesJogando[0].gols;

        const time2Atualizado =
          timesJogando[1].id === Number(time_id)
            ? timesJogando[1].gols + 1
            : timesJogando[1].gols;

        await prisma.pelada.update({
          where: {
            id: Number(id)
          },

          data: {
            placar_time1: time1Atualizado,
            placar_time2: time2Atualizado
          }
        });
      }
    }

    // emitir websocket
    io.to(`pelada-${id}`).emit(
      "evento:novo",
      evento
    );

    res.status(201).json(evento);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      erro: "Erro ao registrar evento"
    });
  }
};

export const listarEventos = async (req, res) => {

  try {

    const { id } = req.params;

    const eventos = await prisma.eventoJogo.findMany({
      where: {
        pelada_id: Number(id)
      },

      include: {
        jogador: true,
        jogadorAssistencia: true,
        time: true
      },

      orderBy: {
        created_at: "desc"
      }
    });

    res.json(eventos);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      erro: "Erro ao listar eventos"
    });
  }
};