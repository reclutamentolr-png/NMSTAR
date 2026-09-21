export interface FindoLocation {
  id: string
  parent_id: string | null
  name: string
  icon: string
}

export interface FindoLocationNode extends FindoLocation {
  children: FindoLocationNode[]
}

export function buildLocationTree(locations: FindoLocation[]): FindoLocationNode[] {
  const byId = new Map<string, FindoLocationNode>()
  locations.forEach((loc) => byId.set(loc.id, { ...loc, children: [] }))

  const roots: FindoLocationNode[] = []
  byId.forEach((node) => {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

// Full breadcrumb path for a location, e.g. "Casa Alba > Camera > Armadio".
export function buildBreadcrumb(locationId: string | null, locations: FindoLocation[]): string {
  if (!locationId) return ''
  const byId = new Map(locations.map((loc) => [loc.id, loc]))
  const path: string[] = []
  let current: FindoLocation | undefined = byId.get(locationId)
  const seen = new Set<string>()
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    path.unshift(current.name)
    current = current.parent_id ? byId.get(current.parent_id) : undefined
  }
  return path.join(' > ')
}

export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

export function validatePhotoFile(file: File): string | null {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
    return 'invalidPhotoType'
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return 'photoTooLarge'
  }
  return null
}

export function photoExtension(file: File): string {
  const fromName = file.name.split('.').pop()
  if (fromName && fromName.length <= 5) return fromName.toLowerCase()
  const fromType = file.type.split('/')[1]
  return fromType || 'jpg'
}

export interface FindoItemFormData {
  name: string
  locationId: string | null
  category: string
  tags: string[]
}
