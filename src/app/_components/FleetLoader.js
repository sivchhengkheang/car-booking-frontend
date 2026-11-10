import HomeFleetClient from "./HomeFleetClient";

async function fetchInitialCars(query) {
  const base =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000";

  try {
    const url = new URL(`${base.replace(/\/+$/, "")}/api/v1/cars`);
    if (query.location && query.location !== "All Locations") {
      url.searchParams.set("city", query.location);
    }
    if (query.start) url.searchParams.set("start", query.start);
    if (query.end) url.searchParams.set("end", query.end);
    if (query.vehicle && query.vehicle !== "All Types") {
      url.searchParams.set("category", query.vehicle);
    }

    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (data?.success) {
      return data.cars || data.data || [];
    }
    return null;
  } catch {
    // Graceful fallback: client component will fetch seamlessly in background
    return null;
  }
}

export default async function FleetLoader({ searchParams }) {
  const sp = (await searchParams) || {};
  const initialQuery = {
    location: sp.city || sp.location || "All Locations",
    start: sp.start || sp.startDate || null,
    end: sp.end || sp.endDate || null,
    vehicle: sp.vehicle || sp.category || "All Types",
  };

  const initialCars = await fetchInitialCars(initialQuery);

  return <HomeFleetClient initialCars={initialCars} initialQuery={initialQuery} />;
}
