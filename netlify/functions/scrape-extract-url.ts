import type { Handler } from "@netlify/functions";
import { extractEventFromUrl } from "../../services/webScraperService";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }) 
    };
  }

  let url = "";
  try {
    const body = JSON.parse(event.body || "{}");
    url = body.url;
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
      body: JSON.stringify({ error: "URL is required" }) 
    };
  }

  try {
    const extracted = await extractEventFromUrl(url.trim());
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, event: extracted })
    };
  } catch (err: any) {
    console.error("Netlify extract URL error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Failed to extract event from URL" })
    };
  }
};
