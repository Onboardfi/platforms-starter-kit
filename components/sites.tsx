// components/sites.tsx
import { getSession } from "@/lib/auth";
import { getSitesWithAgentCount } from "@/lib/actions";
import Image from "next/image";
import { redirect } from "next/navigation";
import SiteCard from "./site-card";
import { Card, CardContent } from "@/components/ui/card";
import { users, organizations } from "@/lib/schema";
import db from "@/lib/db";
import { eq } from "drizzle-orm";

export default async function Sites({ limit }: { limit?: number }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Get the sites with their complete data including organization and creator
  const sites = await getSitesWithAgentCount();

  // For each site, we need to get its organization and creator details to match the expected type
  const sitesWithRelations = await Promise.all(
    sites.map(async (site) => {
      // Get organization details
      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, site.organizationId)
      });

      // Get creator details
      const creator = await db.query.users.findFirst({
        where: eq(users.id, site.createdBy)
      });

      // Return the complete site object with all required relations
      return {
        ...site,
        organization: organization ?? {
          id: site.organizationId,
          name: 'Unknown Organization',
          slug: 'unknown',
          createdBy: site.createdBy,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          metadata: {},
          createdAt: site.createdAt,
          updatedAt: site.updatedAt,
          logo: null
        },
        creator: creator ?? {
          id: site.createdBy,
          name: null,
          username: null,
          gh_username: null,
          email: '',
          emailVerified: null,
          image: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          metadata: {},
          createdAt: site.createdAt,
          updatedAt: site.updatedAt,
        }
      };
    })
  );

  return sitesWithRelations.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {sitesWithRelations.map((site) => (
        <SiteCard 
          key={site.id} 
          data={site} 
        />
      ))}
    </div>
  ) : (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
        <h1 className="font-cal text-2xl">No Sites Yet</h1>
        <Image
          alt="missing site"
          src="https://illustrations.popsy.co/gray/web-design.svg"
          width={300}
          height={300}
          className="dark:brightness-90"
        />
        <p className="text-muted-foreground text-center max-w-sm">
          You do not have any sites yet. Create one to get started.
        </p>
      </CardContent>
    </Card>
  );
}