import {
  users, ads, campaigns, payments, deals,
  type User, type InsertUser, type Ad, type InsertAd,
  type Campaign, type InsertCampaign, type Payment, type Deal, type InsertDeal
} from "../shared/types/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User>;

  // Ad methods
  createAd(ad: InsertAd & { userId: number }): Promise<Ad>;
  getAd(id: number): Promise<Ad | undefined>;
  getUserAds(userId: number): Promise<Ad[]>;
  updateAdStatus(id: number, status: string): Promise<Ad>;
  getActiveAds(): Promise<Ad[]>;

  // Campaign methods
  createCampaign(campaign: InsertCampaign & { userId: number }): Promise<Campaign>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  getUserCampaigns(userId: number): Promise<Campaign[]>;
  updateCampaignStatus(id: number, status: string): Promise<Campaign>;
  updateCampaignStats(id: number, impressions: number, clicks: number, spend: string): Promise<Campaign>;

  // Payment methods
  createPayment(payment: { userId: number; campaignId: number; stripePaymentIntentId: string; amount: string; status: string }): Promise<Payment>;
  updatePaymentStatus(stripePaymentIntentId: string, status: string): Promise<Payment>;

  // Deal methods
  createDeal(deal: InsertDeal): Promise<Deal>;
  getActiveDeals(): Promise<Deal[]>;
  getDealsByCategory(category: string): Promise<Deal[]>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Ad methods
  async createAd(ad: InsertAd & { userId: number }): Promise<Ad> {
    const [newAd] = await db
      .insert(ads)
      .values(ad)
      .returning();
    return newAd;
  }

  async getAd(id: number): Promise<Ad | undefined> {
    const [ad] = await db.select().from(ads).where(eq(ads.id, id));
    return ad || undefined;
  }

  async getUserAds(userId: number): Promise<Ad[]> {
    return await db.select().from(ads).where(eq(ads.userId, userId)).orderBy(desc(ads.createdAt));
  }

  async updateAdStatus(id: number, status: string): Promise<Ad> {
    const [ad] = await db
      .update(ads)
      .set({ status, updatedAt: sql`NOW()` })
      .where(eq(ads.id, id))
      .returning();
    return ad;
  }

  async getActiveAds(): Promise<Ad[]> {
    return await db.select().from(ads).where(eq(ads.status, "approved")).orderBy(desc(ads.createdAt));
  }

  // Campaign methods
  async createCampaign(campaign: InsertCampaign & { userId: number }): Promise<Campaign> {
    const [newCampaign] = await db
      .insert(campaigns)
      .values(campaign)
      .returning();
    return newCampaign;
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async getUserCampaigns(userId: number): Promise<Campaign[]> {
    return await db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.createdAt));
  }

  async updateCampaignStatus(id: number, status: string): Promise<Campaign> {
    const [campaign] = await db
      .update(campaigns)
      .set({ status, updatedAt: sql`NOW()` })
      .where(eq(campaigns.id, id))
      .returning();
    return campaign;
  }

  async updateCampaignStats(id: number, impressions: number, clicks: number, spend: string): Promise<Campaign> {
    const [campaign] = await db
      .update(campaigns)
      .set({ 
        impressions, 
        clicks, 
        totalSpend: spend,
        updatedAt: sql`NOW()` 
      })
      .where(eq(campaigns.id, id))
      .returning();
    return campaign;
  }

  // Payment methods
  async createPayment(payment: { userId: number; campaignId: number; stripePaymentIntentId: string; amount: string; status: string }): Promise<Payment> {
    const [newPayment] = await db
      .insert(payments)
      .values({
        ...payment,
        currency: "usd"
      })
      .returning();
    return newPayment;
  }

  async updatePaymentStatus(stripePaymentIntentId: string, status: string): Promise<Payment> {
    const [payment] = await db
      .update(payments)
      .set({ status })
      .where(eq(payments.stripePaymentIntentId, stripePaymentIntentId))
      .returning();
    return payment;
  }

  // Deal methods
  async createDeal(deal: InsertDeal): Promise<Deal> {
    const [newDeal] = await db
      .insert(deals)
      .values(deal)
      .returning();
    return newDeal;
  }

  async getActiveDeals(): Promise<Deal[]> {
    return await db
      .select()
      .from(deals)
      .where(and(eq(deals.isActive, true)))
      .orderBy(desc(deals.createdAt));
  }

  async getDealsByCategory(category: string): Promise<Deal[]> {
    return await db
      .select()
      .from(deals)
      .where(and(eq(deals.category, category), eq(deals.isActive, true)))
      .orderBy(desc(deals.createdAt));
  }
}

export const storage = new DatabaseStorage();
