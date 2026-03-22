export type PestRiskLevel = 'low' | 'moderate' | 'high';

export type PestRiskInput = {
  humidity: number;
  temperature: number;
};

export type PestRiskResult = {
  level: PestRiskLevel;
  shouldNotify: boolean;
  reason: string;
};

export const evaluatePestRisk = (input: PestRiskInput): PestRiskResult => {
  const humidity = Number(input.humidity);
  const temperature = Number(input.temperature);

  if (humidity > 70 && temperature > 25) {
    return {
      level: 'high',
      shouldNotify: true,
      reason: `Humidity ${humidity}% and temperature ${temperature}C increase pest activity.`,
    };
  }

  if (humidity > 60 && temperature > 22) {
    return {
      level: 'moderate',
      shouldNotify: false,
      reason: 'Conditions are mildly favorable for pest growth.',
    };
  }

  return {
    level: 'low',
    shouldNotify: false,
    reason: 'Current weather is less favorable for major pest outbreaks.',
  };
};
