import { Request, Response } from 'express';
import { EventService } from '../services/EventService';

const eventService = new EventService();

export class EventController {
  async create(req: Request, res: Response) {
    try {
      const peladaId = req.params.id || req.body.pelada;
      const result = await eventService.create({ ...req.body, peladaId: peladaId });
      res.status(201).json({
        ...result,
        id: result.id,
        jogador_id: result.playerId,
        tipo: result.type,
        minuto: result.minute || 0
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const peladaId = req.params.id || req.query.pelada;
      if (!peladaId) return res.status(400).json({ error: 'Pelada ID is required' });
      
      const results = await eventService.getByPelada(peladaId as string);
      res.json(results.map(r => ({
        id: r.id,
        tipo: r.type,
        jogador_id: r.playerId,
        jogador_assistencia: r.assistPlayerId || null,
        jogador_nome: "", 
        minuto: r.minute || 0,
        timestamp: r.createdAt
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
