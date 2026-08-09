const { chromium } = require('C:/Users/Brad/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 3 });

  // Default sticker on the ticket corner
  await page.goto('http://localhost:5185/', { waitUntil: 'networkidle' });
  const mascot = await page.$('.ticket__mascot');
  await mascot.screenshot({ path: '.scratch/default-sticker.png' });

  // Custom sticker on the reveal page (chihuly-night has sticker: martini)
  await page.goto('http://localhost:5185/date/chihuly-night', { waitUntil: 'networkidle' });
  const revealMascot = await page.$('.reveal-card__mascot');
  await revealMascot.screenshot({ path: '.scratch/martini-sticker.png' });

  await browser.close();
})();
