import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, Sprout, TestTubeDiagonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  requestCropRecommendation,
  type CropRecommendationPayload,
  type CropRecommendationResponse,
} from '@/services/cropRecommendationService';

// Valid input ranges matching backend INPUT_RANGES
const FIELD_CONFIG: Array<{
  key: keyof CropRecommendationPayload;
  label: string;
  unit: string;
  step: string;
  min: number;
  max: number;
  hint: string;
}> = [
  { key: 'nitrogen',    label: 'Nitrogen (N)',      unit: 'kg/ha', step: '1',    min: 0,    max: 140, hint: '0 – 140 kg/ha' },
  { key: 'phosphorus',  label: 'Phosphorus (P)',    unit: 'kg/ha', step: '1',    min: 5,    max: 145, hint: '5 – 145 kg/ha' },
  { key: 'potassium',   label: 'Potassium (K)',     unit: 'kg/ha', step: '1',    min: 5,    max: 205, hint: '5 – 205 kg/ha' },
  { key: 'temperature', label: 'Temperature',       unit: '°C',    step: '0.1',  min: 8,    max: 44,  hint: '8 – 44 °C' },
  { key: 'humidity',    label: 'Humidity',          unit: '%',     step: '0.1',  min: 14,   max: 100, hint: '14 – 100 %' },
  { key: 'ph',          label: 'Soil pH',           unit: '',      step: '0.01', min: 3.5,  max: 10,  hint: '3.5 – 10.0' },
  { key: 'rainfall',    label: 'Rainfall',          unit: 'mm',    step: '0.1',  min: 20,   max: 300, hint: '20 – 300 mm' },
];

const initialFormState: CropRecommendationPayload = {
  nitrogen: 90,
  phosphorus: 42,
  potassium: 43,
  temperature: 20.9,
  humidity: 82,
  ph: 6.5,
  rainfall: 202.9,
};

type ValidationErrors = Partial<Record<keyof CropRecommendationPayload, string>>;

function validateForm(data: CropRecommendationPayload): ValidationErrors {
  const errors: ValidationErrors = {};
  for (const field of FIELD_CONFIG) {
    const val = data[field.key];
    if (!Number.isFinite(val)) {
      errors[field.key] = `${field.label} must be a number`;
    } else if (val < field.min || val > field.max) {
      errors[field.key] = `Valid range: ${field.hint}`;
    }
  }
  return errors;
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-10 text-right">{pct}%</span>
    </div>
  );
}

export function CropRecommendationForm() {
  const [formData, setFormData] = useState<CropRecommendationPayload>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CropRecommendationResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const confidencePercent = useMemo(
    () => (result ? (result.confidence * 100).toFixed(1) : null),
    [result]
  );

  const updateField = (key: keyof CropRecommendationPayload, value: string) => {
    const numeric = parseFloat(value);
    const updated = { ...formData, [key]: Number.isFinite(numeric) ? numeric : 0 };
    setFormData(updated);
    // Clear field-level error on change
    if (fieldErrors[key]) {
      const { [key]: _removed, ...rest } = fieldErrors;
      setFieldErrors(rest);
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const recommendation = await requestCropRecommendation(formData);
      setResult(recommendation);
    } catch (err) {
      setSubmitError((err as Error).message || 'Unable to get recommendation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* ── Input Form ── */}
        <Card className="border-green-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TestTubeDiagonal className="w-6 h-6 text-emerald-600" />
              Soil &amp; Climate Parameters
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">Enter observed values for all 7 parameters.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
              {FIELD_CONFIG.map((field) => (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    {field.label}
                    {field.unit && (
                      <span className="text-xs text-gray-400 ml-1">({field.unit})</span>
                    )}
                  </label>
                  <Input
                    type="number"
                    step={field.step}
                    min={field.min}
                    max={field.max}
                    value={formData[field.key]}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    className={fieldErrors[field.key] ? 'border-red-400 focus-visible:ring-red-400' : ''}
                  />
                  {fieldErrors[field.key] ? (
                    <p className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors[field.key]}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">{field.hint}</p>
                  )}
                </div>
              ))}

              <div className="sm:col-span-2 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white"
                >
                  {loading ? 'Analysing...' : 'Recommend Crop'}
                </Button>
              </div>

              {submitError && (
                <div className="sm:col-span-2 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {submitError}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* ── Results Panel ── */}
        <Card className="border-emerald-200 shadow-lg bg-gradient-to-br from-emerald-50 to-lime-50">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Sprout className="w-6 h-6 text-emerald-700" />
              Recommendation Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!result && !loading && (
              <p className="text-gray-500 text-sm">
                Submit soil and climate values to receive a personalised crop recommendation.
              </p>
            )}

            {loading && (
              <div className="flex items-center gap-3 text-emerald-700 text-sm">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                Running model prediction…
              </div>
            )}

            {result && (
              <div className="space-y-5">
                {/* Primary recommendation */}
                <div className="p-4 rounded-xl bg-white border-2 border-emerald-300 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                      Best Match
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-emerald-800">{result.recommended_crop}</p>
                  <div className="mt-3">
                    <ConfidenceBar value={result.confidence} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Confidence: {confidencePercent}%
                  </p>
                </div>

                {/* Explanation */}
                {result.explanation && (
                  <div className="flex items-start gap-2 text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                    <span>{result.explanation}</span>
                  </div>
                )}

                {/* Alternative crops */}
                {result.alternatives && result.alternatives.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-2">Alternative Options</p>
                    <div className="space-y-2">
                      {result.alternatives.map((alt, i) => (
                        <div
                          key={alt.crop}
                          className="flex flex-col gap-1 bg-white rounded-lg px-4 py-3 border border-emerald-100"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-800 text-sm">
                              #{i + 2} {alt.crop}
                            </span>
                            <span className="text-xs text-emerald-700 font-semibold">
                              {(alt.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                          <ConfidenceBar value={alt.confidence} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
