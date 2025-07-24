import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ads = pgTable("ads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'image', 'video', 'text'
  content: jsonb("content").notNull(), // stores asset URLs, text content, etc.
  targetUrl: text("target_url"),
  callToAction: text("call_to_action"),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'active', 'paused'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  adId: integer("ad_id").notNull(),
  name: text("name").notNull(),
  placement: text("placement").notNull(), // 'premium', 'featured', 'standard'
  dailyBudget: decimal("daily_budget", { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'active', 'paused', 'completed'
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  totalSpend: decimal("total_spend", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  campaignId: integer("campaign_id").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull(), // 'pending', 'succeeded', 'failed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  discountPercentage: integer("discount_percentage"),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  discountedPrice: decimal("discounted_price", { precision: 10, scale: 2 }),
  affiliateUrl: text("affiliate_url").notNull(),
  imageUrl: text("image_url"),
  category: text("category").notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ads: many(ads),
  campaigns: many(campaigns),
  payments: many(payments),
}));

export const adsRelations = relations(ads, ({ one, many }) => ({
  user: one(users, {
    fields: [ads.userId],
    references: [users.id],
  }),
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
  ad: one(ads, {
    fields: [campaigns.adId],
    references: [ads.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [payments.campaignId],
    references: [campaigns.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users);

export const insertAdSchema = createInsertSchema(ads);

export const insertCampaignSchema = createInsertSchema(campaigns);

export const insertDealSchema = createInsertSchema(deals);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Ad = typeof ads.$inferSelect;
export type InsertAd = z.infer<typeof insertAdSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Payment = typeof payments.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;

// Smart Pricing Engine Constants
export const BASE_RATES = {
  TOP_TIER: 15,    // $15/day
  MID_TIER: 10,    // $10/day
  BOTTOM_TIER: 5,  // $5/day
} as const;

export const SLOT_MULTIPLIERS = {
  TOP: 2.0,
  MID: 1.3,
  BOTTOM: 1.0,
} as const;

export const GEO_MULTIPLIERS = {
  // Tier 1: Premium markets
  US: 1.5,
  UK: 1.5,
  DE: 1.5,
  CA: 1.4,
  AU: 1.4,
  
  // Tier 2: Growing markets
  IN: 1.2,
  BR: 1.2,
  MX: 1.1,
  FR: 1.3,
  IT: 1.3,
  ES: 1.2,
  
  // Tier 3: Emerging markets
  NG: 0.8,
  KE: 0.7,
  GH: 0.7,
  ZA: 0.9,
  EG: 0.8,
  
  // Default for unlisted countries
  DEFAULT: 1.0,
} as const;

export const TIME_MULTIPLIERS = {
  PRIME_TIME: 1.4,    // 6 PM - 10 PM
  BUSINESS_HOURS: 1.2, // 9 AM - 5 PM
  EVENING: 1.1,       // 5 PM - 9 PM
  MORNING: 1.0,       // 6 AM - 9 AM
  LATE_NIGHT: 0.6,    // 10 PM - 6 AM
  WEEKEND: 1.1,       // Saturday & Sunday
} as const;

export const FORMAT_MULTIPLIERS = {
  VIDEO: 1.5,
  IMAGE: 1.0,
  TEXT: 0.8,
  AI_GENERATED_BONUS: 10, // Flat $10 bonus
} as const;

export const DURATION_DISCOUNTS = {
  1: 1.0,    // No discount for 1 day
  3: 0.95,   // 5% discount for 3+ days
  7: 0.90,   // 10% discount for 1+ week
  14: 0.85,  // 15% discount for 2+ weeks
  30: 0.80,  // 20% discount for 1+ month
} as const;

export const DEMAND_MULTIPLIERS = {
  VERY_HIGH: 1.8,
  HIGH: 1.4,
  MEDIUM: 1.0,
  LOW: 0.8,
  VERY_LOW: 0.6,
} as const;

export const AD_SLOT_TYPES = {
  TOP_CENTER: 'top_center',
  TOP_LEFT: 'top_left',
  TOP_RIGHT: 'top_right',
  MID_CENTER: 'mid_center',
  MID_LEFT: 'mid_left',
  MID_RIGHT: 'mid_right',
  BOTTOM_CENTER: 'bottom_center',
  BOTTOM_LEFT: 'bottom_left',
  BOTTOM_RIGHT: 'bottom_right',
  MOBILE_BANNER: 'mobile_banner',
  MOBILE_INTERSTITIAL: 'mobile_interstitial',
} as const;

export const SLOT_TIER_MAPPING = {
  [AD_SLOT_TYPES.TOP_CENTER]: 'TOP',
  [AD_SLOT_TYPES.TOP_LEFT]: 'TOP',
  [AD_SLOT_TYPES.TOP_RIGHT]: 'TOP',
  [AD_SLOT_TYPES.MID_CENTER]: 'MID',
  [AD_SLOT_TYPES.MID_LEFT]: 'MID',
  [AD_SLOT_TYPES.MID_RIGHT]: 'MID',
  [AD_SLOT_TYPES.BOTTOM_CENTER]: 'BOTTOM',
  [AD_SLOT_TYPES.BOTTOM_LEFT]: 'BOTTOM',
  [AD_SLOT_TYPES.BOTTOM_RIGHT]: 'BOTTOM',
  [AD_SLOT_TYPES.MOBILE_BANNER]: 'BOTTOM',
  [AD_SLOT_TYPES.MOBILE_INTERSTITIAL]: 'MID',
} as const;

export type SlotType = keyof typeof AD_SLOT_TYPES;
export type SlotTier = keyof typeof SLOT_MULTIPLIERS;
export type CountryCode = keyof typeof GEO_MULTIPLIERS;
export type TimeSlot = keyof typeof TIME_MULTIPLIERS;
export type AdFormat = keyof typeof FORMAT_MULTIPLIERS;
export type DemandLevel = keyof typeof DEMAND_MULTIPLIERS;


