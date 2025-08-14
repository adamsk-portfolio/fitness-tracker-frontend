export type GoalMetric = "duration" | "calories" | "sessions";
export type GoalPeriod = "weekly" | "monthly" | "yearly";

export type GoalStatus = "active" | "achieved" | "overdue" | "future";

export interface ProgressWindow {
  start: string;
  end: string;
}

export interface GoalProgress {
  value: number;
  target: number;
  percent: number;
  remaining: number;
  status: GoalStatus;
  window: ProgressWindow;
}

export interface Goal {
  id: number;
  description: string;
  target_value: number;
  period: GoalPeriod;
  metric: GoalMetric;
  start_date: string | null;
  end_date: string | null;
  exercise_type_id: number | null;
  exercise_type: string | null;
  progress?: GoalProgress;
}
