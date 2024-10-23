// components/sites.tsx
import { getSession } from "@/lib/auth";
import db from "@/lib/db";
import Image from "next/image";
import { redirect } from "next/navigation";
import SiteCard from "./site-card";
import { Card, CardContent } from "@/components/ui/card";

export default async function Sites({ limit }: { limit?: number }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const sites = await db.query.sites.findMany({
    where: (sites, { eq }) => eq(sites.userId, session.user.id),
    orderBy: (sites, { asc }) => asc(sites.createdAt),
    ...(limit ? { limit } : {}),
  });

  return sites.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {sites.map((site) => (
        <SiteCard key={site.id} data={site} />
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