'use server'

import { createClient } from '@/lib/supabase/server'
import { hasActiveToolAccess } from '@/lib/subscriptionGate'
import { awardToolPoint } from '@/lib/toolPoints'
import { loadMenuData } from '@/lib/menu-server'
import { cleanLocalized, isMenuLocale, MENU_DIET_TAGS, MENU_LOCALES, type LocalizedText, type MenuData, type MenuDietTag, type MenuLocale } from '@/lib/menu'

type MenuResult = { success: true; data: MenuData } | { success: false; message: string }

const MAX_CATEGORIES = 40
const MAX_ITEMS = 400

// Ogni azione: utente collegato + strumento "menu" utilizzabile (piano Pro).
async function gate() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'notLoggedIn' }
  if (!(await hasActiveToolAccess(supabase, user.id, 'menu'))) return { ok: false as const, message: 'proRequired' }
  return { ok: true as const, supabase, userId: user.id }
}

async function myMenuId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase.from('menus').select('id').eq('owner_id', userId).maybeSingle()
  return data?.id ?? null
}

async function done(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<MenuResult> {
  await awardToolPoint('menu')
  return { success: true, data: await loadMenuData(supabase, userId) }
}

export async function saveMenuSettings(input: {
  restaurantName: string
  tagline: string
  defaultLocale: MenuLocale
  languages: MenuLocale[]
  isActive: boolean
}): Promise<MenuResult> {
  const g = await gate()
  if (!g.ok) return { success: false, message: g.message }

  const restaurantName = input.restaurantName.trim().slice(0, 80)
  if (!restaurantName) return { success: false, message: 'nameRequired' }
  const defaultLocale = isMenuLocale(input.defaultLocale) ? input.defaultLocale : 'it'
  const languages = MENU_LOCALES.filter((l) => l === defaultLocale || input.languages.includes(l))
  const fields = {
    restaurant_name: restaurantName,
    tagline: input.tagline.trim().slice(0, 140) || null,
    default_locale: defaultLocale,
    languages,
  }

  const menuId = await myMenuId(g.supabase, g.userId)
  const { error } = menuId
    ? await g.supabase
        .from('menus')
        .update({ ...fields, is_active: !!input.isActive, updated_at: new Date().toISOString() })
        .eq('id', menuId)
    : await g.supabase.from('menus').insert({ ...fields, owner_id: g.userId })
  if (error) return { success: false, message: 'saveError' }
  return done(g.supabase, g.userId)
}

export async function saveMenuCategory(input: { id?: string; names: LocalizedText }): Promise<MenuResult> {
  const g = await gate()
  if (!g.ok) return { success: false, message: g.message }
  const menuId = await myMenuId(g.supabase, g.userId)
  if (!menuId) return { success: false, message: 'saveError' }

  const names = cleanLocalized(input.names, 60)
  if (!Object.keys(names).length) return { success: false, message: 'nameRequired' }

  if (input.id) {
    const { error } = await g.supabase.from('menu_categories').update({ names }).eq('id', input.id).eq('menu_id', menuId)
    if (error) return { success: false, message: 'saveError' }
  } else {
    const { count } = await g.supabase.from('menu_categories').select('id', { count: 'exact', head: true }).eq('menu_id', menuId)
    if ((count ?? 0) >= MAX_CATEGORIES) return { success: false, message: 'limitReached' }
    const { error } = await g.supabase.from('menu_categories').insert({ menu_id: menuId, names, position: count ?? 0 })
    if (error) return { success: false, message: 'saveError' }
  }
  return done(g.supabase, g.userId)
}

export async function deleteMenuCategory(id: string): Promise<MenuResult> {
  const g = await gate()
  if (!g.ok) return { success: false, message: g.message }
  const { error } = await g.supabase.from('menu_categories').delete().eq('id', id)
  if (error) return { success: false, message: 'saveError' }
  return done(g.supabase, g.userId)
}

export async function saveMenuItem(input: {
  id?: string
  categoryId: string
  name: string
  names: LocalizedText
  descriptions: LocalizedText
  price: number | null
  dietTags: MenuDietTag[]
  available: boolean
  isDailySpecial: boolean
}): Promise<MenuResult> {
  const g = await gate()
  if (!g.ok) return { success: false, message: g.message }
  const menuId = await myMenuId(g.supabase, g.userId)
  if (!menuId) return { success: false, message: 'saveError' }

  const name = input.name.trim().slice(0, 120)
  if (!name) return { success: false, message: 'nameRequired' }
  const price = input.price === null || Number.isNaN(Number(input.price)) ? null : Math.round(Math.max(0, Number(input.price)) * 100) / 100
  const fields = {
    category_id: input.categoryId,
    name,
    names: cleanLocalized(input.names, 120),
    descriptions: cleanLocalized(input.descriptions, 400),
    price,
    diet_tags: MENU_DIET_TAGS.filter((tag) => input.dietTags.includes(tag)),
    available: !!input.available,
    is_daily_special: !!input.isDailySpecial,
  }

  if (input.id) {
    const { error } = await g.supabase
      .from('menu_items')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', input.id)
      .eq('menu_id', menuId)
    if (error) return { success: false, message: 'saveError' }
  } else {
    const { count } = await g.supabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('menu_id', menuId)
    if ((count ?? 0) >= MAX_ITEMS) return { success: false, message: 'limitReached' }
    const { count: inCategory } = await g.supabase
      .from('menu_items')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', input.categoryId)
    const { error } = await g.supabase.from('menu_items').insert({ ...fields, menu_id: menuId, position: inCategory ?? 0 })
    if (error) return { success: false, message: 'saveError' }
  }
  return done(g.supabase, g.userId)
}

export async function deleteMenuItem(id: string): Promise<MenuResult> {
  const g = await gate()
  if (!g.ok) return { success: false, message: g.message }
  const { error } = await g.supabase.from('menu_items').delete().eq('id', id)
  if (error) return { success: false, message: 'saveError' }
  return done(g.supabase, g.userId)
}

// Esaurito / piatto del giorno con un tocco.
export async function setMenuItemFlag(id: string, flag: 'available' | 'is_daily_special', value: boolean): Promise<MenuResult> {
  const g = await gate()
  if (!g.ok) return { success: false, message: g.message }
  if (flag !== 'available' && flag !== 'is_daily_special') return { success: false, message: 'saveError' }
  const { error } = await g.supabase
    .from('menu_items')
    .update({ [flag]: !!value, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, message: 'saveError' }
  return done(g.supabase, g.userId)
}

// Sposta su/giù una categoria o un piatto (riscrive le posizioni in ordine).
export async function moveMenuEntry(kind: 'category' | 'item', id: string, direction: -1 | 1): Promise<MenuResult> {
  const g = await gate()
  if (!g.ok) return { success: false, message: g.message }
  const data = await loadMenuData(g.supabase, g.userId)
  if (!data.menu) return { success: false, message: 'saveError' }

  const list =
    kind === 'category'
      ? data.categories.map((c) => c.id)
      : (() => {
          const item = data.items.find((i) => i.id === id)
          return item ? data.items.filter((i) => i.category_id === item.category_id).map((i) => i.id) : []
        })()
  const index = list.indexOf(id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= list.length) return { success: true, data }
  ;[list[index], list[target]] = [list[target], list[index]]

  const table = kind === 'category' ? 'menu_categories' : 'menu_items'
  await Promise.all(list.map((entryId, position) => g.supabase.from(table).update({ position }).eq('id', entryId)))
  return { success: true, data: await loadMenuData(g.supabase, g.userId) }
}
