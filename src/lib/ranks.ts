export interface RankDefinition {
  key: string
  threshold: number
  labelKey: string
  descriptionKey: string
  icon: 'Star' | 'Sparkles' | 'Crown'
  // network_points awarded once when this tier is first reached (see
  // claim_rank_bonus in
  // supabase/migrations/20260922150000_fix_voucher_points_and_reward_tiers.sql,
  // which is the actual source of truth — this is only for display).
  bonusPoints: number
}

// Thresholds are on PERSONALLY SPONSORED affiliates (profiles.sponsor_id),
// not on matrix-tree placement (matrix_nodes.parent_id). The two are
// different numbers in this compensation plan: the matrix is a fixed
// 5-wide structure with spillover, so a node's direct matrix children are
// capped at 5 regardless of how many people someone actually sponsored —
// using the matrix count here would make "Rising Star" (6) structurally
// unreachable. Ordered ascending; the loop in getCurrentRank relies on it.
export const RANKS: RankDefinition[] = [
  { key: 'rising_star', threshold: 6, labelKey: 'risingStar', descriptionKey: 'risingStarDesc', icon: 'Star', bonusPoints: 49 },
  { key: 'shining_star', threshold: 36, labelKey: 'shiningStar', descriptionKey: 'shiningStarDesc', icon: 'Sparkles', bonusPoints: 294 },
  { key: 'diamond_star', threshold: 108, labelKey: 'diamondStar', descriptionKey: 'diamondStarDesc', icon: 'Crown', bonusPoints: 900 },
]

/** Highest rank whose threshold has been reached, or null. */
export function getCurrentRank(directSponsorCount: number): RankDefinition | null {
  let current: RankDefinition | null = null
  for (const rank of RANKS) {
    if (directSponsorCount >= rank.threshold) current = rank
  }
  return current
}

/**
 * The highest achieved rank that isn't in `seenKeys` yet — the one the
 * congrats popup should show. If someone jumps straight past an
 * intermediate rank (e.g. adds enough referrals in one go to go from 0
 * straight to Diamond), only the highest newly-achieved rank is shown;
 * lower ones are marked seen too so they don't pop up afterwards.
 */
export function getNewlyAchievedRank(directSponsorCount: number, seenKeys: string[]): RankDefinition | null {
  const achieved = RANKS.filter((r) => directSponsorCount >= r.threshold && !seenKeys.includes(r.key))
  return achieved.length > 0 ? achieved[achieved.length - 1] : null
}

/**
 * Every achieved rank not yet in `claimedKeys` — unlike getNewlyAchievedRank
 * this returns ALL of them (not just the highest), because each tier's
 * bonus should be credited even if several were reached at once, and
 * separately from whether the congrats popup was ever shown for it.
 */
export function getUnclaimedRankBonuses(directSponsorCount: number, claimedKeys: string[]): RankDefinition[] {
  return RANKS.filter((r) => directSponsorCount >= r.threshold && !claimedKeys.includes(r.key))
}
