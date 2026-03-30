export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'owner' | 'designer' | 'staff'
export type MemberStatus = 'pending' | 'active' | 'revoked'
export type LaborMode = 'percentage' | 'hourly'
export type FeeType = 'flat' | 'percentage'
export type PricingMode = 'build_up' | 'work_back'
export type RecipeStatus = 'draft' | 'active' | 'archived'
export type EventStatus = 'to_do' | 'in_progress' | 'ordered' | 'complete'
export type ItemUnit = 'stem' | 'bunch' | 'box' | 'each' | 'yard' | 'foot'
export type HardGoodCategory = 'container' | 'foam' | 'ribbon' | 'wire' | 'packaging' | 'other'
export type RecipeItemType = 'flower' | 'hard_good' | 'rental' | 'misc'
export type EventItemType = 'hard_good' | 'rental' | 'misc'
export type EventType =
  | 'bridal_bouquet' | 'bridesmaid_bouquet' | 'toss_bouquet' | 'boutonniere' | 'corsage'
  | 'centerpiece_low' | 'centerpiece_tall' | 'ceremony_arch' | 'altar_arrangement'
  | 'aisle_arrangement' | 'pew_marker' | 'ceremony_backdrop' | 'welcome_arrangement'
  | 'cocktail_arrangement' | 'sweetheart_table' | 'cake_flowers' | 'reception_table'
  | 'hanging_installation' | 'bud_vase_cluster' | 'bar_arrangement' | 'other'

export interface Database {
  public: {
    Tables: {
      studios: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          currency_symbol: string
          timezone: string
          invite_code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          currency_symbol?: string
          timezone?: string
          invite_code?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['studios']['Insert']>
        Relationships: []
      }
      studio_members: {
        Row: {
          id: string
          studio_id: string
          user_id: string | null
          role: UserRole
          invited_email: string | null
          status: MemberStatus
          created_at: string
          last_active_at: string | null
        }
        Insert: {
          id?: string
          studio_id: string
          user_id?: string | null
          role: UserRole
          invited_email?: string | null
          status?: MemberStatus
          created_at?: string
          last_active_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['studio_members']['Insert']>
        Relationships: [
          { foreignKeyName: 'studio_members_studio_id_fkey'; columns: ['studio_id']; isOneToOne: false; referencedRelation: 'studios'; referencedColumns: ['id'] }
        ]
      }
      studio_settings: {
        Row: {
          id: string
          studio_id: string
          default_flower_markup: number
          default_hardgoods_markup: number
          default_rental_markup: number
          default_labor_mode: LaborMode
          default_design_fee_pct: number
          default_prep_rate: number
          default_design_rate: number
          default_delivery_fee: number
          default_setup_fee: number
          default_teardown_fee: number
          default_delivery_fee_type: FeeType
          default_setup_fee_type: FeeType
          default_teardown_fee_type: FeeType
          default_tax_rate: number
          default_margin_target: number
          default_waste_buffer_pct: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          studio_id: string
          default_flower_markup?: number
          default_hardgoods_markup?: number
          default_rental_markup?: number
          default_labor_mode?: LaborMode
          default_design_fee_pct?: number
          default_prep_rate?: number
          default_design_rate?: number
          default_delivery_fee?: number
          default_setup_fee?: number
          default_teardown_fee?: number
          default_delivery_fee_type?: FeeType
          default_setup_fee_type?: FeeType
          default_teardown_fee_type?: FeeType
          default_tax_rate?: number
          default_margin_target?: number
          default_waste_buffer_pct?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['studio_settings']['Insert']>
        Relationships: [
          { foreignKeyName: 'studio_settings_studio_id_fkey'; columns: ['studio_id']; isOneToOne: true; referencedRelation: 'studios'; referencedColumns: ['id'] }
        ]
      }
      flowers: {
        Row: {
          id: string
          studio_id: string
          name: string
          variety: string | null
          color_name: string | null
          color_hex: string | null
          unit: ItemUnit
          stems_per_bunch: number
          wholesale_cost_per_stem: number
          supplier: string | null
          notes: string | null
          image_url: string | null
          seasonal_months: number[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          studio_id: string
          name: string
          variety?: string | null
          color_name?: string | null
          color_hex?: string | null
          unit?: ItemUnit
          stems_per_bunch?: number
          wholesale_cost_per_stem?: number
          supplier?: string | null
          notes?: string | null
          image_url?: string | null
          seasonal_months?: number[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['flowers']['Insert']>
        Relationships: [
          { foreignKeyName: 'flowers_studio_id_fkey'; columns: ['studio_id']; isOneToOne: false; referencedRelation: 'studios'; referencedColumns: ['id'] }
        ]
      }
      hard_goods: {
        Row: {
          id: string
          studio_id: string
          name: string
          category: HardGoodCategory
          unit: ItemUnit
          wholesale_cost: number
          supplier: string | null
          notes: string | null
          image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          studio_id: string
          name: string
          category?: HardGoodCategory
          unit?: ItemUnit
          wholesale_cost?: number
          supplier?: string | null
          notes?: string | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['hard_goods']['Insert']>
        Relationships: [
          { foreignKeyName: 'hard_goods_studio_id_fkey'; columns: ['studio_id']; isOneToOne: false; referencedRelation: 'studios'; referencedColumns: ['id'] }
        ]
      }
      rentals: {
        Row: {
          id: string
          studio_id: string
          name: string
          acquisition_cost: number
          times_used: number
          notes: string | null
          image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          studio_id: string
          name: string
          acquisition_cost?: number
          times_used?: number
          notes?: string | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['rentals']['Insert']>
        Relationships: [
          { foreignKeyName: 'rentals_studio_id_fkey'; columns: ['studio_id']; isOneToOne: false; referencedRelation: 'studios'; referencedColumns: ['id'] }
        ]
      }
      recipes: {
        Row: {
          id: string
          studio_id: string
          name: string
          event_type: EventType | null
          description: string | null
          flower_markup: number | null
          hardgoods_markup: number | null
          rental_markup: number | null
          labor_mode: LaborMode | null
          design_fee_pct: number | null
          prep_hours: number
          prep_rate: number | null
          design_hours: number
          design_rate: number | null
          pricing_mode: PricingMode
          target_retail_price: number | null
          status: RecipeStatus
          is_template: boolean
          style_tags: string[]
          share_token: string | null
          share_token_active: boolean
          notes: string | null
          moodboard_url: string | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          studio_id: string
          name: string
          event_type?: EventType | null
          description?: string | null
          flower_markup?: number | null
          hardgoods_markup?: number | null
          rental_markup?: number | null
          labor_mode?: LaborMode | null
          design_fee_pct?: number | null
          prep_hours?: number
          prep_rate?: number | null
          design_hours?: number
          design_rate?: number | null
          pricing_mode?: PricingMode
          target_retail_price?: number | null
          status?: RecipeStatus
          is_template?: boolean
          style_tags?: string[] | null
          share_token?: string | null
          share_token_active?: boolean
          notes?: string | null
          moodboard_url?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['recipes']['Insert']>
        Relationships: [
          { foreignKeyName: 'recipes_studio_id_fkey'; columns: ['studio_id']; isOneToOne: false; referencedRelation: 'studios'; referencedColumns: ['id'] }
        ]
      }
      recipe_items: {
        Row: {
          id: string
          recipe_id: string
          item_type: RecipeItemType
          flower_id: string | null
          hard_good_id: string | null
          rental_id: string | null
          item_name: string
          item_variety: string | null
          item_color_name: string | null
          item_color_hex: string | null
          item_unit: ItemUnit | null
          item_image_url: string | null
          wholesale_cost_snapshot: number
          quantity: number
          notes: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          item_type: RecipeItemType
          flower_id?: string | null
          hard_good_id?: string | null
          rental_id?: string | null
          item_name: string
          item_variety?: string | null
          item_color_name?: string | null
          item_color_hex?: string | null
          item_unit?: ItemUnit | null
          item_image_url?: string | null
          wholesale_cost_snapshot?: number
          quantity?: number
          notes?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['recipe_items']['Insert']>
        Relationships: [
          { foreignKeyName: 'recipe_items_recipe_id_fkey'; columns: ['recipe_id']; isOneToOne: false; referencedRelation: 'recipes'; referencedColumns: ['id'] },
          { foreignKeyName: 'recipe_items_flower_id_fkey'; columns: ['flower_id']; isOneToOne: false; referencedRelation: 'flowers'; referencedColumns: ['id'] }
        ]
      }
      events: {
        Row: {
          id: string
          studio_id: string
          name: string
          client_name: string | null
          event_date: string | null
          venue: string | null
          recipe_status: EventStatus
          delivery_fee: number | null
          setup_fee: number | null
          teardown_fee: number | null
          delivery_fee_type: FeeType | null
          setup_fee_type: FeeType | null
          teardown_fee_type: FeeType | null
          tax_rate: number | null
          margin_target: number | null
          notes: string | null
          is_template: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          studio_id: string
          name: string
          client_name?: string | null
          event_date?: string | null
          venue?: string | null
          recipe_status?: EventStatus
          delivery_fee?: number | null
          setup_fee?: number | null
          teardown_fee?: number | null
          delivery_fee_type?: FeeType | null
          setup_fee_type?: FeeType | null
          teardown_fee_type?: FeeType | null
          tax_rate?: number | null
          margin_target?: number | null
          notes?: string | null
          is_template?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['events']['Insert']>
        Relationships: [
          { foreignKeyName: 'events_studio_id_fkey'; columns: ['studio_id']; isOneToOne: false; referencedRelation: 'studios'; referencedColumns: ['id'] }
        ]
      }
      event_items: {
        Row: {
          id: string
          event_id: string
          item_type: EventItemType
          hard_good_id: string | null
          rental_id: string | null
          item_name: string
          item_unit: ItemUnit | null
          item_image_url: string | null
          wholesale_cost_snapshot: number
          quantity: number
          notes: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          item_type: EventItemType
          hard_good_id?: string | null
          rental_id?: string | null
          item_name: string
          item_unit?: ItemUnit | null
          item_image_url?: string | null
          wholesale_cost_snapshot?: number
          quantity?: number
          notes?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['event_items']['Insert']>
        Relationships: [
          { foreignKeyName: 'event_items_event_id_fkey'; columns: ['event_id']; isOneToOne: false; referencedRelation: 'events'; referencedColumns: ['id'] }
        ]
      }
      event_quote_items: {
        Row: {
          id: string
          event_id: string
          category: string
          item_name: string
          quantity: number
          unit_price: number
          fee_type: 'flat' | 'percentage' | null
          notes: string | null
          sort_order: number
          recipe_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          category?: string
          item_name: string
          quantity?: number
          unit_price?: number
          fee_type?: 'flat' | 'percentage' | null
          notes?: string | null
          sort_order?: number
          recipe_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['event_quote_items']['Insert']>
        Relationships: [
          { foreignKeyName: 'event_quote_items_event_id_fkey'; columns: ['event_id']; isOneToOne: false; referencedRelation: 'events'; referencedColumns: ['id'] },
          { foreignKeyName: 'event_quote_items_recipe_id_fkey'; columns: ['recipe_id']; isOneToOne: false; referencedRelation: 'recipes'; referencedColumns: ['id'] }
        ]
      }
      event_recipes: {
        Row: {
          id: string
          event_id: string
          recipe_id: string
          quantity: number
          override_retail_price: number | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          recipe_id: string
          quantity?: number
          override_retail_price?: number | null
          sort_order?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['event_recipes']['Insert']>
        Relationships: [
          { foreignKeyName: 'event_recipes_event_id_fkey'; columns: ['event_id']; isOneToOne: false; referencedRelation: 'events'; referencedColumns: ['id'] },
          { foreignKeyName: 'event_recipes_recipe_id_fkey'; columns: ['recipe_id']; isOneToOne: false; referencedRelation: 'recipes'; referencedColumns: ['id'] }
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      get_my_studio_id: {
        Args: Record<string, never>
        Returns: string
      }
      get_my_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
      create_studio: {
        Args: {
          p_name: string
          p_currency_symbol: string
          p_user_id: string
          p_user_email: string
        }
        Returns: string
      }
    }
    Enums: {
      user_role: UserRole
      member_status: MemberStatus
      labor_mode: LaborMode
      pricing_mode: PricingMode
      recipe_status: RecipeStatus
      event_status: EventStatus
      item_unit: ItemUnit
      hard_good_category: HardGoodCategory
      recipe_item_type: RecipeItemType
      event_type: EventType
    }
  }
}

// Convenience row types
export type Studio = Database['public']['Tables']['studios']['Row']
export type StudioMember = Database['public']['Tables']['studio_members']['Row']
export type StudioSettings = Database['public']['Tables']['studio_settings']['Row']
export type Flower = Database['public']['Tables']['flowers']['Row']
export type HardGood = Database['public']['Tables']['hard_goods']['Row']
export type Rental = Database['public']['Tables']['rentals']['Row']
export type Recipe = Database['public']['Tables']['recipes']['Row']
export type RecipeItem = Database['public']['Tables']['recipe_items']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type EventRecipe = Database['public']['Tables']['event_recipes']['Row']
export type EventItem = Database['public']['Tables']['event_items']['Row']
export type EventQuoteItem = Database['public']['Tables']['event_quote_items']['Row']
