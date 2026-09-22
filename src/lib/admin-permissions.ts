export type Permission = 
  | '*' 
  | 'users.read' | 'users.write' | 'users.delete'
  | 'matrix.read' | 'matrix.write'
  | 'marketplace.read' | 'marketplace.write'
  | 'listings.read' | 'listings.write'
  | 'coupons.read' | 'coupons.write'
  | 'vouchers.read' | 'vouchers.write'
  | 'rewards.read' | 'rewards.write'
  | 'stats.read'
  | 'support.read' | 'support.write'
  | 'settings.read' | 'settings.write'

export function hasPermission(
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean {
  if (userPermissions.includes('*')) return true
  return userPermissions.includes(requiredPermission)
}