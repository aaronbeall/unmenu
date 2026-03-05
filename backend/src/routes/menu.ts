import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/save', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { scan_id } = req.body;

    const scan = await prisma.scan.findFirst({
      where: { id: scan_id, user_id: userId, status: 'completed' },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found or not completed' });
    }

    // Check if already saved to prevent duplicates
    const existing = await prisma.savedMenu.findFirst({
      where: { user_id: userId, scan_id: scan_id },
    });

    if (existing) {
      return res.json({ id: existing.id, message: 'Menu already saved' });
    }

    const savedMenu = await prisma.savedMenu.create({
      data: {
        user_id: userId,
        scan_id: scan_id,
        menu_data: scan.processed_menu!,
      },
    });

    res.json({ id: savedMenu.id, message: 'Menu saved successfully' });
  } catch (error) {
    console.error('Save menu error:', error);
    res.status(500).json({ error: 'Failed to save menu' });
  }
});

router.get('/saved', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const savedMenus = await prisma.savedMenu.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    res.json({ menus: savedMenus });
  } catch (error) {
    console.error('Get saved menus error:', error);
    res.status(500).json({ error: 'Failed to get saved menus' });
  }
});

router.delete('/saved/:menuId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { menuId } = req.params;

    await prisma.savedMenu.deleteMany({
      where: { id: menuId, user_id: userId },
    });

    res.json({ message: 'Menu deleted successfully' });
  } catch (error) {
    console.error('Delete menu error:', error);
    res.status(500).json({ error: 'Failed to delete menu' });
  }
});

export default router;
