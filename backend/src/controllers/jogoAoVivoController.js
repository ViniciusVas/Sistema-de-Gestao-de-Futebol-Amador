import { prisma } from "../config/prisma.js";
import { io } from "../server.js";

const intervalosCronometro = {};

export const iniciarCronometro = async (req, res) => {
  try {
    const { id } = req.params;

    const pelada = await prisma.pelada.findUnique({
      where: {
        id: Number(id)
      }
    });

    if (!pelada) {
      return res.status(404).json({
        error: "Pelada não encontrada"
      });
    }

    let tempoRestante =
      pelada.tempo_restante ??
      pelada.duracao_minutos * 60;

    await prisma.pelada.update({
      where: {
        id: Number(id)
      },
      data: {
        cronometro_ativo: true,
        tempo_restante: tempoRestante
      }
    });

    // evita múltiplos intervalos para a mesma pelada
    if (intervalosCronometro[id]) {
      clearInterval(intervalosCronometro[id]);
    }

    intervalosCronometro[id] = setInterval(async () => {

      tempoRestante--;

      await prisma.pelada.update({
        where: {
          id: Number(id)
        },
        data: {
          tempo_restante: tempoRestante
        }
      });

      io.emit("cronometro:atualizar", {
        peladaId: Number(id),
        tempo_restante: tempoRestante
      });

      // quando acabar o tempo
      if (tempoRestante <= 0) {

        clearInterval(intervalosCronometro[id]);

        delete intervalosCronometro[id];

        await prisma.pelada.update({
          where: {
            id: Number(id)
          },
          data: {
            cronometro_ativo: false
          }
        });

        io.emit("cronometro:finalizado", {
          peladaId: Number(id)
        });
      }

    }, 1000);

    io.emit("cronometro:iniciar", {
      peladaId: Number(id),
      tempo_restante: tempoRestante
    });

    res.json({
      message: "Cronômetro iniciado"
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

export const pausarCronometro = async (req, res) => {
  try {
    const { id } = req.params;

    // pausa o intervalo
    clearInterval(intervalosCronometro[id]);

    delete intervalosCronometro[id];

    await prisma.pelada.update({
      where: {
        id: Number(id)
      },
      data: {
        cronometro_ativo: false
      }
    });

    io.emit("cronometro:pausar", {
      peladaId: Number(id)
    });

    res.json({
      message: "Cronômetro pausado"
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

export const reiniciarCronometro = async (req, res) => {
  try {
    const { id } = req.params;

    // remove intervalo ativo
    clearInterval(intervalosCronometro[id]);

    delete intervalosCronometro[id];

    const pelada = await prisma.pelada.findUnique({
      where: {
        id: Number(id)
      }
    });

    if (!pelada) {
      return res.status(404).json({
        error: "Pelada não encontrada"
      });
    }

    const tempoInicial =
      pelada.duracao_minutos * 60;

    await prisma.pelada.update({
      where: {
        id: Number(id)
      },
      data: {
        cronometro_ativo: false,
        tempo_restante: tempoInicial
      }
    });

    io.emit("cronometro:reiniciar", {
      peladaId: Number(id),
      tempo_restante: tempoInicial
    });

    res.json({
      message: "Cronômetro reiniciado"
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

export const atualizarPlacar = async (req, res) => {
  try {
    const { id } = req.params;
    const { time, gols } = req.body;

    const campo =
      time === 1
        ? "placar_time1"
        : "placar_time2";

    const pelada = await prisma.pelada.update({
      where: {
        id: Number(id)
      },
      data: {
        [campo]: gols
      }
    });

    io.emit("placar:atualizar", {
      peladaId: pelada.id,
      placar_time1: pelada.placar_time1,
      placar_time2: pelada.placar_time2
    });

    res.json(pelada);

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};