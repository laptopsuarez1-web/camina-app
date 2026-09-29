// Tipos escritos a mano, en espejo de supabase/migrations/0001_init.sql.
// Cuando el proyecto Supabase esté provisionado, reemplazar por:
//   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts

export type BusinessPlan = 'primer_paso' | 'paso_firme' | 'paso_adelante';
export type BenefitType = 'gratis' | 'descuento';
export type RedemptionStatus = 'pending' | 'confirmed' | 'expired' | 'cancelled';
export type PointsReason = 'steps' | 'referral' | 'challenge' | 'redemption';

export interface Profile {
  id: string;
  full_name: string;
  zone: string | null;
  interests: string[];
  photo_url: string | null;
  daily_goal: number;
  ranking_visible: boolean;
  dark_mode: boolean;
  referred_by: string | null;
  terms_accepted_at: string | null;
  birth_date?: string | null;
  created_at: string;
}

export interface Business {
  id: string;
  owner_user_id: string | null;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  google_review_url?: string | null;
  phone: string | null;
  instagram: string | null;
  hours_text: string | null;
  opening_hours?: Record<string, { from: string; to: string } | null> | null;
  lat: number | null;
  lng: number | null;
  logo_url: string | null;
  cover_url: string | null;
  website: string | null;
  plan: BusinessPlan;
  approved: boolean;
  is_virtual: boolean;
  promo_video_url: string | null;
  ad_eligible: boolean;
  plan_started_at: string;
  pending_plan: BusinessPlan | null;
  created_at: string;
}

export interface Benefit {
  id: string;
  business_id: string;
  name: string;
  type: BenefitType;
  discount_detail: string | null;
  discount_percent: number | null;
  cost_points: number;
  daily_quota: number | null;
  active: boolean;
  image_url: string | null;
  dine_in_only: boolean;
  valid_from: string | null;
  valid_to: string | null;
  valid_days_mask: number;
  created_at: string;
}

export interface StepsDaily {
  user_id: string;
  day: string;
  steps: number;
  source: string;
  updated_at: string;
}

export interface PointsLedgerEntry {
  id: string;
  user_id: string;
  amount: number;
  reason: PointsReason;
  ref_day: string | null;
  earned_at: string;
  expires_at: string | null;
}

export interface Redemption {
  id: string;
  user_id: string;
  benefit_id: string;
  business_id: string;
  cost_points: number;
  code: string;
  code_expires_at: string;
  status: RedemptionStatus;
  extra_consumption: boolean | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string | null;
  challenge_target: number;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  joined_at: string;
}

export interface GroupNote {
  id: string;
  group_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  created_at: string;
  updated_at: string;
}

// supabase-js v2 exige esta forma exacta (Row/Insert/Update/Relationships) para
// poder inferir tipos en .from(...).select()/.insert()/.update(). Relationships
// queda vacío porque acá no describimos joins automáticos vía FK hints.
type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & { id: string }, Partial<Profile>>;
      businesses: Table<Business, Partial<Business>>;
      benefits: Table<Benefit, Partial<Benefit>>;
      steps_daily: Table<StepsDaily, Partial<StepsDaily>>;
      points_ledger: Table<PointsLedgerEntry, Partial<PointsLedgerEntry>, Partial<PointsLedgerEntry>>;
      redemptions: Table<Redemption, Partial<Redemption>, Partial<Redemption>>;
      groups: Table<Group, Partial<Group>>;
      group_members: Table<GroupMember, Partial<GroupMember>, Partial<GroupMember>>;
      group_notes: Table<GroupNote, Partial<GroupNote>, Partial<GroupNote>>;
      push_tokens: Table<PushToken, Partial<PushToken>, Partial<PushToken>>;
    };
    Views: {
      public_profiles: {
        Row: Pick<Profile, 'id' | 'full_name' | 'photo_url'>;
        Relationships: [];
      };
    };
    Functions: {
      user_points_balance: { Args: { p_user_id: string }; Returns: number };
      earn_points_from_steps: {
        Args: { p_user_id: string; p_day: string; p_steps: number };
        Returns: number;
      };
      redeem_benefit: { Args: { p_benefit_id: string }; Returns: Redemption };
      regenerate_redemption_code: { Args: { p_redemption_id: string }; Returns: Redemption };
      confirm_redemption_code: {
        Args: { p_business_id: string; p_code: string };
        Returns: Redemption;
      };
      cancel_expired_redemption: { Args: { p_redemption_id: string }; Returns: Redemption };
      capture_referral: { Args: { p_referrer_id: string }; Returns: void };
      group_member_count: { Args: { p_group_id: string }; Returns: number };
      global_weekly_ranking: {
        Args: { p_limit?: number };
        Returns: { user_id: string; full_name: string; photo_url: string | null; total_steps: number }[];
      };
      community_weekly_average: { Args: Record<string, never>; Returns: number };
      benefits_remaining_today: {
        Args: Record<string, never>;
        Returns: { benefit_id: string; redeemed_today: number }[];
      };
      register_push_token: { Args: { p_token: string; p_platform: string }; Returns: void };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
