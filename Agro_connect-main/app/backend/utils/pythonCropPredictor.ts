import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { CropRecommendationInput, CropRecommendationResult } from '../models/cropRecommendationModel';

const resolveScriptPath = (): string => {
  const configured = process.env.PYTHON_SCRIPT_PATH?.trim();

  const candidates = [
    configured,
    // When running from source (backend/utils)
    path.resolve(__dirname, '../ml_model/predict_crop.py'),
    // When running compiled code (backend/dist/utils)
    path.resolve(__dirname, '../../ml_model/predict_crop.py'),
    // Render/runtime fallback from backend project root
    path.resolve(process.cwd(), 'ml_model/predict_crop.py'),
  ].filter((value): value is string => Boolean(value));

  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  if (existing) {
    return existing;
  }

  // Return the best default so error messages still show a meaningful target path.
  return candidates[0];
};

const SCRIPT_PATH = resolveScriptPath();
const platformCandidates = process.platform === 'win32'
  ? ['python', 'py']
  : ['python3', 'python'];

const PYTHON_CANDIDATES = [
  process.env.PYTHON_EXECUTABLE,
  ...platformCandidates,
].filter((value): value is string => Boolean(value));

const runPredictor = (
  executable: string,
  input: CropRecommendationInput
): Promise<CropRecommendationResult> => {
  const args = executable === 'py'
    ? ['-3', SCRIPT_PATH, JSON.stringify(input)]
    : [SCRIPT_PATH, JSON.stringify(input)];

  return new Promise((resolve, reject) => {
    const py = spawn(executable, args);
    const startTime = Date.now();

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    py.on('close', (code: number | null) => {
      if (code !== 0) {
        reject(
          new Error(
            `Crop predictor script failed with code ${code}. ${stderr || stdout}`
          )
        );
        return;
      }

      try {
        const response = JSON.parse(stdout.trim()) as CropRecommendationResult;
        console.log('[crop-predictor] python success', {
          executable,
          latencyMs: Date.now() - startTime,
          recommendedCrop: response.recommended_crop,
          confidence: response.confidence,
        });
        resolve(response);
      } catch (error) {
        reject(new Error(`Invalid predictor response: ${stdout}. ${(error as Error).message}`));
      }
    });

    py.on('error', (error: Error) => {
      reject(error);
    });
  });
};

export const predictCropWithPython = (
  input: CropRecommendationInput
): Promise<CropRecommendationResult> => {
  const attempts = [...PYTHON_CANDIDATES];

  const tryNext = (): Promise<CropRecommendationResult> => {
    const executable = attempts.shift();

    if (!executable) {
      return Promise.reject(
        new Error('Failed to run Python predictor. Configure PYTHON_EXECUTABLE or install Python on PATH.')
      );
    }

    return runPredictor(executable, input).catch((error: Error) => {
      console.warn('[crop-predictor] executable failed', {
        executable,
        error: error.message,
      });

      if (attempts.length === 0) {
        throw new Error(`Failed to run Python predictor: ${error.message}`);
      }
      return tryNext();
    });
  };

  return tryNext();
};
