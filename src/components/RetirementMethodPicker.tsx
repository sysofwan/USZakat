import type { ReactNode } from 'react';
import { Box, FormControlLabel, Link, Radio, RadioGroup, Typography } from '@mui/material';
import { ZAKAT_METHOD_LABELS, ZAKAT_METHOD_SOURCES } from '../types';
import type { ZakatMethod } from '../types';

const METHOD_DESCRIPTIONS: Record<ZakatMethod, string> = {
  long_term:
    'Zakatable portion of stocks (stock proxy %); cash, bonds, metals & Bitcoin at full value. ' +
    'No tax or penalty deductions, since they won’t be incurred if you hold until retirement.',
  short_term:
    'Full market value, minus taxes and early withdrawal penalties, as if you cashed out today.',
  amja:
    'Zakatable portion of stocks, minus taxes and early withdrawal penalties on the whole account. ' +
    'Zakat is due only on what you could access today. Usually the lowest of the three.',
};

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} target="_blank" rel="noopener">
      {children}
    </Link>
  );
}

/**
 * Radio group for choosing how retirement accounts are zakated: the two FCNA
 * methods (chosen by intent) or the AMJA accessible-amount method.
 */
export default function RetirementMethodPicker({
  value,
  onChange,
  dense = false,
}: {
  value: ZakatMethod;
  onChange: (method: ZakatMethod) => void;
  dense?: boolean;
}) {
  const option = (method: ZakatMethod, recommended = false) => (
    <FormControlLabel
      value={method}
      control={<Radio size={dense ? 'small' : 'medium'} />}
      sx={{ alignItems: 'flex-start', mb: 1, '& .MuiRadio-root': { pt: 0.5 } }}
      label={
        <Box>
          <Typography component="span" variant={dense ? 'body2' : 'subtitle2'} sx={{ display: 'block', fontWeight: 600 }}>
            {ZAKAT_METHOD_LABELS[method]}{recommended && ' (Recommended)'}
          </Typography>
          <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {METHOD_DESCRIPTIONS[method]}
          </Typography>
        </Box>
      }
    />
  );

  return (
    <RadioGroup
      aria-label="Retirement account method"
      value={value}
      onChange={(e) => onChange(e.target.value as ZakatMethod)}
    >
      <Typography variant="overline" color="text.secondary">
        Fiqh Council of North America (FCNA)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Choose by your intent for the funds; the two methods can’t be mixed. Source:{' '}
        <SourceLink href={ZAKAT_METHOD_SOURCES.fcnaRetirement}>Zakat on Retirement Accounts</SourceLink>
        {' · '}
        <SourceLink href={ZAKAT_METHOD_SOURCES.fcnaStocks}>Zakat on Stocks</SourceLink>
      </Typography>
      {option('long_term', true)}
      {option('short_term')}

      <Typography variant="overline" color="text.secondary" sx={{ mt: 1 }}>
        Assembly of Muslim Jurists of America (AMJA)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Sources:{' '}
        <SourceLink href={ZAKAT_METHOD_SOURCES.amjaRecommendations}>
          16th Imams’ Conference recommendations
        </SourceLink>
        {' (2019, not a final AMJA resolution): §34 deduct taxes & penalties, §36 estimate the zakatable share of stocks · '}
        <SourceLink href={ZAKAT_METHOD_SOURCES.amjaIra}>Fatwa 87102</SourceLink>
        {' (~30% zakatable-asset estimate on the withdrawable amount) · '}
        <SourceLink href={ZAKAT_METHOD_SOURCES.amja401k}>Fatwa 23284</SourceLink>
        {' (withdrawable − penalty − tax)'}
      </Typography>
      {option('amja')}
    </RadioGroup>
  );
}
