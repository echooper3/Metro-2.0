import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  const apiKey = process.env.EVENTBRITE_API_KEY;
  const orgId = process.env.EVENTBRITE_ORGANIZATION_ID;
  if (!apiKey || !orgId) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: "EVENTBRITE_API_KEY or EVENTBRITE_ORGANIZATION_ID not configured" }) 
    };
  }

  const { city, keyword, category } = event.queryStringParameters || {};

  const normalizeCity = (name: string): string => {
    const n = name.toLowerCase().trim();
    if (n === 'okc' || n.includes('oklahoma')) return 'okc';
    if (n.includes('dallas')) return 'dallas';
    if (n.includes('houston')) return 'houston';
    if (n.includes('tulsa')) return 'tulsa';
    return n;
  };

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

    // Filter events locally by city, keyword, or category since search is deprecated
    const filtered = rawEvents.filter((e: any) => {
      // City check
      const eventCity = e.venue?.address?.city || "";
      if (city && city !== "All" && normalizeCity(eventCity) !== normalizeCity(city)) {
        return false;
      }

      // Keyword check
      if (keyword) {
        const text = `${e.name?.text || ""} ${e.description?.text || ""}`.toLowerCase();
        if (!text.includes(keyword.toLowerCase())) {
          return false;
        }
      }

      // Category check
      if (category && category !== "All") {
        const text = `${e.name?.text || ""} ${e.description?.text || ""}`.toLowerCase();
        if (!text.includes(category.toLowerCase())) {
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
        category: category || "Entertainment",
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

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
    };
  } catch (error: any) {
    console.error("Eventbrite API Error:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message || "Failed to fetch from Eventbrite" }) 
    };
  }
};
