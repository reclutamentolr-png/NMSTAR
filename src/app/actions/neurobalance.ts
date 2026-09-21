'use server'

import { awardToolPoint } from '@/lib/toolPoints'

export async function awardNeurobalancePoint() {
  await awardToolPoint('neurobalance')
}
