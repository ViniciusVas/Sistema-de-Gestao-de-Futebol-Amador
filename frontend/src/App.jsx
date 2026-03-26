/*import { useEffect } from 'react';
import { api } from './services/api';

function App() {
  useEffect(() => {
    api.get('/test')
      .then(res => {
        console.log(res.data);
      })
      .catch(err => {
        console.error('Erro:', err);
      });
  }, []);

  return <h1>Conectando com backend...</h1>;
}

export default App;
*/

import { useEffect } from 'react';
import { socket } from './socket';

function App() {
  useEffect(() => {
    socket.emit('mensagem', 'Teste');

    socket.on('mensagem', (msg) => {
      console.log('WebSocket:', msg);
    });
  }, []);

  return <h1>WebSocket funcionando 🚀</h1>;
}

export default App;