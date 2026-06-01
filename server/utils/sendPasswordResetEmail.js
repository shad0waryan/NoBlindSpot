import { Resend } from "resend";
import { RESEND_API_KEY } from "../config/env.js";

const resend = new Resend(RESEND_API_KEY);

export const sendPasswordResetEmail = async (email, token) => {
  const resetUrl =
    `${process.env.FRONTEND_URL}/reset-password/${token}`;

  await resend.emails.send({
    from: "NoBlindSpot <onboarding@resend.dev>",
    to: email,
    subject: "Reset your NoBlindSpot password",
    html: `
      <h2>Password Reset Request</h2>

      <p>Click the button below to reset your password.</p>

      <a href="${resetUrl}">
        Reset Password
      </a>

      <p>This link expires in 30 minutes.</p>
    `,
  });
};