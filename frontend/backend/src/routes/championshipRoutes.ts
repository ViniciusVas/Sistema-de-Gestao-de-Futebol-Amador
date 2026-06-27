import { Router } from 'express';
import { ChampionshipController } from '../controllers/ChampionshipController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const championshipController = new ChampionshipController();

router.get('/', authMiddleware, championshipController.list);
router.post('/', authMiddleware, championshipController.create);
router.get('/:id', championshipController.getOne);
router.delete('/:id', authMiddleware, championshipController.delete);
router.post('/:id/gerar_tabela', authMiddleware, championshipController.generateTable);
router.get('/:id/classificacao', championshipController.getStandings);
router.get('/:id/artilharia', championshipController.getScorers);
router.get('/:id/assistencias', championshipController.getAssists);
router.get('/:id/cartoes', championshipController.getCards);
router.post('/:id/times', authMiddleware, championshipController.addTeam);
router.delete('/times/:teamId', authMiddleware, championshipController.removeTeam);
router.post('/times/:teamId/jogadores', authMiddleware, championshipController.addPlayerToTeam);
router.delete('/jogadores/:jogadorTimeId', authMiddleware, championshipController.removePlayerFromTeam);
router.get('/jogos/:matchId', championshipController.getMatch);
router.put('/jogos/:matchId', authMiddleware, championshipController.updateMatch);
router.post('/jogos/:gameId/resultado', authMiddleware, championshipController.saveResult);
router.post('/eventos', authMiddleware, championshipController.createEvent);

export default router;
