import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import bcrypt from "bcryptjs";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { insertUserSchema, insertAdSchema, insertCampaignSchema } from "../shared/types/schema";
import { generateAdText, generateAdImage, enhanceAdPrompt } from "./services/openai";
import multer from "multer";
import path from "path";
import geoip from "geoip-lite";
import pricingRoutes from "./routes/pricing";
import dealsRoutes from "./routes/deals";
import surprisesRoutes from "./routes/surprises";
import paymentsRoutes from "./routes/payments";
import referralsRoutes from "./routes/referrals";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'billboard-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));

  // Passport configuration
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Authentication required" });
  };

  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      const { username, email, password, confirmPassword } = req.body;
      
      // Validate input
      const validationResult = insertUserSchema.safeParse({ username, email, password, confirmPassword });
      if (!validationResult.success) {
        return res.status(400).json({ message: validationResult.error.errors[0]?.message || "Validation failed" });
      }
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed after registration" });
        }
        res.json({ user: { id: user.id, username: user.username, email: user.email } });
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/login", passport.authenticate('local'), (req, res) => {
    const user = req.user as any;
    res.json({ user: { id: user.id, username: user.username, email: user.email } });
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", requireAuth, (req, res) => {
    const user = req.user as any;
    res.json({ user: { id: user.id, username: user.username, email: user.email } });
  });

  // AI Ad Generation routes
  app.post("/api/generate-ad-text", requireAuth, async (req, res) => {
    try {
      const { prompt, adType, goal, targetAudience } = req.body;
      
      if (!prompt || !adType || !goal) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const enhancedPrompt = await enhanceAdPrompt(prompt, adType, targetAudience || "general audience");
      const adText = await generateAdText(enhancedPrompt, adType, goal);
      
      res.json(adText);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/generate-ad-image", requireAuth, async (req, res) => {
    try {
      const { prompt, adType, targetAudience } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      const enhancedPrompt = await enhanceAdPrompt(prompt, adType || "image", targetAudience || "general audience");
      const image = await generateAdImage(enhancedPrompt);
      
      res.json(image);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Ad routes
  app.post("/api/ads", requireAuth, upload.single('file'), async (req, res) => {
    try {
      const user = req.user as any;
      const { title, description, type, targetUrl, callToAction, content } = req.body;
      
      let adContent = content ? JSON.parse(content) : {};
      
      // If file was uploaded, add file path to content
      if (req.file) {
        adContent.assetUrl = `/uploads/${req.file.filename}`;
        adContent.assetType = req.file.mimetype;
      }

      const adData = insertAdSchema.parse({
        title,
        description,
        type,
        content: adContent,
        targetUrl,
        callToAction,
      });

      const ad = await storage.createAd({
        ...adData,
        userId: user.id,
      });

      res.json(ad);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/ads", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const ads = await storage.getUserAds(user.id);
      res.json(ads);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/ads/active", async (req, res) => {
    try {
      const ads = await storage.getActiveAds();
      res.json(ads);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/ads/:id/status", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const ad = await storage.updateAdStatus(parseInt(id), status);
      res.json(ad);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Campaign routes
  app.post("/api/campaigns", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const campaignData = insertCampaignSchema.parse(req.body);

      const campaign = await storage.createCampaign({
        ...campaignData,
        userId: user.id,
      });

      res.json(campaign);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/campaigns", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const campaigns = await storage.getUserCampaigns(user.id);
      res.json(campaigns);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Payment routes
  app.post("/api/create-payment-intent", requireAuth, async (req, res) => {
    try {
      const { amount, campaignId } = req.body;
      const user = req.user as any;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId: user.id.toString(),
          campaignId: campaignId.toString(),
        },
      });

      // Create payment record
      await storage.createPayment({
        userId: user.id,
        campaignId,
        stripePaymentIntentId: paymentIntent.id,
        amount: amount.toString(),
        status: "pending",
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Location detection API
  app.get("/api/location", (req, res) => {
    try {
      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0] || 
                 req.socket.remoteAddress || 
                 "127.0.0.1";
      
      const geo = geoip.lookup(ip);
      
      res.json({
        city: geo?.city || "",
        country: geo?.country || "",
        region: geo?.region || "",
        timezone: geo?.timezone || ""
      });
    } catch (error) {
      console.error("Location lookup error:", error);
      res.json({
        city: "",
        country: "",
        region: "",
        timezone: ""
      });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // Pricing routes
  app.use('/api/pricing', pricingRoutes);

  // Deals routes
  app.use('/api/deals', dealsRoutes);

  // Surprises routes
  app.use('/api/surprises', surprisesRoutes);

  // Payment routes
  app.use('/api/payments', paymentsRoutes);

  // Referral routes
  app.use('/api/referrals', referralsRoutes);

  const httpServer = createServer(app);
  return httpServer;
}

