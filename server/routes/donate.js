import express from "express";
import Stripe from "stripe";

const router = express.Router();

const DONATION_TIERS = [
  { id: "coffee",  label: "Buy a Coffee",   amount: 9900,   emoji: "☕" },
  { id: "meal",    label: "Buy a Meal",     amount: 24900,  emoji: "🍕" },
  { id: "boost",   label: "Power Boost",    amount: 49900,  emoji: "⚡" },
  { id: "sponsor", label: "Sponsor",        amount: 99900,  emoji: "💎" },
];

router.get("/tiers", (req, res) => {
  res.json({ tiers: DONATION_TIERS, currency: "inr" });
});

router.post("/checkout", async (req, res, next) => {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(503).json({
        message: "Payments are not configured yet. The developer needs to add Stripe API keys.",
        configured: false,
      });
    }

    const stripe = new Stripe(stripeKey);
    const { tierId, customAmount } = req.body;

    let amount;
    let description;

    if (tierId) {
      const tier = DONATION_TIERS.find((t) => t.id === tierId);
      if (!tier) return res.status(400).json({ message: "Invalid donation tier" });
      amount = tier.amount;
      description = `NoBlindSpot – ${tier.label}`;
    } else if (customAmount && customAmount >= 100) {
      amount = Math.round(customAmount);
      description = `NoBlindSpot – Custom Donation`;
    } else {
      return res.status(400).json({ message: "Please select a tier or enter a custom amount (min ₹1)" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: { name: description },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/settings?donation=success`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/settings?donation=cancelled`,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    next(error);
  }
});

export default router;
