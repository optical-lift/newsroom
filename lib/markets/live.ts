const MARKETWATCH_QUOTE_URL = "https://api-secure.wsj.net/api/dylan/quotes/v2/comp/quoteByDialect";
const MARKETWATCH_TOKEN = "cecc4267a0194af89ca343805a3e57af";

const SOURCE_URLS = {
  marketwatch: "https://www.marketwatch.com/markets/us",
  chs: "https://www.chsfarmersalliance.com/grain/cash-bids/",
  poet: "https://poet.gradable.com/market/Mitchell--SD",
  hpp: "https://www.hppsd.com/cash-bids/"
} as const;

export type MarketFieldKey =
  | "dow"
  | "sp500"
  | "nasdaq"
  | "corn"
  | "beans"
  | "wheat"
  | "poetCorn"
  | "hppBeans";

export type MarketSourceStatus = {
  key: "marketwatch" | "chs" | "poet" | "hpp";
  label: string;
  url: string;
  ok: boolean;
  asOf: string | null;
};

export type MarketsSnapshot = {
  collectedAt: string;
  ready: boolean;
  availableCount: number;
  missing: string[];
  block: string;
  sources: MarketSourceStatus[];
};

type IndexQuote = {
  value: number;
  change: number;
  time: string | null;
  zone: string | null;
};

type LocalBid = {
  value: number;
  delivery: string | null;
  asOf: string | null;
};

type MarketWatchPayload = {
  InstrumentResponses?: Array<{
    RequestId?: string;
    Matches?: Array<{
      CompositeTrading?: {
        Last?: { Price?: { Value?: number }; Time?: string };
        NetChange?: { Value?: number };
      };
      TimeZoneInfo?: { Abbreviation?: string };
    }>;
  }>;
};

const FIELD_LABELS: Record<MarketFieldKey, string> = {
  dow: "Dow Jones",
  sp500: "S&P 500",
  nasdaq: "Nasdaq",
  corn: "Local corn",
  beans: "Local beans",
  wheat: "Local wheat",
  poetCorn: "POET Mitchell corn",
  hppBeans: "High Plains Processing beans"
};

function money(value: number | null) {
  return value == null ? "—" : `$${value.toFixed(2)}`;
}

function indexValue(value: number | null) {
  return value == null
    ? "—"
    : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function indexChange(value: number | null) {
  if (value == null) return "—";
  const absolute = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${absolute}`;
}

function marketWatchAsOf(time: string | null, zone: string | null) {
  if (!time) return null;
  const match = time.match(/T(\d{2}):(\d{2})/);
  if (!match) return time;
  const hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}${zone ? ` ${zone}` : ""}`;
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
    headers: {
      Accept: "text/html,text/plain;q=0.9,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; OpticalLiftNewsroom/1.0)"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function readPublicPage<T>(officialUrl: string, parse: (text: string) => T) {
  try {
    return parse(await fetchText(officialUrl));
  } catch {
    return parse(await fetchText(`https://r.jina.ai/${officialUrl}`));
  }
}

async function fetchMarketWatch() {
  const url = new URL(MARKETWATCH_QUOTE_URL);
  url.searchParams.set("dialect", "charting");
  url.searchParams.set("dialects", "charting");
  url.searchParams.set("ckey", MARKETWATCH_TOKEN.slice(0, 10));
  url.searchParams.set("needed", "TimeZoneInfo|CompositeTrading|Meta|PastCloses");
  url.searchParams.set(
    "id",
    "INDEX/US//DJIA,INDEX/US//SPX,INDEX/US/XNAS/COMP"
  );
  url.searchParams.set("maxInstrumentMatches", "1");

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Dylan2010.EntitlementToken": MARKETWATCH_TOKEN,
      Origin: "https://www.marketwatch.com",
      Referer: "https://www.marketwatch.com/",
      "User-Agent": "Mozilla/5.0"
    }
  });
  if (!response.ok) throw new Error(`MarketWatch HTTP ${response.status}`);

  const payload = (await response.json()) as MarketWatchPayload;
  const responses = payload.InstrumentResponses ?? [];

  function quote(requestId: string): IndexQuote {
    const match = responses.find((item) => item.RequestId === requestId)?.Matches?.[0];
    const value = match?.CompositeTrading?.Last?.Price?.Value;
    const change = match?.CompositeTrading?.NetChange?.Value;
    if (typeof value !== "number" || typeof change !== "number") {
      throw new Error(`MarketWatch quote missing for ${requestId}`);
    }
    return {
      value,
      change,
      time: match?.CompositeTrading?.Last?.Time ?? null,
      zone: match?.TimeZoneInfo?.Abbreviation ?? null
    };
  }

  return {
    dow: quote("INDEX/US//DJIA"),
    sp500: quote("INDEX/US//SPX"),
    nasdaq: quote("INDEX/US/XNAS/COMP")
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseChs(text: string) {
  const mitchell = text.match(/#####\s+Mitchell\s+([\s\S]*?)(?=\n#####\s+|\nQuotes delayed|$)/i)?.[1];
  if (!mitchell) throw new Error("Mitchell CHS section not found");
  const mitchellSection: string = mitchell;

  function commodity(name: string): LocalBid {
    const block = mitchellSection.match(
      new RegExp(`######\\s+${escapeRegExp(name)}\\s+([\\s\\S]*?)(?=\\n######\\s+|$)`, "i")
    )?.[1];
    if (!block) throw new Error(`${name} bid not found`);
    const compact = block.replace(/\s+/g, " ");
    const row = compact.match(/Futures Month\s+([A-Za-z]{3,9}\s+\d{4})\s+([0-9]+(?:\.[0-9]+)?)/i);
    if (!row) throw new Error(`${name} bid row not found`);
    return { value: Number(row[2]), delivery: row[1], asOf: null };
  }

  return {
    corn: commodity("Corn"),
    beans: commodity("Soybeans"),
    wheat: commodity("Wheat HRW")
  };
}

function parsePoet(text: string): LocalBid {
  const section = text.match(/####\s+Local Bids([\s\S]*?)Last updated on/i)?.[1];
  if (!section) throw new Error("POET local bids not found");
  const row = section.match(/\|\s*([A-Za-z]+\s+\d{4}[^|]*)\|\s*[^|]*\|\s*\$([0-9]+(?:\.[0-9]+)?)\s*\|/);
  if (!row) throw new Error("POET current corn bid not found");
  const asOf = text.match(/Last updated on\s+([^\n]+)/i)?.[1]?.trim() ?? null;
  return { value: Number(row[2]), delivery: row[1].trim(), asOf };
}

function parseHpp(text: string): LocalBid {
  const section = text.match(/####\s+Cash Bids([\s\S]*?)(?=\n\*\s+\[About Us|$)/i)?.[1] ?? text;
  const mitchellIndex = section.toLowerCase().indexOf("mitchell");
  if (mitchellIndex < 0) throw new Error("HPP Mitchell bids not found");
  const mitchell = section.slice(mitchellIndex);
  const row = mitchell.match(/Soybeans\s+([^$\n]*)\$([0-9]+(?:\.[0-9]+)?)/i);
  if (!row) throw new Error("HPP current soybean bid not found");
  const asOf = text.match(/Prices current as of\s+([^\n]+?)(?:\s+-\s+Provided by|\n)/i)?.[1]?.trim() ?? null;
  return { value: Number(row[2]), delivery: row[1].trim() || null, asOf };
}

function buildBlock(values: {
  dow: IndexQuote | null;
  sp500: IndexQuote | null;
  nasdaq: IndexQuote | null;
  corn: LocalBid | null;
  beans: LocalBid | null;
  wheat: LocalBid | null;
  poetCorn: LocalBid | null;
  hppBeans: LocalBid | null;
}) {
  return [
    "MARKETS",
    `Dow Jones: ${indexValue(values.dow?.value ?? null)} (${indexChange(values.dow?.change ?? null)})`,
    `S&P 500: ${indexValue(values.sp500?.value ?? null)} (${indexChange(values.sp500?.change ?? null)})`,
    `Nasdaq: ${indexValue(values.nasdaq?.value ?? null)} (${indexChange(values.nasdaq?.change ?? null)})`,
    "",
    "Local Grain:",
    `Corn: ${money(values.corn?.value ?? null)}`,
    `Beans: ${money(values.beans?.value ?? null)}`,
    `Wheat: ${money(values.wheat?.value ?? null)}`,
    "",
    `Poet (Corn): ${money(values.poetCorn?.value ?? null)}`,
    `High Plains Processing (Beans): ${money(values.hppBeans?.value ?? null)}`
  ].join("\n");
}

export async function collectMitchellMarkets(): Promise<MarketsSnapshot> {
  const collectedAt = new Date().toISOString();
  const [marketwatchResult, chsResult, poetResult, hppResult] = await Promise.allSettled([
    fetchMarketWatch(),
    readPublicPage(SOURCE_URLS.chs, parseChs),
    readPublicPage(SOURCE_URLS.poet, parsePoet),
    readPublicPage(SOURCE_URLS.hpp, parseHpp)
  ]);

  const marketwatch = marketwatchResult.status === "fulfilled" ? marketwatchResult.value : null;
  const chs = chsResult.status === "fulfilled" ? chsResult.value : null;
  const poet = poetResult.status === "fulfilled" ? poetResult.value : null;
  const hpp = hppResult.status === "fulfilled" ? hppResult.value : null;

  const values = {
    dow: marketwatch?.dow ?? null,
    sp500: marketwatch?.sp500 ?? null,
    nasdaq: marketwatch?.nasdaq ?? null,
    corn: chs?.corn ?? null,
    beans: chs?.beans ?? null,
    wheat: chs?.wheat ?? null,
    poetCorn: poet ?? null,
    hppBeans: hpp ?? null
  };

  const presence: Record<MarketFieldKey, boolean> = {
    dow: values.dow != null,
    sp500: values.sp500 != null,
    nasdaq: values.nasdaq != null,
    corn: values.corn != null,
    beans: values.beans != null,
    wheat: values.wheat != null,
    poetCorn: values.poetCorn != null,
    hppBeans: values.hppBeans != null
  };

  const missing = (Object.keys(presence) as MarketFieldKey[])
    .filter((key) => !presence[key])
    .map((key) => FIELD_LABELS[key]);
  const availableCount = 8 - missing.length;

  const latestMarketQuote = marketwatch
    ? [marketwatch.dow, marketwatch.sp500, marketwatch.nasdaq]
        .filter((quote) => quote.time)
        .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
        .at(-1) ?? null
    : null;

  const sources: MarketSourceStatus[] = [
    {
      key: "marketwatch",
      label: "MarketWatch",
      url: SOURCE_URLS.marketwatch,
      ok: marketwatch != null,
      asOf: latestMarketQuote ? marketWatchAsOf(latestMarketQuote.time, latestMarketQuote.zone) : null
    },
    {
      key: "chs",
      label: "CHS Farmers Alliance · Mitchell",
      url: SOURCE_URLS.chs,
      ok: chs != null,
      asOf: null
    },
    {
      key: "poet",
      label: "POET Mitchell",
      url: SOURCE_URLS.poet,
      ok: poet != null,
      asOf: poet?.asOf ?? null
    },
    {
      key: "hpp",
      label: "High Plains Processing · Mitchell",
      url: SOURCE_URLS.hpp,
      ok: hpp != null,
      asOf: hpp?.asOf ?? null
    }
  ];

  return {
    collectedAt,
    ready: missing.length === 0,
    availableCount,
    missing,
    block: buildBlock(values),
    sources
  };
}
