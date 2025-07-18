import { randomBytes } from 'crypto';

export interface ReferralCode {
  id: string;
  code: string;
  userId: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  maxUses?: number;
  currentUses: number;
  rewardType: 'credit' | 'discount' | 'free_slot';
  rewardValue: number; // Amount in USD or percentage
}

export interface ReferralReward {
  id: string;
  referrerId: string;
  refereeId: string;
  referralCodeId: string;
  rewardType: 'credit' | 'discount' | 'free_slot';
  rewardValue: number;
  status: 'pending' | 'approved' | 'paid' | 'expired';
  createdAt: Date;
  paidAt?: Date;
}

export interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  conversionRate: number;
  topReferralCode: string;
  monthlyStats: {
    month: string;
    referrals: number;
    earnings: number;
  }[];
}

export class ReferralEngine {
  /**
   * Generate a unique referral code for a user
   */
  static generateReferralCode(userId: string, customCode?: string): ReferralCode {
    const code = customCode || this.generateUniqueCode();
    
    return {
      id: `ref_${Date.now()}_${randomBytes(4).toString('hex')}`,
      code: code.toUpperCase(),
      userId,
      createdAt: new Date(),
      isActive: true,
      currentUses: 0,
      rewardType: 'credit',
      rewardValue: 10.00, // $10 credit for each referral
    };
  }

  /**
   * Generate a unique alphanumeric code
   */
  private static generateUniqueCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Validate and apply referral code
   */
  static async applyReferralCode(
    code: string, 
    newUserId: string
  ): Promise<{
    success: boolean;
    reward?: ReferralReward;
    error?: string;
  }> {
    try {
      // In production, this would query the database
      const referralCode = await this.findReferralCode(code);
      
      if (!referralCode) {
        return { success: false, error: 'Invalid referral code' };
      }

      if (!referralCode.isActive) {
        return { success: false, error: 'Referral code is no longer active' };
      }

      if (referralCode.expiresAt && referralCode.expiresAt < new Date()) {
        return { success: false, error: 'Referral code has expired' };
      }

      if (referralCode.maxUses && referralCode.currentUses >= referralCode.maxUses) {
        return { success: false, error: 'Referral code has reached maximum uses' };
      }

      if (referralCode.userId === newUserId) {
        return { success: false, error: 'Cannot use your own referral code' };
      }

      // Create referral reward
      const reward: ReferralReward = {
        id: `reward_${Date.now()}_${randomBytes(4).toString('hex')}`,
        referrerId: referralCode.userId,
        refereeId: newUserId,
        referralCodeId: referralCode.id,
        rewardType: referralCode.rewardType,
        rewardValue: referralCode.rewardValue,
        status: 'pending',
        createdAt: new Date(),
      };

      // Update referral code usage
      referralCode.currentUses += 1;

      // In production, save to database
      await this.saveReferralReward(reward);
      await this.updateReferralCode(referralCode);

      return { success: true, reward };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to apply referral code: ${(error as Error).message}` 
      };
    }
  }

  /**
   * Get referral statistics for a user
   */
  static async getReferralStats(userId: string): Promise<ReferralStats> {
    try {
      // In production, this would query the database
      const referrals = await this.getUserReferrals(userId);
      const rewards = await this.getUserRewards(userId);

      const totalReferrals = referrals.length;
      const successfulReferrals = rewards.filter(r => r.status === 'approved' || r.status === 'paid').length;
      const totalEarnings = rewards
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + r.rewardValue, 0);
      const pendingEarnings = rewards
        .filter(r => r.status === 'pending' || r.status === 'approved')
        .reduce((sum, r) => sum + r.rewardValue, 0);

      const conversionRate = totalReferrals > 0 ? (successfulReferrals / totalReferrals) * 100 : 0;

      // Get top performing referral code
      const codes = await this.getUserReferralCodes(userId);
      const topReferralCode = codes.reduce((top, current) => 
        current.currentUses > (top?.currentUses || 0) ? current : top
      )?.code || '';

      // Generate monthly stats (mock data for now)
      const monthlyStats = this.generateMonthlyStats(rewards);

      return {
        totalReferrals,
        successfulReferrals,
        totalEarnings,
        pendingEarnings,
        conversionRate,
        topReferralCode,
        monthlyStats,
      };
    } catch (error) {
      throw new Error(`Failed to get referral stats: ${(error as Error).message}`);
    }
  }

  /**
   * Create special promotional referral codes
   */
  static createPromotionalCode(
    userId: string,
    customCode: string,
    rewardType: 'credit' | 'discount' | 'free_slot',
    rewardValue: number,
    maxUses?: number,
    expiresAt?: Date
  ): ReferralCode {
    return {
      id: `promo_${Date.now()}_${randomBytes(4).toString('hex')}`,
      code: customCode.toUpperCase(),
      userId,
      createdAt: new Date(),
      expiresAt,
      isActive: true,
      maxUses,
      currentUses: 0,
      rewardType,
      rewardValue,
    };
  }

  /**
   * Process referral rewards (approve and pay)
   */
  static async processRewards(rewardIds: string[]): Promise<{
    processed: number;
    failed: number;
    errors: string[];
  }> {
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const rewardId of rewardIds) {
      try {
        const reward = await this.findReward(rewardId);
        if (!reward) {
          errors.push(`Reward ${rewardId} not found`);
          failed++;
          continue;
        }

        if (reward.status !== 'pending') {
          errors.push(`Reward ${rewardId} is not in pending status`);
          failed++;
          continue;
        }

        // Process the reward based on type
        switch (reward.rewardType) {
          case 'credit':
            await this.addUserCredit(reward.referrerId, reward.rewardValue);
            break;
          case 'discount':
            await this.createDiscountCoupon(reward.referrerId, reward.rewardValue);
            break;
          case 'free_slot':
            await this.grantFreeAdSlot(reward.referrerId);
            break;
        }

        // Update reward status
        reward.status = 'paid';
        reward.paidAt = new Date();
        await this.updateReward(reward);

        processed++;
      } catch (error) {
        errors.push(`Failed to process reward ${rewardId}: ${(error as Error).message}`);
        failed++;
      }
    }

    return { processed, failed, errors };
  }

  /**
   * Get leaderboard of top referrers
   */
  static async getLeaderboard(limit: number = 10): Promise<{
    userId: string;
    username?: string;
    totalReferrals: number;
    totalEarnings: number;
    rank: number;
  }[]> {
    try {
      // In production, this would be a complex database query
      const allRewards = await this.getAllRewards();
      
      const userStats = allRewards.reduce((acc, reward) => {
        if (!acc[reward.referrerId]) {
          acc[reward.referrerId] = {
            userId: reward.referrerId,
            totalReferrals: 0,
            totalEarnings: 0,
          };
        }
        
        acc[reward.referrerId].totalReferrals++;
        if (reward.status === 'paid') {
          acc[reward.referrerId].totalEarnings += reward.rewardValue;
        }
        
        return acc;
      }, {} as Record<string, any>);

      const leaderboard = Object.values(userStats)
        .sort((a: any, b: any) => b.totalEarnings - a.totalEarnings)
        .slice(0, limit)
        .map((user: any, index) => ({
          ...user,
          rank: index + 1,
        }));

      return leaderboard;
    } catch (error) {
      throw new Error(`Failed to get leaderboard: ${(error as Error).message}`);
    }
  }

  /**
   * Generate shareable referral links
   */
  static generateReferralLink(code: string, baseUrl: string = 'https://billboard.com'): {
    webLink: string;
    socialLinks: {
      twitter: string;
      facebook: string;
      linkedin: string;
      whatsapp: string;
    };
  } {
    const webLink = `${baseUrl}?ref=${code}`;
    const message = `🎯 Join Billboard - The Times Square of the Internet! Use my referral code ${code} and get $10 credit for your first ad campaign!`;
    
    return {
      webLink,
      socialLinks: {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(webLink)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(webLink)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(webLink)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(message + ' ' + webLink)}`,
      },
    };
  }

  // Mock database methods (replace with actual database operations)
  private static async findReferralCode(code: string): Promise<ReferralCode | null> {
    // Mock implementation
    return null;
  }

  private static async saveReferralReward(reward: ReferralReward): Promise<void> {
    // Mock implementation
  }

  private static async updateReferralCode(code: ReferralCode): Promise<void> {
    // Mock implementation
  }

  private static async getUserReferrals(userId: string): Promise<ReferralReward[]> {
    // Mock implementation
    return [];
  }

  private static async getUserRewards(userId: string): Promise<ReferralReward[]> {
    // Mock implementation
    return [];
  }

  private static async getUserReferralCodes(userId: string): Promise<ReferralCode[]> {
    // Mock implementation
    return [];
  }

  private static async findReward(rewardId: string): Promise<ReferralReward | null> {
    // Mock implementation
    return null;
  }

  private static async updateReward(reward: ReferralReward): Promise<void> {
    // Mock implementation
  }

  private static async getAllRewards(): Promise<ReferralReward[]> {
    // Mock implementation
    return [];
  }

  private static async addUserCredit(userId: string, amount: number): Promise<void> {
    // Mock implementation
  }

  private static async createDiscountCoupon(userId: string, percentage: number): Promise<void> {
    // Mock implementation
  }

  private static async grantFreeAdSlot(userId: string): Promise<void> {
    // Mock implementation
  }

  private static generateMonthlyStats(rewards: ReferralReward[]): {
    month: string;
    referrals: number;
    earnings: number;
  }[] {
    // Mock implementation
    return [
      { month: 'January', referrals: 5, earnings: 50 },
      { month: 'February', referrals: 8, earnings: 80 },
      { month: 'March', referrals: 12, earnings: 120 },
    ];
  }
}

