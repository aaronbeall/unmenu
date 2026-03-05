import express from 'express';
import { fetchDishImages } from '../services/dishImageService';

const router = express.Router();

router.get('/dish/:dishName', async (req, res) => {
  try {
    const { dishName } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;

    console.log(`[Route /images/dish] Request for "${dishName}" (limit: ${limit})`);

    if (!dishName) {
      return res.status(400).json({ error: 'Dish name required' });
    }

    const images = await fetchDishImages(dishName, limit);
    res.json({ images });
  } catch (error) {
    console.error('Dish images error:', error);
    res.status(500).json({ error: 'Failed to fetch dish images' });
  }
});

export default router;
