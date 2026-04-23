export function sortearAleatorio(jogadores, numTimes) {
  const embaralhados = jogadores.sort(() => Math.random() - 0.5);

  const times = Array.from({ length: numTimes }, () => []);

  embaralhados.forEach((jogador, index) => {
    times[index % numTimes].push(jogador);
  });

  return times;
}

export function sortearBalanceado(jogadores, numTimes) {
  const ordenados = [...jogadores].sort((a, b) => b.nivel_estrelas - a.nivel_estrelas);

  const times = Array.from({ length: numTimes }, () => ({
    jogadores: [],
    soma: 0
  }));

  ordenados.forEach((jogador) => {
    const time = times.sort((a, b) => a.soma - b.soma)[0];

    time.jogadores.push(jogador);
    time.soma += jogador.nivel_estrelas;
  });

  return times;
}