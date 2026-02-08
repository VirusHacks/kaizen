/**
 * Delivery Engine Constants
 * 
 * Centralized configuration for Monte Carlo simulation and delivery predictions.
 * Adjust these values based on your team's historical data.
 */

// ==========================================
// SIMULATION SETTINGS
// ==========================================

/** Default number of Monte Carlo simulation runs */
export const DEFAULT_SIMULATION_RUNS = 10000;

/** Prediction validity period in days */
export const PREDICTION_VALIDITY_DAYS = 7;

// ==========================================
// VELOCITY DEFAULTS
// ==========================================

/** Default story points per sprint when no historical data exists */
export const DEFAULT_VELOCITY = 20;

/** Default velocity standard deviation */
export const DEFAULT_VELOCITY_STDDEV = 5;

/** Number of weeks of velocity history to consider */
export const VELOCITY_HISTORY_WEEKS = 12;

// ==========================================
// TASK ESTIMATION DEFAULTS
// ==========================================

/** Default hours per task when no estimate provided */
export const DEFAULT_TASK_HOURS = 8;

/** Default hours per week per team member */
export const DEFAULT_HOURS_PER_WEEK = 40;

/** Default team utilization rate (0-1) */
export const DEFAULT_UTILIZATION_RATE = 0.75;

/** Default burnout risk (0-1) */
export const DEFAULT_BURNOUT_RISK = 0.2;

// ==========================================
// DEPENDENCY IMPACT
// ==========================================

/** Delay per dependency (min multiplier) */
export const DEPENDENCY_DELAY_MIN = 0.05;

/** Delay per dependency (max additional multiplier) */
export const DEPENDENCY_DELAY_RANGE = 0.10;

/** External dependency weeks (min) */
export const EXTERNAL_DEP_WEEKS_MIN = 1;

/** External dependency weeks (range) */
export const EXTERNAL_DEP_WEEKS_RANGE = 1;

// ==========================================
// BURNOUT & CAPACITY
// ==========================================

/** Max velocity reduction from burnout (30%) */
export const BURNOUT_MAX_IMPACT = 0.3;

// ==========================================
// CONFIDENCE THRESHOLDS
// ==========================================

/** Spread (weeks) for LOW confidence */
export const CONFIDENCE_LOW_THRESHOLD = 8;

/** Spread (weeks) for MEDIUM confidence */
export const CONFIDENCE_MEDIUM_THRESHOLD = 4;

/** Spread (weeks) for HIGH confidence */
export const CONFIDENCE_HIGH_THRESHOLD = 2;

// ==========================================
// WHAT-IF SCENARIO SETTINGS
// ==========================================

/** New developer velocity effectiveness (accounts for ramp-up) */
export const NEW_DEV_VELOCITY_FACTOR = 0.8;

/** Overtime effectiveness (productivity drops with long hours) */
export const OVERTIME_EFFECTIVENESS = 0.7;

/** Average developer monthly cost for cost impact calculations */
export const AVG_DEVELOPER_MONTHLY_COST = 10000;

/** Assumed months a new developer works for cost calculations */
export const AVG_PROJECT_MONTHS = 3;
