import puppeteer from 'puppeteer';

(async () => {
  console.log("Starting synthetic frontend traffic generator...");
  console.log("Waiting for Vite dev server to be ready on port 5173...");
  
  // Wait a few seconds for the dev server to start
  await new Promise(r => setTimeout(r, 3000));
  
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox'] 
  });
  
  console.log("Browser launched. Simulating user traffic...");
  
  const page = await browser.newPage();
  
  let i = 0;
  while (true) {
    try {
      i++;
      console.log(`[Session ${i}] Navigating to http://localhost:5173...`);
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 10000 });
      
      // Simulate some user interaction and errors
      await page.evaluate(() => {
        // Trigger some console logs that Faro will capture
        console.info("User viewed the homepage.");
        
        // Randomly trigger an error to test the Error dashboard
        if (Math.random() > 0.4) {
          console.warn("API request took longer than expected.");
        }
        if (Math.random() > 0.6) {
          console.error("Synthetic error generated for Grafana Faro!");
          // Actually throw an uncaught exception so Faro records it as an Error
          setTimeout(() => {
            throw new Error("Synthetic Frontend Exception for Grafana Faro (Session " + Date.now() + ")");
          }, 500);
        }
      });
      
      // Wait for 2-4 seconds before the next "page load"
      const waitTime = 2000 + Math.random() * 2000;
      await new Promise(r => setTimeout(r, waitTime));
      
    } catch (e) {
      console.log("Error during navigation (dev server might be restarting):", e.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
})();
