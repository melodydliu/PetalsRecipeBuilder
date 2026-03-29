import { getMember } from '@/lib/supabase/get-member'
import { createAdminClient } from '@/lib/supabase/admin'
import { RecipeLibrary } from './RecipeLibrary'

export const metadata = { title: 'Recipes — Petal' }

async function getStudioData() {
  const { studioId, role } = await getMember()
  const admin = createAdminClient()

  const [{ data: recipes }, { data: settings }] = await Promise.all([
    admin
      .from('recipes')
      .select('*, recipe_items(item_color_hex, item_color_name, item_type)')
      .eq('studio_id', studioId)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false }),
    admin
      .from('studio_settings')
      .select('default_margin_target, default_flower_markup, default_hardgoods_markup, default_rental_markup, default_labor_mode, default_design_fee_pct')
      .eq('studio_id', studioId)
      .single(),
  ])

  return { recipes: recipes ?? [], settings, role }
}

export default async function RecipesPage() {
  const { recipes, settings, role } = await getStudioData()

  return (
    <div>
      <RecipeLibrary
        initialRecipes={recipes as Parameters<typeof RecipeLibrary>[0]['initialRecipes']}
        defaultMarginTarget={settings?.default_margin_target ?? 70}
        defaultFlowerMarkup={settings?.default_flower_markup ?? 3.5}
        defaultHardGoodsMarkup={settings?.default_hardgoods_markup ?? 2.5}
        role={role}
      />
    </div>
  )
}
