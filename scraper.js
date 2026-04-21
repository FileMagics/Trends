import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Bot detection bypass karne ke liye
chromium.use(StealthPlugin());

export async function scrapeTrends(geo, hours) {
  let browser;
  try {
    browser = await chromium.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    const url = `https://trends.google.co.in/trending?geo=${geo}&hours=${hours}&status=active`;
    
    // domcontentloaded ki jagah networkidle use karein taki graphs load ho jayein
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // Google Consent/Cookie popup handle karna (agar aaye toh)
    try {
      const acceptButton = await page.getByRole('button', { name: /Accept all|I agree/i });
      if (await acceptButton.isVisible()) {
        await acceptButton.click();
        await page.waitForLoadState('networkidle');
      }
    } catch (e) { /* Ignore */ }

    // Page puri tarah render hone ka wait karein
    await page.waitForTimeout(4000); 

    // Error check karne ke liye screenshot save kar rahe hain (Isko browser mein /debug par dekhein)
    await page.screenshot({ path: 'debug.png', fullPage: true });

    // Data Extraction
    const data = await page.evaluate(() => {
      // Naye Google Trends mein list items use hote hain
      const rows = document.querySelectorAll('div[role="listitem"], .feed-item, tr'); 
      let results = [];

      rows.forEach(row => {
        // Text extract karna
        const textContent = row.innerText || "";
        const lines = textContent.split('\n').map(t => t.trim()).filter(t => t);
        
        if (lines.length < 2) return;

        const keyword = lines[0]; // Usually first line is keyword
        let searches = "N/A";
        let changeText = "";
        let direction = "neutral";

        // Extracting Search Volume (e.g. 20K+) and Changes (e.g. 300%)
        lines.forEach(line => {
          if (line.includes('K+') || line.includes('M+') || line.includes('K searches')) searches = line;
          if (line.includes('%')) {
            changeText = line;
            if (line.includes('+') || line.includes('↑') || line.includes('Increase')) direction = "up";
            if (line.includes('-') || line.includes('↓') || line.includes('Decrease')) direction = "down";
          }
        });

        // Graph heights extract karna (SVGs se)
        const graphDivs = row.querySelectorAll('svg rect, svg path');
        let graph = [];
        if (graphDivs.length > 0) {
           // Fallback for rects
           graph = Array.from(row.querySelectorAll('svg rect')).map(r => parseInt(r.getAttribute('height')) || 0);
        }

        results.push({
          keyword,
          searches,
          trend: graph.slice(0, 15), // Example: [20, 40, 60, 30]
          change: changeText || "N/A",
          direction
        });
      });

      return results;
    });

    await browser.close();
    return data;

  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}
