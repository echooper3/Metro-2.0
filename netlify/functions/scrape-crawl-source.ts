import type { Handler } from "@netlify/functions";
import { crawlEventsFromPage } from "../../services/webScraperService";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }) 
    };
  }

  let url = "";
  let cityName = "";
  try {
    const body = JSON.parse(event.body || "{}");
    url = body.url;
    cityName = body.cityName || "";
  } catch {
    return { 
      statusCode: 400, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON payload" }) 
    };
  }

  if (!url) {
    return { 
      statusCode: 400, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Source URL is required" }) 
    };
  }

  try {
    const events = await crawlEventsFromPage(url.trim(), cityName);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, events, count: events.length })
    };
  } catch (err: any) {
    console.error("Netlify crawl source error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Failed to crawl calendar page" })
    };
  }
};
