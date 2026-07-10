import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import XLSX from "xlsx";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({ storage: multer.memoryStorage() });

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
      gemini: !!process.env.GEMINI_API_KEY,
      eventbrite: !!process.env.EVENTBRITE_API_KEY && !!process.env.EVENTBRITE_ORGANIZATION_ID
    });
  });

  // Ticketmaster Proxy
  const formatTo12Hour = (timeStr?: string): string | undefined => {
    if (!timeStr) return undefined;
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      let hour = parseInt(parts[0], 10);
      const minute = parts[1];
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12;
      hour = hour ? hour : 12;
      return `${hour}:${minute} ${ampm}`;
    }
    return timeStr;
  };

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
      if (classificationName) {
        if (classificationName === 'Entertainment') {
          url.searchParams.append("classificationName", "Entertainment,Music");
        } else {
          url.searchParams.append("classificationName", classificationName as string);
        }
      }
      url.searchParams.append("size", "20");
      url.searchParams.append("sort", "date,asc");

      const response = await fetch(url.toString());
      const data = await response.json();
      
      // Transform Ticketmaster data to our EventActivity format
      const events = (data._embedded?.events || []).map((e: any) => {
        const tmCat = e.classifications?.[0]?.segment?.name || "Entertainment";
        const category = tmCat === "Music" ? "Entertainment" : tmCat;
        return {
          id: `tm-${e.id}`,
          title: e.name,
          category,
          description: e.info || e.pleaseNote || `Live event at ${e._embedded?.venues?.[0]?.name}`,
          date: e.dates?.start?.localDate ? new Date(e.dates.start.localDate).toLocaleDateString('en-US') : undefined,
          time: formatTo12Hour(e.dates?.start?.localTime),
        venue: e._embedded?.venues?.[0]?.name,
        location: e._embedded?.venues?.[0]?.address?.line1,
        cityName: e._embedded?.venues?.[0]?.city?.name,
        sourceUrl: e.url,
        imageUrl: e.images?.find((img: any) => img.ratio === "16_9")?.url || e.images?.[0]?.url,
        price: e.priceRanges ? `${e.priceRanges[0].min} - ${e.priceRanges[0].max} ${e.priceRanges[0].currency}` : undefined,
        isLive: true,
        isVerified: true
      };
      }));

      res.json({ events });
    } catch (error) {
      console.error("Ticketmaster API Error:", error);
      res.status(500).json({ error: "Failed to fetch from Ticketmaster" });
    }
  });

  // Eventbrite Proxy
  const normalizeCity = (name: string): string => {
    const n = name.toLowerCase().trim();
    if (n === 'okc' || n.includes('oklahoma')) return 'okc';
    if (n.includes('dallas')) return 'dallas';
    if (n.includes('houston')) return 'houston';
    if (n.includes('tulsa')) return 'tulsa';
    return n;
  };

  app.get("/api/eventbrite", async (req: any, res: any) => {
    const apiKey = process.env.EVENTBRITE_API_KEY;
    const orgId = process.env.EVENTBRITE_ORGANIZATION_ID;
    if (!apiKey || !orgId) {
      return res.status(500).json({ error: "EVENTBRITE_API_KEY or EVENTBRITE_ORGANIZATION_ID not configured" });
    }

    const { city, keyword, category } = req.query;

    try {
      const url = new URL(`https://www.eventbriteapi.com/v3/organizations/${orgId}/events/`);
      url.searchParams.append("expand", "venue");
      url.searchParams.append("status", "live");

      const response = await fetch(url.toString(), {
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Eventbrite API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const rawEvents = data.events || [];

      // Filter events by city, keyword, or category locally since search is deprecated
      const filtered = rawEvents.filter((e: any) => {
        const eventCity = e.venue?.address?.city || "";
        if (city && city !== "All" && normalizeCity(eventCity) !== normalizeCity(city as string)) {
          return false;
        }

        if (keyword) {
          const text = `${e.name?.text || ""} ${e.description?.text || ""}`.toLowerCase();
          if (!text.includes((keyword as string).toLowerCase())) {
            return false;
          }
        }

        if (category && category !== "All") {
          const text = `${e.name?.text || ""} ${e.description?.text || ""}`.toLowerCase();
          if (!text.includes((category as string).toLowerCase())) {
            return false;
          }
        }

        return true;
      });

      // Map Eventbrite events to EventActivity
      const events = filtered.map((e: any) => {
        const startDate = e.start?.local ? new Date(e.start.local) : null;
        const endDate = e.end?.local ? new Date(e.end.local) : null;

        return {
          id: `eb-${e.id}`,
          title: e.name?.text || "Eventbrite Event",
          category: (category as string) || "Entertainment",
          description: e.description?.text || "No description provided.",
          date: startDate ? startDate.toLocaleDateString("en-US") : undefined,
          time: startDate ? startDate.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' }) : undefined,
          endTime: endDate ? endDate.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' }) : undefined,
          venue: e.venue?.name || "Online / Venue TBD",
          location: e.venue?.address?.address_1 || "Online",
          cityName: e.venue?.address?.city || city || "Unknown",
          sourceUrl: e.url,
          imageUrl: e.logo?.url || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800",
          price: e.is_free ? "Free" : "Paid",
          isLive: true,
          isVerified: true,
        };
      });

      res.json({ events });
    } catch (error: any) {
      console.error("Eventbrite API Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch from Eventbrite" });
    }
  });

app.post("/api/read-sheet", upload.single("file"), async (req: any, res: any) => {
  try {
    // 1. Get uploaded file
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    // 2. Read workbook from buffer
    const workbook = XLSX.read(file.buffer, {
      type: "buffer",
    });

    // 3. Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 4. Convert sheet to JSON
const jsonData = (XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false }) as any[]).filter((row: any) =>
  Object.values(row).some((val) => val !== "" && val !== null && val !== undefined)
);
    return res.json({
      message: "Success",
      data: jsonData,
    });

  } catch (error: any) {
    console.error("Read Error:", error);

    return res.status(500).json({
      error: error?.message || 'Upload Failed',
    });
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
