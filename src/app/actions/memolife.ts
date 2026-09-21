'use server'

import { awardToolPoint } from '@/lib/toolPoints'

export async function awardMemolifePoint() {
  await awardToolPoint('memolife')
}
