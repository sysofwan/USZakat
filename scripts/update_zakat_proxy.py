"""
Zakat Proxy Calculator

Calculates the zakatable percentage for stocks and ETFs using the Zoya methodology:
  zakat_pct = current_assets / market_cap

For ETFs, uses a look-through approach:
  etf_zakat_pct = Σ(weight_i × max(stock_zakat_pct_i, 0)) + cash_weight

Data sources:
  - yfinance: balance sheet (Current Assets), market cap, and ETF holdings
  - Wikipedia: S&P 500 and Nasdaq 100 constituent lists

Output: public/data/zakat-proxy.json
"""

import json
import math
import sys
import time
from datetime import date
from io import StringIO
from pathlib import Path

import pandas as pd
import requests
import yfinance as yf

# Configuration
FALLBACK_ZAKAT_PCT = 0.30
TARGET_ETFS = ["SPUS", "UMMA"]
BATCH_SIZE = 5  # tickers per yfinance batch
RATE_LIMIT_DELAY = 1.0  # seconds between batches

WIKI_HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}


def get_sp500_tickers() -> list[str]:
    """Get S&P 500 constituent tickers from Wikipedia."""
    r = requests.get(
        "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies",
        headers=WIKI_HEADERS,
        timeout=30,
    )
    r.raise_for_status()
    tables = pd.read_html(StringIO(r.text))
    return tables[0]["Symbol"].str.replace(".", "-", regex=False).tolist()


def get_nasdaq100_tickers() -> list[str]:
    """Get Nasdaq 100 constituent tickers from Wikipedia."""
    r = requests.get(
        "https://en.wikipedia.org/wiki/Nasdaq-100",
        headers=WIKI_HEADERS,
        timeout=30,
    )
    r.raise_for_status()
    tables = pd.read_html(StringIO(r.text))
    for t in tables:
        if "Ticker" in t.columns:
            return t["Ticker"].str.replace(".", "-", regex=False).tolist()
        if "Symbol" in t.columns:
            return t["Symbol"].str.replace(".", "-", regex=False).tolist()
    return []


def get_etf_data(symbol: str) -> dict:
    """
    Get ETF holdings and asset allocation from yfinance.
    Returns {holdings: [{symbol, weight}], cash_weight: float}
    """
    t = yf.Ticker(symbol)
    result = {"holdings": [], "cash_weight": 0.0}
    try:
        fd = t.funds_data
        holdings = fd.top_holdings
        if holdings is not None and not holdings.empty:
            for sym, row in holdings.iterrows():
                result["holdings"].append({
                    "symbol": str(sym),
                    "weight": float(row["Holding Percent"]),
                })
        ac = fd.asset_classes
        if ac:
            result["cash_weight"] = float(ac.get("cashPosition", 0))
    except Exception as e:
        print(f"    Warning: Could not get ETF data for {symbol}: {e}")
    return result


def calculate_zakat_pct_batch(tickers: list[str]) -> dict[str, float | None]:
    """
    Calculate zakat percentage for a list of tickers using yfinance.
    Returns {ticker: zakat_pct} where zakat_pct is None if data unavailable.
    """
    results = {}
    total = len(tickers)

    for i in range(0, total, BATCH_SIZE):
        batch = tickers[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
        print(f"  Batch {batch_num}/{total_batches} ({len(batch)} tickers)...", end="", flush=True)

        for ticker_str in batch:
            try:
                ticker = yf.Ticker(ticker_str)
                info = ticker.info

                market_cap = info.get("marketCap")
                if not market_cap or market_cap <= 0:
                    results[ticker_str] = None
                    continue

                bs = ticker.balance_sheet
                if bs is None or bs.empty:
                    results[ticker_str] = None
                    continue

                current_assets = None
                for label in ["Current Assets", "Total Current Assets"]:
                    if label in bs.index:
                        current_assets = bs.loc[label].iloc[0]
                        break

                if current_assets is None or math.isnan(current_assets) or current_assets <= 0:
                    results[ticker_str] = None
                    continue

                zakat_pct = float(current_assets) / float(market_cap)
                if math.isnan(zakat_pct):
                    results[ticker_str] = None
                    continue
                results[ticker_str] = max(zakat_pct, 0.0)

            except Exception as e:
                print(f"\n    Warning: {ticker_str}: {e}")
                results[ticker_str] = None

        success_in_batch = sum(1 for t in batch if results.get(t) is not None)
        print(f" ({success_in_batch}/{len(batch)} ok)")

        if i + BATCH_SIZE < total:
            time.sleep(RATE_LIMIT_DELAY)

    return results


def calculate_etf_zakat_pct(
    etf_data: dict,
    stock_data: dict[str, float | None],
    avg_zakat_pct: float,
) -> float:
    """
    Calculate ETF zakat percentage as weighted sum of constituent percentages.
    Uses avg_zakat_pct for unknown holdings (remainder after top holdings).
    Cash is 100% zakatable.
    """
    weighted_zakat = 0.0
    covered_weight = 0.0

    # Cash portion
    cash_weight = etf_data["cash_weight"]
    weighted_zakat += cash_weight * 1.0
    covered_weight += cash_weight

    # Known holdings
    for holding in etf_data["holdings"]:
        symbol = holding["symbol"]
        weight = holding["weight"]

        if symbol in stock_data and stock_data[symbol] is not None:
            weighted_zakat += weight * max(stock_data[symbol], 0.0)
        else:
            # Use average for unknown individual holdings
            weighted_zakat += weight * avg_zakat_pct
        covered_weight += weight

    # Remainder (weight not covered by top holdings or cash)
    remainder = max(1.0 - covered_weight, 0.0)
    if remainder > 0:
        weighted_zakat += remainder * avg_zakat_pct

    return weighted_zakat


def main():
    print("=" * 60)
    print("Zakat Proxy Calculator")
    print(f"Date: {date.today().isoformat()}")
    print("Methodology: Zoya (Current Assets / Market Cap)")
    print("=" * 60)

    # Step 1: Get stock universe
    print("\n[1/5] Fetching index constituents...")
    sp500 = get_sp500_tickers()
    print(f"  S&P 500: {len(sp500)} tickers")

    nasdaq100 = get_nasdaq100_tickers()
    print(f"  Nasdaq 100: {len(nasdaq100)} tickers")

    # Step 2: Get ETF data
    print("\n[2/5] Fetching ETF holdings...")
    etf_data: dict[str, dict] = {}
    etf_constituent_tickers: set[str] = set()

    for etf in TARGET_ETFS:
        data = get_etf_data(etf)
        etf_data[etf] = data
        for h in data["holdings"]:
            etf_constituent_tickers.add(h["symbol"])
        print(f"  {etf}: {len(data['holdings'])} top holdings, cash={data['cash_weight']:.2%}")

    # Step 3: Build deduplicated ticker list
    all_tickers = sorted(set(sp500 + nasdaq100) | etf_constituent_tickers)
    print(f"\n[3/5] Total unique tickers: {len(all_tickers)}")

    # Step 4: Calculate zakat percentages
    print("\n[4/5] Calculating zakat percentages...")
    stock_data = calculate_zakat_pct_batch(all_tickers)

    # Stats
    successful_values = [v for v in stock_data.values() if v is not None and not math.isnan(v)]
    success_count = len(successful_values)
    failed_count = len(stock_data) - success_count
    avg_pct = sum(successful_values) / len(successful_values) if successful_values else FALLBACK_ZAKAT_PCT
    print(f"\n  Results: {success_count} calculated, {failed_count} unavailable")
    print(f"  Average zakat %: {avg_pct:.2%}")

    # Step 5: Build output
    print("\n[5/5] Building output...")
    output_data: dict[str, float] = {}

    # Add individual stocks (only those with valid data)
    for ticker, pct in stock_data.items():
        if pct is not None and not math.isnan(pct):
            output_data[ticker] = round(pct, 4)

    # Calculate and add ETFs
    for etf in TARGET_ETFS:
        etf_pct = calculate_etf_zakat_pct(etf_data[etf], stock_data, avg_pct)
        output_data[etf] = round(etf_pct, 4)
        print(f"  {etf} zakat percentage: {etf_pct:.2%}")

    # Write output
    output = {
        "generated": date.today().isoformat(),
        "methodology": "current_assets_over_market_cap",
        "fallback": FALLBACK_ZAKAT_PCT,
        "count": len(output_data),
        "data": dict(sorted(output_data.items())),
    }

    output_path = Path(__file__).parent.parent / "public" / "data" / "zakat-proxy.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, separators=(",", ":")))

    file_size = output_path.stat().st_size
    print(f"\n  Written to: {output_path}")
    print(f"  File size: {file_size / 1024:.1f} KB")
    print(f"  Total entries: {len(output_data)}")
    print("\nDone!")


if __name__ == "__main__":
    main()
