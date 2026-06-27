import { Request, Response } from 'express';
import { PlayerService } from '../services/PlayerService';

const playerService = new PlayerService();

export class PlayerController {
  async list(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        console.error("[PlayerController] User not found in request");
        return res.status(401).json({ error: "Unauthorized: User not found in request" });
      }
      const userId = user.id;
      const result = await playerService.getAll(userId);
      res.json(result);
    } catch (error: any) {
      console.error("[PlayerController] Error in list:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async getOne(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await playerService.getById(id);
      if (!result) return res.status(404).json({ error: 'Player not found' });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const result = await playerService.create(req.body, userId);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await playerService.update(id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await playerService.delete(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getStats(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await playerService.getById(id);
      if (!result) return res.status(404).json({ error: 'Player not found' });
      res.json(result.estatisticas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
