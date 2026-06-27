import { Request, Response } from 'express';
import { ChampionshipService } from '../services/ChampionshipService';

const championshipService = new ChampionshipService();

export class ChampionshipController {
  async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const result = await championshipService.getAll(userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getOne(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await championshipService.getById(id);
      if (!result) return res.status(404).json({ error: 'Championship not found' });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const result = await championshipService.create(req.body, userId);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async generateTable(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await championshipService.generateTable(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getStandings(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await championshipService.getStandings(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getScorers(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await championshipService.getScorers(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAssists(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await championshipService.getAssists(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getCards(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await championshipService.getCards(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async addTeam(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await championshipService.addTeam(id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async removeTeam(req: Request, res: Response) {
    try {
      const { teamId } = req.params;
      const result = await championshipService.removeTeam(teamId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async addPlayerToTeam(req: Request, res: Response) {
    try {
      const { teamId } = req.params;
      const { playerId } = req.body;
      const result = await championshipService.addPlayerToTeam(teamId, playerId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async removePlayerFromTeam(req: Request, res: Response) {
    try {
      const { jogadorTimeId } = req.params;
      const result = await championshipService.removePlayerFromTeam(jogadorTimeId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateMatch(req: Request, res: Response) {
    try {
      const { matchId } = req.params;
      const result = await championshipService.updateMatch(matchId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getMatch(req: Request, res: Response) {
    try {
      const { matchId } = req.params;
      const result = await championshipService.getMatch(matchId);
      if (!result) return res.status(404).json({ error: 'Match not found' });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createEvent(req: Request, res: Response) {
    try {
      const result = await championshipService.createEvent(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async saveResult(req: Request, res: Response) {
    try {
      const { gameId } = req.params;
      const result = await championshipService.saveResult(gameId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await championshipService.delete(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
