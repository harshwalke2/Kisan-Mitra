export type MarketSignal = {
  crop: string;
  changePercent: number;
  shouldNotify: boolean;
  trend: 'up' | 'down' | 'stable';
};

const hashText = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const normalizeCrop = (crop?: string): string => {
  const value = String(crop || '').trim().toLowerCase();
  return value || 'tomato';
};

export const getMarketSignal = (crop?: string, forcedChangePercent?: number): MarketSignal => {
  const normalizedCrop = normalizeCrop(crop);

  const changePercent = Number.isFinite(forcedChangePercent)
    ? Number(forcedChangePercent)
    : (() => {
        const daySeed = new Date().toISOString().slice(0, 10);
        const hash = hashText(`${normalizedCrop}-${daySeed}`);
        const signed = (hash % 35) - 17;
        return Number(signed.toFixed(1));
      })();

  const trend: 'up' | 'down' | 'stable' =
    changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'stable';

  return {
    crop: normalizedCrop,
    changePercent,
    trend,
    shouldNotify: Math.abs(changePercent) >= 10,
  };
};
