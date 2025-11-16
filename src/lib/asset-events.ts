import { db } from '@/lib/db'

type AssetEventType = 'CHECK_OUT' | 'CHECK_IN' | 'SO_UPDATE'

interface CreateAssetEventArgs {
  assetId: string
  type: AssetEventType
  actor?: string | null
  checkoutId?: string | null
  soSessionId?: string | null
  soAssetEntryId?: string | null
  payload?: Record<string, any> | null
}

export const recordAssetEvent = async ({
  assetId,
  type,
  actor,
  checkoutId,
  soSessionId,
  soAssetEntryId,
  payload,
}: CreateAssetEventArgs) => {
  const serializedPayload =
    payload && Object.keys(payload).length > 0 ? JSON.stringify(payload) : null

  return db.assetEvent.create({
    data: {
      assetId,
      type,
      actor: actor ?? null,
      checkoutId: checkoutId ?? null,
      soSessionId: soSessionId ?? null,
      soAssetEntryId: soAssetEntryId ?? null,
      payload: serializedPayload,
    },
  })
}

type SoComparableEntry = {
  tempName?: string | null
  tempStatus?: string | null
  tempSerialNo?: string | null
  tempPic?: string | null
  tempBrand?: string | null
  tempModel?: string | null
  tempCost?: any
  tempNotes?: string | null
  isIdentified?: boolean | null
}

const compareValues = (before: any, after: any) => {
  if (before === null || before === undefined) {
    return after !== null && after !== undefined
  }
  if (after === null || after === undefined) {
    return true
  }
  return JSON.stringify(before) !== JSON.stringify(after)
}

export const buildSOChanges = (
  before: SoComparableEntry,
  after: SoComparableEntry
) => {
  const fields: Array<keyof SoComparableEntry> = [
    'tempName',
    'tempStatus',
    'tempSerialNo',
    'tempPic',
    'tempBrand',
    'tempModel',
    'tempCost',
    'tempNotes',
    'isIdentified',
  ]

  const changes: Array<{ field: string; before: any; after: any }> = []

  for (const field of fields) {
    if (compareValues(before[field], after[field])) {
      changes.push({
        field,
        before: before[field] ?? null,
        after: after[field] ?? null,
      })
    }
  }

  return changes
}
