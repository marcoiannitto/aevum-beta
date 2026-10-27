-- Fix historical daily_logs where phase was incorrectly stamped as 'aevum'
-- (a program ID, not a valid phase key).
--
-- Uses each user's profile fields to compute the correct phase
-- based on the stored day number.
--
-- Run this in the Cloudflare D1 console ONCE after deploying the code fix.
-- Safe to re-run (only touches rows where phase = 'aevum').

UPDATE daily_logs
SET phase = CASE
  WHEN day <= (SELECT COALESCE(loading_days, 2) FROM users WHERE users.id = daily_logs.user_id)
    THEN 'loading'
  WHEN day <= (
    SELECT COALESCE(loading_days, 2) + COALESCE(activation_days, 14)
    FROM users WHERE users.id = daily_logs.user_id
  )
    THEN 'activation'
  WHEN day <= (
    SELECT COALESCE(loading_days, 2) + COALESCE(activation_days, 14) + COALESCE(transition_days, 14)
    FROM users WHERE users.id = daily_logs.user_id
  )
    THEN 'transition'
  WHEN day <= (
    SELECT COALESCE(loading_days, 2) + COALESCE(activation_days, 14)
         + COALESCE(transition_days, 14) + COALESCE(stabilization_days, 14)
    FROM users WHERE users.id = daily_logs.user_id
  )
    THEN 'stabilization'
  ELSE 'maintenance'
END
WHERE phase = 'aevum';
