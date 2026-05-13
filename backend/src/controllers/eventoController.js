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

    // verifica pelada
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

    // calcula minuto baseado no cronômetro
    const minutoAtual = Math.floor(
      (
        (pelada.duracao_minutos * 60) -
        (pelada.tempo_restante || 0)
      ) / 60
    );

    // cria evento
    const evento = await prisma.eventoJogo.create({
      data: {
        pelada_id: Number(id),
        tipo,
        time_id,
        jogador_id,
        jogador_assistencia_id:
          jogador_assistencia_id || null,
        minuto: minutoAtual
      },

      include: {
        jogador: true,
        jogadorAssistencia: true,
        time: true
      }
    });

    // atualiza placar
    if (tipo === "gol") {

      await prisma.timePelada.update({
        where: {
          id: time_id
        },

        data: {
          gols: {
            increment: 1
          }
        }
      });

      // atualizar placar da pelada
      const timesJogando = await prisma.timePelada.findMany({
        where: {
          pelada_id: Number(id),
          em_jogo: true
        },

        orderBy: {
          ordem: "asc"
        }
      });

      if (timesJogando.length >= 2) {

        await prisma.pelada.update({
          where: {
            id: Number(id)
          },

          data: {
            placar_time1: timesJogando[0].gols,
            placar_time2: timesJogando[1].gols
          }
        });
      }
    }

    // websocket
    io.to(`pelada-${id}`).emit(
      "evento:novo",
      evento
    );

    res.json(evento);

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