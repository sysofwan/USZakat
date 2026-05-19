import type { Account, AccountBreakdown, Settings, StockHolding } from '../types';
import { ACCOUNT_TYPE_LABELS, ASSET_LABELS } from '../types';
import type { AssetType } from '../types';

const RETIREMENT_TYPES = new Set(['retirement_traditional', 'retirement_roth', 'retirement_mixed', 'hsa']);

interface ExportMeta {
  date: string;
  hijriYear: number;
  gregorianYear: number;
}

/**
 * Export a zakat calculation as an auditable Excel workbook with live formulas.
 * Dynamically imports ExcelJS to keep the main bundle small.
 */
export async function exportZakatExcel(
  accounts: Account[],
  snapshots: Record<string, Record<string, number>>,
  settings: Settings,
  rothPercents: Record<string, number>,
  stockHoldingsByAccount: Record<string, StockHolding[]>,
  _breakdowns: AccountBreakdown[],
  meta: ExportMeta
): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'US Zakat Calculator';
  workbook.created = new Date();

  const currencyFmt = '$#,##0.00';
  const percentFmt = '0.0%';

  // ── Sheet 1: Summary ──────────────────────────────────
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { width: 30 },
    { width: 20 },
  ];

  let row = 1;

  // Title
  const titleRow = summarySheet.getRow(row);
  titleRow.getCell(1).value = 'US Zakat Calculator — Zakat Report';
  titleRow.getCell(1).font = { bold: true, size: 14 };
  row += 1;

  summarySheet.getRow(row).getCell(1).value = `Date: ${meta.date}`;
  row += 1;
  summarySheet.getRow(row).getCell(1).value = `Hijri Year: ${meta.hijriYear} AH`;
  summarySheet.getRow(row).getCell(2).value = `Gregorian Year: ${meta.gregorianYear}`;
  row += 2;

  // Settings section
  summarySheet.getRow(row).getCell(1).value = 'Settings';
  summarySheet.getRow(row).getCell(1).font = { bold: true, size: 12 };
  row += 1;

  summarySheet.getRow(row).getCell(1).value = 'Zakat Method';
  summarySheet.getRow(row).getCell(2).value = settings.zakatMethod === 'long_term' ? 'Long-term' : 'Short-term';
  row += 1;

  summarySheet.getRow(row).getCell(1).value = 'Stock Proxy %';
  summarySheet.getRow(row).getCell(2).value = settings.stockProxyPercent / 100;
  summarySheet.getRow(row).getCell(2).numFmt = percentFmt;
  workbook.definedNames.add(`Summary!$B$${row}`, 'StockProxyPct');
  row += 1;

  summarySheet.getRow(row).getCell(1).value = 'Tax Rate';
  summarySheet.getRow(row).getCell(2).value = settings.taxRate / 100;
  summarySheet.getRow(row).getCell(2).numFmt = percentFmt;
  workbook.definedNames.add(`Summary!$B$${row}`, 'TaxRate');
  row += 1;

  summarySheet.getRow(row).getCell(1).value = 'Retirement Eligible (59½+)';
  summarySheet.getRow(row).getCell(2).value = settings.retirementEligible ? 'Yes' : 'No';
  row += 1;

  const nisabRow = row;
  summarySheet.getRow(row).getCell(1).value = 'Nisab Threshold';
  summarySheet.getRow(row).getCell(2).value = settings.nisab;
  summarySheet.getRow(row).getCell(2).numFmt = currencyFmt;
  workbook.definedNames.add(`Summary!$B$${row}`, 'NisabThreshold');
  row += 1;

  const zakatRateRow = row;
  summarySheet.getRow(row).getCell(1).value = 'Zakat Rate';
  summarySheet.getRow(row).getCell(2).value = 0.025;
  summarySheet.getRow(row).getCell(2).numFmt = percentFmt;
  workbook.definedNames.add(`Summary!$B$${row}`, 'ZakatRate');
  row += 2;

  // Totals — will be filled with formulas after Accounts sheet is built
  summarySheet.getRow(row).getCell(1).value = 'Calculation Results';
  summarySheet.getRow(row).getCell(1).font = { bold: true, size: 12 };
  row += 1;

  const grossWealthRow = row;
  summarySheet.getRow(row).getCell(1).value = 'Gross Wealth';
  summarySheet.getRow(row).getCell(2).numFmt = currencyFmt;
  row += 1;

  const totalNetRow = row;
  summarySheet.getRow(row).getCell(1).value = 'Total Net Zakatable';
  summarySheet.getRow(row).getCell(2).numFmt = currencyFmt;
  row += 1;

  const netWealthRow = row;
  summarySheet.getRow(row).getCell(1).value = 'Net Zakatable Wealth';
  summarySheet.getRow(row).getCell(2).numFmt = currencyFmt;
  row += 1;

  const meetsNisabRow = row;
  summarySheet.getRow(row).getCell(1).value = 'Meets Nisab?';
  row += 1;

  const zakatDueRow = row;
  summarySheet.getRow(row).getCell(1).value = 'Zakat Due';
  summarySheet.getRow(row).getCell(1).font = { bold: true, size: 12 };
  summarySheet.getRow(row).getCell(2).numFmt = currencyFmt;
  summarySheet.getRow(row).getCell(2).font = { bold: true, size: 12 };

  // ── Pre-compute Holdings layout (need row numbers before building Accounts) ──
  const hasAnyHoldings = Object.values(stockHoldingsByAccount).some((h) => h && h.length > 0);
  const holdingsAccountRows: Record<string, { startRow: number; endRow: number }> = {};
  interface HoldingRow { symbol: string; accountName: string; accountId: string; value: number; zakatablePercent: number; }
  const holdingRows: HoldingRow[] = [];

  if (hasAnyHoldings) {
    for (const account of accounts) {
      const holdings = stockHoldingsByAccount[account.id];
      if (!holdings || holdings.length === 0) continue;
      const startIdx = holdingRows.length;
      for (const h of holdings) {
        if (!h.symbol || h.value <= 0) continue;
        holdingRows.push({ symbol: h.symbol, accountName: account.name, accountId: account.id, value: h.value, zakatablePercent: h.zakatablePercent });
      }
      if (holdingRows.length > startIdx) {
        // +2 because Excel rows are 1-indexed and row 1 is header
        holdingsAccountRows[account.id] = { startRow: startIdx + 2, endRow: holdingRows.length + 1 };
      }
    }
  }

  // ── Sheet 2: Accounts ──────────────────────────────────
  const accountsSheet = workbook.addWorksheet('Accounts');

  accountsSheet.columns = [
    { width: 30 }, // A: Label
    { width: 18 }, // B: Value
    { width: 14 }, // C: Rate/Proxy
    { width: 18 }, // D: Zakatable amount
  ];

  let aRow = 1;
  // Track which rows hold each account's net zakatable and market value for Summary formulas
  const accountNetRows: number[] = [];
  const accountMarketRows: number[] = [];

  for (let ai = 0; ai < accounts.length; ai++) {
    const account = accounts[ai];
    const assetValues = snapshots[account.id] || {};
    const isRetirement = RETIREMENT_TYPES.has(account.type);
    const isShortTerm = settings.zakatMethod === 'short_term';
    const holdings = stockHoldingsByAccount[account.id];
    const hasHoldings = holdings && holdings.length > 0 && !(isRetirement && isShortTerm);

    // Account header
    const headerRow = accountsSheet.getRow(aRow);
    headerRow.getCell(1).value = account.name;
    headerRow.getCell(1).font = { bold: true, size: 12 };
    headerRow.getCell(2).value = ACCOUNT_TYPE_LABELS[account.type];
    headerRow.getCell(2).font = { italic: true, color: { argb: 'FF666666' } };
    if (isRetirement) {
      headerRow.getCell(3).value = settings.zakatMethod === 'long_term' ? 'Long-term' : 'Short-term';
      headerRow.getCell(3).font = { italic: true, color: { argb: 'FF666666' } };
    }
    aRow += 1;

    // Column headers
    const colHeaderRow = accountsSheet.getRow(aRow);
    colHeaderRow.values = ['Asset', 'Market Value', 'Rate', 'Zakatable'];
    colHeaderRow.font = { bold: true };
    colHeaderRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    });
    aRow += 1;

    // Asset rows
    const assetStartRow = aRow;
    const assetTypes = account.assets;

    for (const asset of assetTypes) {
      const value = assetValues[asset] || 0;
      const assetLabel = ASSET_LABELS[asset as AssetType] || asset;
      const isDebt = asset === 'credit_card_short' || asset === 'short_term_debt';
      const isLongDebt = asset === 'credit_card_long' || asset === 'loan';
      const isPassiveStock = asset === 'stock_passive';

      accountsSheet.getRow(aRow).getCell(1).value = assetLabel;
      accountsSheet.getRow(aRow).getCell(2).value = value;
      accountsSheet.getRow(aRow).getCell(2).numFmt = currencyFmt;

      if (isRetirement && isShortTerm) {
        // Short-term retirement: all assets at 100%, no proxy
        accountsSheet.getRow(aRow).getCell(3).value = isLongDebt ? 0 : (isDebt ? -1 : 1);
        accountsSheet.getRow(aRow).getCell(3).numFmt = percentFmt;
        accountsSheet.getRow(aRow).getCell(4).value = { formula: `B${aRow}*C${aRow}` };
      } else if (isPassiveStock && hasHoldings) {
        // Per-symbol: reference Holdings sheet
        const hRows = holdingsAccountRows[account.id];
        if (hRows) {
          // Known holdings zakatable from Holdings sheet
          const holdingsSumFormula = `SUMPRODUCT((Holdings!C${hRows.startRow}:C${hRows.endRow}="${account.id}")*Holdings!F${hRows.startRow}:F${hRows.endRow})`;
          // Leftover = MAX(0, stockValue - SUM of known values)
          const knownValueFormula = `SUMPRODUCT((Holdings!C${hRows.startRow}:C${hRows.endRow}="${account.id}")*Holdings!D${hRows.startRow}:D${hRows.endRow})`;
          // Rate column shows "Per-symbol"
          accountsSheet.getRow(aRow).getCell(3).value = 'Per-symbol';
          accountsSheet.getRow(aRow).getCell(3).font = { italic: true };
          // Zakatable = holdings zakatable + leftover * proxy
          accountsSheet.getRow(aRow).getCell(4).value = {
            formula: `${holdingsSumFormula}+MAX(0,B${aRow}-${knownValueFormula})*StockProxyPct`
          };
        } else {
          accountsSheet.getRow(aRow).getCell(3).value = { formula: 'StockProxyPct' };
          accountsSheet.getRow(aRow).getCell(3).numFmt = percentFmt;
          accountsSheet.getRow(aRow).getCell(4).value = { formula: `B${aRow}*C${aRow}` };
        }
      } else if (isPassiveStock) {
        // Flat proxy
        accountsSheet.getRow(aRow).getCell(3).value = { formula: 'StockProxyPct' };
        accountsSheet.getRow(aRow).getCell(3).numFmt = percentFmt;
        accountsSheet.getRow(aRow).getCell(4).value = { formula: `B${aRow}*C${aRow}` };
      } else if (isLongDebt) {
        accountsSheet.getRow(aRow).getCell(3).value = 0;
        accountsSheet.getRow(aRow).getCell(3).numFmt = percentFmt;
        accountsSheet.getRow(aRow).getCell(4).value = 0;
        accountsSheet.getRow(aRow).getCell(4).numFmt = currencyFmt;
        accountsSheet.getRow(aRow).getCell(1).font = { color: { argb: 'FF999999' } };
      } else if (isDebt) {
        accountsSheet.getRow(aRow).getCell(3).value = 1;
        accountsSheet.getRow(aRow).getCell(3).numFmt = percentFmt;
        // Negative: deducted
        accountsSheet.getRow(aRow).getCell(4).value = { formula: `-B${aRow}*C${aRow}` };
      } else {
        // Cash, active stocks, bonds, gold — 100%
        accountsSheet.getRow(aRow).getCell(3).value = 1;
        accountsSheet.getRow(aRow).getCell(3).numFmt = percentFmt;
        accountsSheet.getRow(aRow).getCell(4).value = { formula: `B${aRow}*C${aRow}` };
      }
      accountsSheet.getRow(aRow).getCell(4).numFmt = currencyFmt;
      aRow += 1;
    }
    const assetEndRow = aRow - 1;

    // Market Value row (sum of all positive assets minus short-term debt)
    const marketValueRow = aRow;
    // Build formula: sum non-long-debt B values with signs
    const marketParts: string[] = [];
    let assetIdx = 0;
    for (const asset of assetTypes) {
      const r = assetStartRow + assetIdx;
      const isDebt = asset === 'credit_card_short' || asset === 'short_term_debt';
      const isLongDebt = asset === 'credit_card_long' || asset === 'loan';
      if (!isLongDebt) {
        marketParts.push(isDebt ? `-B${r}` : `B${r}`);
      }
      assetIdx++;
    }
    accountsSheet.getRow(aRow).getCell(1).value = 'Market Value';
    accountsSheet.getRow(aRow).getCell(1).font = { bold: true };
    accountsSheet.getRow(aRow).getCell(2).value = { formula: marketParts.join('+') || '0' };
    accountsSheet.getRow(aRow).getCell(2).numFmt = currencyFmt;
    accountMarketRows.push(aRow);
    aRow += 1;

    // Account Base row
    const accountBaseRow = aRow;
    accountsSheet.getRow(aRow).getCell(1).value = 'Account Base';
    accountsSheet.getRow(aRow).getCell(1).font = { bold: true };
    if (isRetirement && isShortTerm) {
      // Short-term: account base = market value
      accountsSheet.getRow(aRow).getCell(2).value = { formula: `B${marketValueRow}` };
    } else if (assetStartRow > assetEndRow) {
      // No assets
      accountsSheet.getRow(aRow).getCell(2).value = 0;
    } else {
      // Sum of zakatable column (D)
      accountsSheet.getRow(aRow).getCell(2).value = { formula: `SUM(D${assetStartRow}:D${assetEndRow})` };
    }
    accountsSheet.getRow(aRow).getCell(2).numFmt = currencyFmt;
    aRow += 1;

    // Deductions for retirement accounts
    let netZakatableFormula: string;
    const STOCK_ASSET_SET = new Set(['stock_passive', 'stock_active']);

    if (isRetirement && isShortTerm) {
      // Short-term: full market value with tax/penalty deductions
      const taxRow = aRow;
      const showTax = account.type !== 'retirement_roth';
      accountsSheet.getRow(aRow).getCell(1).value = 'Tax Deduction';
      accountsSheet.getRow(aRow).getCell(2).value = { formula: showTax ? 'TaxRate' : '0' };
      accountsSheet.getRow(aRow).getCell(2).numFmt = percentFmt;
      aRow += 1;

      const penaltyRow = aRow;
      const penaltyRate = settings.retirementEligible ? 0 : (account.type === 'hsa' ? 0.20 : 0.10);
      accountsSheet.getRow(aRow).getCell(1).value = 'Early Withdrawal Penalty';
      accountsSheet.getRow(aRow).getCell(2).value = penaltyRate;
      accountsSheet.getRow(aRow).getCell(2).numFmt = percentFmt;
      aRow += 1;

      if (account.type === 'retirement_mixed') {
        const rothPct = rothPercents[account.id] ?? 50;
        const rothPctRow = aRow;
        accountsSheet.getRow(aRow).getCell(1).value = 'Roth %';
        accountsSheet.getRow(aRow).getCell(2).value = rothPct / 100;
        accountsSheet.getRow(aRow).getCell(2).numFmt = percentFmt;
        aRow += 1;

        const rothPortionRow = aRow;
        accountsSheet.getRow(aRow).getCell(1).value = 'Roth Portion';
        accountsSheet.getRow(aRow).getCell(2).value = { formula: `B${accountBaseRow}*B${rothPctRow}` };
        accountsSheet.getRow(aRow).getCell(2).numFmt = currencyFmt;
        aRow += 1;

        const tradPortionRow = aRow;
        accountsSheet.getRow(aRow).getCell(1).value = 'Traditional Portion';
        accountsSheet.getRow(aRow).getCell(2).value = { formula: `B${accountBaseRow}*(1-B${rothPctRow})` };
        accountsSheet.getRow(aRow).getCell(2).numFmt = currencyFmt;
        aRow += 1;

        netZakatableFormula = `B${rothPortionRow}*(1-B${penaltyRow})+B${tradPortionRow}*(1-B${taxRow}-B${penaltyRow})`;
      } else if (account.type === 'retirement_roth') {
        netZakatableFormula = `B${accountBaseRow}*(1-B${penaltyRow})`;
      } else {
        netZakatableFormula = `B${accountBaseRow}*(1-B${taxRow}-B${penaltyRow})`;
      }
    } else if (isRetirement && !isShortTerm) {
      // Long-term retirement: stocks use proxy (no deductions), non-stocks need deductions
      // Build stock base and non-stock base formulas from asset rows
      const stockDRows: string[] = [];
      const nonStockDRows: string[] = [];
      let idx = 0;
      for (const asset of assetTypes) {
        const r = assetStartRow + idx;
        const isDebt = asset === 'credit_card_short' || asset === 'short_term_debt';
        const isLongDebt = asset === 'credit_card_long' || asset === 'loan';
        if (!isLongDebt) {
          if (STOCK_ASSET_SET.has(asset)) {
            stockDRows.push(`D${r}`);
          } else if (isDebt) {
            nonStockDRows.push(`-B${r}`);
          } else {
            nonStockDRows.push(`D${r}`);
          }
        }
        idx++;
      }

      const stockBaseFormula = stockDRows.length > 0 ? stockDRows.join('+') : '0';
      const nonStockBaseFormula = nonStockDRows.length > 0 ? nonStockDRows.join('+') : '0';

      // Show stock base
      const stockBaseRow = aRow;
      accountsSheet.getRow(aRow).getCell(1).value = 'Stock Base (proxy applied)';
      accountsSheet.getRow(aRow).getCell(2).value = { formula: stockBaseFormula };
      accountsSheet.getRow(aRow).getCell(2).numFmt = currencyFmt;
      aRow += 1;

      // Show non-stock base
      const nonStockBaseRow = aRow;
      accountsSheet.getRow(aRow).getCell(1).value = 'Non-Stock Base (cash/bonds/gold)';
      accountsSheet.getRow(aRow).getCell(2).value = { formula: nonStockBaseFormula };
      accountsSheet.getRow(aRow).getCell(2).numFmt = currencyFmt;
      aRow += 1;

      // Tax & penalty for non-stock portion
      const taxRow = aRow;
      const showTax = account.type !== 'retirement_roth';
      accountsSheet.getRow(aRow).getCell(1).value = 'Tax Rate (non-stock)';
      accountsSheet.getRow(aRow).getCell(2).value = { formula: showTax ? 'TaxRate' : '0' };
      accountsSheet.getRow(aRow).getCell(2).numFmt = percentFmt;
      aRow += 1;

      const penaltyRow = aRow;
      const penaltyRate = settings.retirementEligible ? 0 : (account.type === 'hsa' ? 0.20 : 0.10);
      accountsSheet.getRow(aRow).getCell(1).value = 'Penalty Rate (non-stock)';
      accountsSheet.getRow(aRow).getCell(2).value = penaltyRate;
      accountsSheet.getRow(aRow).getCell(2).numFmt = percentFmt;
      aRow += 1;

      if (account.type === 'retirement_mixed') {
        const rothPct = rothPercents[account.id] ?? 50;
        const rothPctRow = aRow;
        accountsSheet.getRow(aRow).getCell(1).value = 'Roth %';
        accountsSheet.getRow(aRow).getCell(2).value = rothPct / 100;
        accountsSheet.getRow(aRow).getCell(2).numFmt = percentFmt;
        aRow += 1;

        // Stock base: no deductions. Non-stock: split by Roth/Trad with deductions
        const rothNonStock = `B${nonStockBaseRow}*B${rothPctRow}`;
        const tradNonStock = `B${nonStockBaseRow}*(1-B${rothPctRow})`;
        netZakatableFormula = `B${stockBaseRow}+(${rothNonStock})*(1-B${penaltyRow})+(${tradNonStock})*(1-B${taxRow}-B${penaltyRow})`;
      } else if (account.type === 'retirement_roth') {
        // Stock base + non-stock*(1-penalty)
        netZakatableFormula = `B${stockBaseRow}+B${nonStockBaseRow}*(1-B${penaltyRow})`;
      } else {
        // Traditional / HSA: stock base + non-stock*(1-tax-penalty)
        netZakatableFormula = `B${stockBaseRow}+B${nonStockBaseRow}*(1-B${taxRow}-B${penaltyRow})`;
      }
    } else {
      // Standard accounts: net = account base (no deductions)
      netZakatableFormula = `B${accountBaseRow}`;
    }

    // Net Zakatable row
    accountsSheet.getRow(aRow).getCell(1).value = 'Net Zakatable';
    accountsSheet.getRow(aRow).getCell(1).font = { bold: true, size: 11 };
    // Clamp non-debt to zero
    if (account.type === 'debt') {
      accountsSheet.getRow(aRow).getCell(2).value = { formula: netZakatableFormula };
    } else {
      accountsSheet.getRow(aRow).getCell(2).value = { formula: `MAX(0,${netZakatableFormula})` };
    }
    accountsSheet.getRow(aRow).getCell(2).numFmt = currencyFmt;
    accountsSheet.getRow(aRow).getCell(2).font = { bold: true };
    accountNetRows.push(aRow);
    aRow += 2; // blank separator
  }

  // ── Sheet 3: Holdings (created after Accounts for correct tab order) ──
  if (hasAnyHoldings && holdingRows.length > 0) {
    const holdingsSheet = workbook.addWorksheet('Holdings');
    holdingsSheet.columns = [
      { header: 'Symbol', width: 12 },
      { header: 'Account', width: 25 },
      { header: 'Account ID', width: 15 },
      { header: 'Value', width: 15 },
      { header: 'Zakatable %', width: 14 },
      { header: 'Zakatable Amount', width: 18 },
    ];
    const hdr = holdingsSheet.getRow(1);
    hdr.font = { bold: true };
    hdr.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
    });
    for (let i = 0; i < holdingRows.length; i++) {
      const hr = holdingRows[i];
      const hRow = i + 2;
      holdingsSheet.getRow(hRow).getCell(1).value = hr.symbol;
      holdingsSheet.getRow(hRow).getCell(2).value = hr.accountName;
      holdingsSheet.getRow(hRow).getCell(3).value = hr.accountId;
      holdingsSheet.getRow(hRow).getCell(4).value = hr.value;
      holdingsSheet.getRow(hRow).getCell(4).numFmt = currencyFmt;
      holdingsSheet.getRow(hRow).getCell(5).value = hr.zakatablePercent / 100;
      holdingsSheet.getRow(hRow).getCell(5).numFmt = percentFmt;
      holdingsSheet.getRow(hRow).getCell(6).value = { formula: `D${hRow}*E${hRow}` };
      holdingsSheet.getRow(hRow).getCell(6).numFmt = currencyFmt;
    }
  }

  // ── Fill Summary formulas ──────────────────────────────
  // Gross Wealth = sum of market value rows (exclude debt accounts)
  const nonDebtMarketRows = accounts
    .map((a, i) => ({ type: a.type, row: accountMarketRows[i] }))
    .filter((x) => x.type !== 'debt')
    .map((x) => `Accounts!B${x.row}`);
  summarySheet.getRow(grossWealthRow).getCell(2).value = {
    formula: nonDebtMarketRows.length > 0 ? nonDebtMarketRows.join('+') : '0',
  };

  // Total Net Zakatable = sum of all account net rows
  const netRefs = accountNetRows.map((r) => `Accounts!B${r}`);
  summarySheet.getRow(totalNetRow).getCell(2).value = {
    formula: netRefs.length > 0 ? netRefs.join('+') : '0',
  };

  // Net Zakatable Wealth = MAX(0, total)
  summarySheet.getRow(netWealthRow).getCell(2).value = {
    formula: `MAX(0,B${totalNetRow})`,
  };

  // Meets Nisab = boolean helper
  summarySheet.getRow(meetsNisabRow).getCell(2).value = {
    formula: `IF(B${netWealthRow}>=B${nisabRow},"Yes","No")`,
  };

  // Zakat Due
  summarySheet.getRow(zakatDueRow).getCell(2).value = {
    formula: `IF(B${meetsNisabRow}="Yes",ROUND(B${netWealthRow}*B${zakatRateRow},2),0)`,
  };

  // ── Download ───────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zakat-report-${meta.gregorianYear}-${meta.hijriYear}AH.xlsx`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
