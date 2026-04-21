import express from 'express';
import { scrapeTrends } from './scraper.js';
import path from 'path';

const app = express();

app.get('/trends', async (req, res) => {
  const geo = req.query.geo || "IN";
  const hours = req.query.hours || "24";

  try {
    const data = await scrapeTrends(geo, hours);
    res.json({  
      success: true,  
      geo,  
      hours,  
      count: data.length,  
      data  
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mobile par error check karne ke liye live screenshot
app.get('/debug', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'debug.png'));
});

app.listen(7860, () => console.log("API running on port 7860"));
