import "dotenv/config";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "System Administrator";

  if (!email || !password) {
    console.warn(
      "[Seed] ⚠️ ADMIN_EMAIL or ADMIN_PASSWORD not configured in .env",
    );
    return;
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
      await auth.api.createUser({
        body: {
          email,
          password,
          name,
          role: "admin",
        },
      });
      console.log(`[Seed] ✓ Admin user created successfully: ${email}`);
    } else if (existingUser.role !== "admin") {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: "admin" },
      });
      console.log(`[Seed] ✓ Updated existing user ${email} to admin role.`);
    } else {
      console.log(
        `[Seed] : Admin user already exists with role: admin (${email})`,
      );
    }
  } catch (error) {
    console.error(
      "[Seed] ✘ Error seeding admin user:",
      error instanceof Error ? error.message : error,
    );
  }
}

// Allow direct execution: `bun run src/lib/seed-admin.ts`
const isDirectRun =
  Boolean((import.meta as unknown as { main?: boolean }).main) ||
  Boolean(process.argv[1]?.includes("seed-admin"));

if (isDirectRun) {
  seedAdminUser().then(() => {
    process.exit(0);
  });
}
