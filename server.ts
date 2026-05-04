import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/config/status", (req, res) => {
    res.json({
      ticketmaster: !!process.env.TICKETMASTER_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY
    });
  });

  // Ticketmaster Proxy
  app.get("/api/ticketmaster", async (req, res) => {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "TICKETMASTER_API_KEY not configured" });
    }

    const { city, keyword, classificationName } = req.query;
    
    try {
      const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
      url.searchParams.append("apikey", apiKey);
      if (city) url.searchParams.append("city", city as string);
      if (keyword) url.searchParams.append("keyword", keyword as string);
      if (classificationName) url.searchParams.append("classificationName", classificationName as string);
      url.searchParams.append("size", "20");
      url.searchParams.append("sort", "date,asc");

      const response = await fetch(url.toString());
      const data = await response.json();
      
      // Transform Ticketmaster data to our EventActivity format
      const events = (data._embedded?.events || []).map((e: any) => ({
        id: `tm-${e.id}`,
        title: e.name,
        category: e.classifications?.[0]?.segment?.name || "Entertainment",
        description: e.info || e.pleaseNote || `Live event at ${e._embedded?.venues?.[0]?.name}`,
        date: e.dates?.start?.localDate ? new Date(e.dates.start.localDate).toLocaleDateString('en-US') : undefined,
        time: e.dates?.start?.localTime,
        venue: e._embedded?.venues?.[0]?.name,
        location: e._embedded?.venues?.[0]?.address?.line1,
        cityName: e._embedded?.venues?.[0]?.city?.name,
        sourceUrl: e.url,
        imageUrl: e.images?.find((img: any) => img.ratio === "16_9")?.url || e.images?.[0]?.url,
        price: e.priceRanges ? `${e.priceRanges[0].min} - ${e.priceRanges[0].max} ${e.priceRanges[0].currency}` : undefined,
        isLive: true,
        isVerified: true
      }));

      res.json({ events });
    } catch (error) {
      console.error("Ticketmaster API Error:", error);
      res.status(500).json({ error: "Failed to fetch from Ticketmaster" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
