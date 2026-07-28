import {
  countLogs,
  getAllFeatures,
  getAllLogs,
  getAllPredictions,
  getDb,
  getSettings,
  insertLogs,
  markTrained,
  replaceFeatures,
  replacePredictions,
  saveSettings,
} from './db';import { extractFeatures, trainAndPredict } from './analysis';
import { generateSampleLogs } from './sample-data';
import type { LogEvent, ModelSettings, Prediction } from './types';

// Ensure the database has sample data on first run.
export async function ensureSampleData(): Promise<boolean> {
  const existing = await countLogs();
  if (existing > 0) return false;

  const logs = generateSampleLogs(100, 50, 42);
  await insertLogs(logs);
  await runAnalysis();
  return true;
}

export async function runAnalysis(): Promise<void> {
  const settings = await getSettings();
  const logs = await getAllLogs();
  const features = extractFeatures(logs);
  await replaceFeatures(features);

  const { predictions, trainedAt } = trainAndPredict(features, settings);
  await replacePredictions(predictions);
  await markTrained(trainedAt);
}

export async function retrainModel(): Promise<void> {
  await runAnalysis();
}

export { getSettings };

export async function updateSettings(s: ModelSettings): Promise<void> {
  await saveSettings(s);
  await runAnalysis();
}

export async function ingestLogs(events: LogEvent[]): Promise<void> {
  await insertLogs(events);
  await runAnalysis();
}

export async function getPredictions(): Promise<Prediction[]> {
  return getAllPredictions();
}

export async function bootstrap(): Promise<void> {
  await getDb();
  await ensureSampleData();
}
