import { FORUM_WORKSPACE_ID } from "@/lib/supabase/config";
import { createNewsroomServerClient } from "@/lib/supabase/server";

type MarketEditionValues = {
  dow: number;
  sp500: number;
  nasdaq: number;
  corn: number;
  beans: number;
  wheat: number;
  poetCorn: number;
  hppBeans: number;
};

type RecordEditionResult = {
  previous_values?: Partial<MarketEditionValues> | null;
};

function numberFrom(value: string) {
  return Number(value.replace(/[$,]/g, ""));
}

function parseMarketBlock(block: string): MarketEditionValues | null {
  const patterns = {
    dow: /Dow Jones:\s+([0-9,.]+)/,
    sp500: /S&P 500:\s+([0-9,.]+)/,
    nasdaq: /Nasdaq:\s+([0-9,.]+)/,
    corn: /\nCorn:\s+\$([0-9,.]+)/,
    beans: /\nBeans:\s+\$([0-9,.]+)/,
    wheat: /\nWheat:\s+\$([0-9,.]+)/,
    poetCorn: /Poet \(Corn\):\s+\$([0-9,.]+)/,
    hppBeans: /High Plains Processing \(Beans\):\s+\$([0-9,.]+)/
  } as const;

  const parsed: Partial<MarketEditionValues> = {};
  for (const [key, pattern] of Object.entries(patterns) as [keyof MarketEditionValues, RegExp][]) {
    const match = block.match(pattern);
    if (!match) return null;
    const value = numberFrom(match[1]);
    if (!Number.isFinite(value)) return null;
    parsed[key] = value;
  }

  return parsed as MarketEditionValues;
}

function movement(current: number, previous: number, unit: "points" | "money") {
  const difference = current - previous;
  if (Math.abs(difference) < 0.00001) return "unchanged";
  const direction = difference > 0 ? "up" : "down";
  const absolute = Math.abs(difference);
  return unit === "money"
    ? `${direction} $${absolute.toFixed(2)}`
    : `${direction} ${absolute.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} points`;
}

function buildChanges(current: MarketEditionValues, previous: MarketEditionValues) {
  return [
    "CHANGES SINCE PREVIOUS UPDATE",
    `Dow Jones: ${movement(current.dow, previous.dow, "points")}`,
    `S&P 500: ${movement(current.sp500, previous.sp500, "points")}`,
    `Nasdaq: ${movement(current.nasdaq, previous.nasdaq, "points")}`,
    `Local corn: ${movement(current.corn, previous.corn, "money")}`,
    `Local beans: ${movement(current.beans, previous.beans, "money")}`,
    `Local wheat: ${movement(current.wheat, previous.wheat, "money")}`,
    `POET Mitchell corn: ${movement(current.poetCorn, previous.poetCorn, "money")}`,
    `High Plains Processing beans: ${movement(current.hppBeans, previous.hppBeans, "money")}`
  ].join("\n");
}

function isComplete(values: Partial<MarketEditionValues> | null | undefined): values is MarketEditionValues {
  if (!values) return false;
  return ["dow", "sp500", "nasdaq", "corn", "beans", "wheat", "poetCorn", "hppBeans"].every(
    (key) => typeof values[key as keyof MarketEditionValues] === "number"
  );
}

export async function recordMarketsEdition(input: {
  ready: boolean;
  collectedAt: string;
  block: string;
}) {
  if (!input.ready) return null;

  const currentValues = parseMarketBlock(input.block);
  if (!currentValues) return null;

  try {
    const supabase = await createNewsroomServerClient();
    const { data, error } = await supabase.rpc("newsroom_record_markets_edition", {
      target_workspace: FORUM_WORKSPACE_ID,
      edition_observed_at: input.collectedAt,
      edition_values: currentValues,
      edition_block: input.block
    });

    if (error) return null;
    const result = data as RecordEditionResult | null;
    const previous = result?.previous_values;
    if (!isComplete(previous)) return null;

    return `${input.block}\n\n${buildChanges(currentValues, previous)}`;
  } catch {
    return null;
  }
}
