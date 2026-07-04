import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "TICKETMASTER_API_KEY not configured" }) };
  }

  const { city, keyword, classificationName } = event.queryStringParameters || {};

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

  try {
    const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
    url.searchParams.append("apikey", apiKey);
    if (city) url.searchParams.append("city", city);
    if (keyword) url.searchParams.append("keyword", keyword);
    if (classificationName) url.searchParams.append("classificationName", classificationName);
    url.searchParams.append("size", "20");
    url.searchParams.append("sort", "date,asc");

    const response = await fetch(url.toString());
    const data = await response.json();

    const events = (data._embedded?.events || []).map((e: any) => ({
      id: `tm-${e.id}`,
      title: e.name,
      category: e.classifications?.[0]?.segment?.name || "Entertainment",
      description: e.info || e.pleaseNote || `Live event at ${e._embedded?.venues?.[0]?.name}`,
      date: e.dates?.start?.localDate ? new Date(e.dates.start.localDate).toLocaleDateString("en-US") : undefined,
      time: formatTo12Hour(e.dates?.start?.localTime),
      venue: e._embedded?.venues?.[0]?.name,
      location: e._embedded?.venues?.[0]?.address?.line1,
      cityName: e._embedded?.venues?.[0]?.city?.name,
      sourceUrl: e.url,
      imageUrl: e.images?.find((img: any) => img.ratio === "16_9")?.url || e.images?.[0]?.url,
      price: e.priceRanges ? `${e.priceRanges[0].min} - ${e.priceRanges[0].max} ${e.priceRanges[0].currency}` : undefined,
      isLive: true,
      isVerified: true,
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
    };
  } catch (error) {
    console.error("Ticketmaster API Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to fetch from Ticketmaster" }) };
  }
};