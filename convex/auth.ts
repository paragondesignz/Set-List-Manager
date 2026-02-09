import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { z } from "zod";

const EmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const result = EmailSchema.safeParse(params);
        if (!result.success) {
          throw new ConvexError(result.error.format());
        }
        return { email: result.data.email };
      },
      validatePasswordRequirements(password: string) {
        if (password.length < 8) {
          throw new ConvexError("Password must be at least 8 characters");
        }
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      // Only set trial for new users
      if (!existingUserId) {
        const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
        await ctx.db.patch(userId, {
          subscriptionStatus: "trialing",
          trialEndsAt: Date.now() + FOURTEEN_DAYS,
        });
      }
    },
  },
});
