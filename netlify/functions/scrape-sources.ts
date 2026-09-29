import type { Handler } from "@netlify/functions";
import { DEFAULT_CRAWLER_SOURCES } from "../../services/webScraperService";

export const handler: Handler = async () => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sources: DEFAULT_CRAWLER_SOURCES })
  };
};
