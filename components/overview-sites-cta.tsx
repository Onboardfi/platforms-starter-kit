// components/overview-sites-cta.tsx
import { getSession } from "@/lib/auth";
import CreateSiteButton from "./create-site-button";
import CreateSiteModal from "./modal/create-site";
import Link from "next/link";
import db from "@/lib/db";
import { sites } from "@/lib/schema";
import { count, eq } from "drizzle-orm";

export default async function OverviewSitesCTA() {
  // Get the session which includes the organization context
  const session = await getSession();
  if (!session?.organizationId) {
    return null; // Return null if there's no organization context
  }

  // Query sites based on the organization ID rather than user ID
  const [sitesResult] = await db
    .select({ count: count() })
    .from(sites)
    .where(eq(sites.organizationId, session.organizationId));

  return sitesResult.count > 0 ? (
    <Link
      href="/sites"
      className="rounded-lg border border-black bg-black px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-white hover:text-black active:bg-stone-100 dark:border-stone-700 dark:hover:border-stone-200 dark:hover:bg-black dark:hover:text-white dark:active:bg-stone-800"
    >
      View All Sites
    </Link>
  ) : (
    <CreateSiteButton>
      <CreateSiteModal />
    </CreateSiteButton>
  );
}