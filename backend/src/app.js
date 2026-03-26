import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/test', (req, res) => {
  res.json({ message: 'API funcionando 🚀' });
});

export default app;