import { Request, Response } from 'express';
import { ProvidersRepository } from '../storage/sqlite/repositories/providers.repo';
import { SettingsRepository } from '../storage/sqlite/repositories/settings.repo';

export class AdminController {
    private providersRepo = new ProvidersRepository();
    private settingsRepo = new SettingsRepository();

    getProviders = async (req: Request, res: Response) => {
        try {
            const providers = await this.providersRepo.getAll();
            res.json(providers);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    updateProvider = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { enabled, config } = req.body;
            await this.providersRepo.update(id, enabled, config);
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    getSettings = async (req: Request, res: Response) => {
        res.json({ message: "Settings list not implemented yet in repo" });
    };
}
