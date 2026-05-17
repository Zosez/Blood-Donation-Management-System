-- LifeLink Gamification Migration
-- File: scripts/004_gamification.sql
-- Run once against lifelink_db

-- ── 1. Badges definition table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badges (
    id          VARCHAR(50)  PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    icon        VARCHAR(10)  NOT NULL,
    unlocks_at  INT          NOT NULL  -- donation count threshold
);

-- ── 2. Seed the 6 badge definitions ────────────────────────────────────────
INSERT IGNORE INTO badges (id, name, description, icon, unlocks_at) VALUES
  ('first_drop',         'First Drop',       'Awarded for your very first confirmed donation.',         '🩸', 1),
  ('life_saver_5',       'Life Saver',        'You have saved up to 15 lives — keep it up!',            '❤️', 5),
  ('dedicated_donor_10', 'Dedicated Donor',   'Double digits! You are a true dedicated donor.',         '⭐', 10),
  ('gold_heart_15',      'Gold Heart',        'Fifteen donations — your heart is pure gold.',           '💛', 15),
  ('champion_25',        'Champion Donor',    'Twenty-five donations — a true blood donation champion.','🏅', 25),
  ('platinum_legend_30', 'Platinum Legend',   'Thirty donations — you have reached legendary status.',  '🏆', 30);

-- ── 3. User badges earned table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_badges (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT         NOT NULL,
    badge_id   VARCHAR(50) NOT NULL,
    awarded_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_badge (user_id, badge_id),          -- idempotency guard
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
    INDEX idx_ub_user_id (user_id)
);

-- ── 4. Add tier column to users (safe migration) ───────────────────────────
-- Stores computed tier so profile reads are cheap (no re-aggregation on every GET)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS donor_tier
    ENUM('Bronze','Silver','Gold','Platinum') DEFAULT 'Bronze';
