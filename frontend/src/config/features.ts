export const FEATURES = {
  RESUME_UPLOAD: true,
  REMOTEOK: true,
  DATE_FILTER: true,
  EXPERIENCE_FILTER: true,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(feature: FeatureKey): boolean {
  return FEATURES[feature];
}

