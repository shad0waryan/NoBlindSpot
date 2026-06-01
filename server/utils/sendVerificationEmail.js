import { Resend } from "resend";
import { RESEND_API_KEY } from "../config/env.js";
const resend = new Resend(RESEND_API_KEY);

export const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

  await resend.emails.send({
    from: "NoBlindSpot <onboarding@resend.dev>",
    to: email,
    subject: "Verify your NoBlindSpot account",
    html: `
      <h2>Welcome to NoBlindSpot</h2>

      <p>Please click here to verify your email:</p>

      <a href="${verifyUrl}">
        Verify my email id!
      </a>
    `,
  });
};
