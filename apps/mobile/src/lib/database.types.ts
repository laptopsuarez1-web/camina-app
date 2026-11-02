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
  nearby_alerts?: boolean;
  push_servicio?: boolean;
  city?: string;
  bio?: string | null;
  created_at: string;
}

export type StoryShareStatus = 'pending' | 'approved' | 'rejected';

export interface StoryShare {
  id: string;
  redemption_id: string;
  user_id: string;
  business_id: string;
  photo_path: string;
  instagram_handle: string;
  status: StoryShareStatus;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
}

export interface Business {
  // Premio que el local ofrece a quienes completan la tarjeta de fidelidad de Camina (null = no participa).
  loyalty_benefit_id?: string | null;
  id: string;
  owner_user_id: string | null;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  google_review_url?: string | null;
  city?: string;
  phone: string | null;
  instagram: string | null;
  facebook?: string | null;
  photos?: string[] | null;
  tiktok?: string | null;
  hours_text: string | null;
  opening_hours?: Record<string, { from: string; to: string; from2?: string; to2?: string } | null> | null;
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

export type OnlineChannel = 'whatsapp' | 'instagram' | 'facebook' | 'tiktok' | 'web';

export interface Benefit {
  id: string;
  business_id: string;
  name: string;
  type: BenefitType;
  description?: string | null;
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
  // Premio online (migración 0060): se cobra por WhatsApp / redes / web, con cupos totales y código de 7 días.
  online?: boolean;
  online_channel?: OnlineChannel | null;
  online_quota?: number | null;
  // Migración 0078: hay que reservar o coordinar por WhatsApp antes de ir (nota opcional).
  requires_booking?: boolean;
  booking_note?: string | null;
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

// Tarjeta de fidelidad de una persona en un local (RPC my_loyalty_cards).
// Tarjeta general de Camina (reemplaza a la tarjeta por local): 5 canjes confirmados en cualquier comercio = 1 premio a elegir.
export interface CaminaPrizeOption {
  benefit_id: string;
  benefit_name: string;
  description: string | null;
  image_url: string | null;
  discount_detail: string | null;
  discount_percent: number | null;
  dine_in_only: boolean;
  valid_from: string | null;
  valid_to: string | null;
  valid_days_mask: number;
  online: boolean;
  online_channel: string | null;
  business: {
    id: string;
    name: string;
    logo_url: string | null;
    category: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
    hours_text: string | null;
    opening_hours: unknown;
  };
}

export interface CaminaCard {
  stamps: number;
  goal: number;
  // Cuándo se completó y cuándo vence el premio (30 días después). Nulos mientras la tarjeta no está completa.
  completed_at: string | null;
  expires_at: string | null;
  chosen_benefit_id: string | null;
  options: CaminaPrizeOption[];
  history: { business_name: string; at: string }[];
  // Tarjetas anteriores: las que ya se completaron y se canjearon (used) o se vencieron sin canjear (expired).
  past: CaminaPastCard[];
}

export interface CaminaPastCard {
  completed_at: string;
  status: 'used' | 'expired';
  // Cuándo se canjeó (used) o cuándo venció (expired).
  closed_at: string;
  benefit_name: string | null;
  business_name: string | null;
  logo_url: string | null;
  category: string | null;
}


// Respuesta de redeem_with_local_code: o se canjeó, o dice por qué no (las reglas del canje salen como error aparte).
export type LocalCodeResult =
  | { ok: true; redemption: Redemption }
  | { ok: false; reason: 'codigo_incorrecto' | 'lejos' | 'sin_ubicacion' | 'sin_codigo'; distance_m?: number };

export interface Redemption {
  id: string;
  user_id: string;
  benefit_id: string;
  business_id: string;
  cost_points: number;
  points_charged?: boolean;
  loyalty_free?: boolean;
  new_place_bonus?: number;
  code: string;
  code_expires_at: string;
  status: RedemptionStatus;
  extra_consumption: boolean | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  confirmed_via?: 'panel' | 'local_code';
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string | null;
  challenge_target: number;
  invite_code: string;
  photo_url?: string | null;
  background?: string | null;
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

export interface RetoRow {
  id: string;
  title: string;
  description: string;
  kind: string;
  target: number;
  steps_threshold: number | null;
  reward_points: number;
  active: boolean;
  sort: number;
}

export interface CityRow {
  name: string;
  active: boolean;
  sort: number;
}

export interface ZoneRow {
  id: string;
  city: string;
  name: string;
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
// queda vacío porque aquí no describimos joins automáticos vía FK hints.
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
      story_shares: Table<StoryShare, Partial<StoryShare>, Partial<StoryShare>>;
      groups: Table<Group, Partial<Group>>;
      group_members: Table<GroupMember, Partial<GroupMember>, Partial<GroupMember>>;
      group_notes: Table<GroupNote, Partial<GroupNote>, Partial<GroupNote>>;
      push_tokens: Table<PushToken, Partial<PushToken>, Partial<PushToken>>;
      retos: Table<RetoRow, Partial<RetoRow>>;
      group_challenges: Table<Record<string, unknown> & { id: string }, Record<string, unknown>>;
      group_challenge_entries: Table<{ challenge_id: string; user_id: string; stake_paid: number }, Record<string, unknown>>;
      group_weekly_results: Table<{ group_id: string; week_start: string; user_id: string; steps: number; goal_days: number; rank: number }, { group_id: string }>;
      user_blocks: Table<{ blocker_id: string; blocked_id: string; created_at: string }, { blocker_id: string; blocked_id: string }>;
      cities: Table<CityRow, Partial<CityRow>>;
      zones: Table<ZoneRow, Partial<ZoneRow>>;
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
      redeem_with_local_code: {
        Args: { p_benefit_id: string; p_code: string; p_lat: number | null; p_lng: number | null };
        Returns: LocalCodeResult;
      };
      reset_local_code: { Args: { p_business_id: string }; Returns: string };
      benefits_online_redeemed: { Args: Record<string, never>; Returns: { benefit_id: string; redeemed: number; codes_left: number | null }[] };
      my_camina_card: { Args: Record<string, never>; Returns: CaminaCard };
      choose_camina_prize: { Args: { p_benefit_id: string }; Returns: CaminaCard };
      regenerate_redemption_code: { Args: { p_redemption_id: string }; Returns: Redemption };
      confirm_redemption_code: {
        Args: { p_business_id: string; p_code: string };
        Returns: Redemption;
      };
      cancel_expired_redemption: { Args: { p_redemption_id: string }; Returns: Redemption };
      submit_story_share: { Args: { p_redemption_id: string; p_photo_path: string; p_instagram: string }; Returns: StoryShare };
      capture_referral: { Args: { p_referrer_id: string }; Returns: void };
      group_member_count: { Args: { p_group_id: string }; Returns: number };
      group_members_steps: {
        Args: { p_since?: string };
        Returns: { user_id: string; day: string; steps: number }[];
      };
      global_weekly_ranking: {
        Args: { p_limit?: number };
        Returns: { user_id: string; full_name: string; photo_url: string | null; total_steps: number }[];
      };
      community_weekly_average: { Args: Record<string, never>; Returns: number };
      benefits_remaining_today: {
        Args: Record<string, never>;
        Returns: { benefit_id: string; redeemed_today: number }[];
      };
      reto_progress: {
        Args: Record<string, never>;
        Returns: { reto_id: string; met: number; target: number; claimable: boolean; claimed_now: boolean }[];
      };
      join_promotion: { Args: { p_id: string }; Returns: void };
      promotion_counts: { Args: Record<string, never>; Returns: { promotion_id: string; participants: number }[] };
      promotion_ticket_counts: { Args: Record<string, never>; Returns: { promotion_id: string; taken: number }[] };
      redeem_event_ticket: { Args: { p_id: string }; Returns: unknown };
      my_promotion_progress: { Args: { p_id: string }; Returns: { steps_total: number; days_met: number }[] };
      join_group_challenge: { Args: { p_challenge: string }; Returns: void };
      challenge_progress: { Args: { p_challenge: string }; Returns: unknown };
      create_group_challenge: {
        Args: { p_group: string; p_name: string; p_rule: string; p_daily_goal: number; p_start: string; p_end: string; p_stake: number };
        Returns: string;
      };
      report_content: {
        Args: { p_kind: string; p_target_user: string | null; p_message: string | null; p_reason: string };
        Returns: void;
      };
      register_device: { Args: { p_device_id: string }; Returns: string };
      admin_release_device: { Args: { p_device_id: string }; Returns: void };
      claim_reto: { Args: { p_reto_id: string }; Returns: number };
      register_push_token: { Args: { p_token: string; p_platform: string }; Returns: void };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
