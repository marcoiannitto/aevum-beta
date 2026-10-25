// v.1.0.1 2026-10-25 -- #69 fix timezone (SGT), preserve kcal null, add debug fields
/**
 * Queries all active users' profiles, recent logs, and phase configs,
 * then computes per-user calorie status via @aevum/shared.
 */

import {
  computeClientCalories,
  type CalorieProfile,
  type CalorieLog,
  type CaloriePhaseConfig,
  type ClientCalorieStatus,
} from '@aevum/shared';

/** Get today's date in Asia/Singapore timezone */
function todaySGT(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Singapore' });
}

export async function adminClientCalories(db: D1Database): Promise<{
  clients: ClientCalorieStatus[];
  today: string;
}> {
  const today = todaySGT();

  // Fetch all active program users, all phase configs, and recent logs in parallel
  const [usersRes, phasesRes, logsRes] = await Promise.all([
    db.prepare(
      `SELECT id, name, sex, dob, age, height, start_weight, activity,
              program_id, start_date, activation_days, loading_days,
              transition_days, stabilization_days, phase_mode,
              current_target_kcal
       FROM users
       WHERE program = 1
       ORDER BY name`
    ).all<any>(),

    db.prepare(`SELECT * FROM phases`).all<any>(),

    // Last 14 days of logs for all users (covers bank window + rolling weight)
    db.prepare(
      `SELECT user_id, day, date, phase, weight, kcal, day_json
       FROM daily_logs
       WHERE date >= date(?, '-14 days')
       ORDER BY user_id, day DESC`
    ).bind(today).all<any>(),
  ]);

  const users = (usersRes.results || []) as CalorieProfile[];
  const phases = (phasesRes.results || []) as CaloriePhaseConfig[];

  // Group logs by user_id, preserve kcal null
  const logsByUser = new Map<string, CalorieLog[]>();
  for (const row of (logsRes.results || [])) {
    const uid = row.user_id as string;
    if (!logsByUser.has(uid)) logsByUser.set(uid, []);
    logsByUser.get(uid)!.push({
      day: row.day,
      date: row.date,
      phase: row.phase,
      weight: row.weight,
      kcal: row.kcal,
      day_json: row.day_json,
    });
  }

  // Compute per-user
  const clients: ClientCalorieStatus[] = [];
  for (const user of users) {
    const userLogs = logsByUser.get(user.id) || [];
    clients.push(computeClientCalories(user, userLogs, phases, today));
  }

  return { clients, today };
}
