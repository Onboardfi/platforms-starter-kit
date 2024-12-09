import Form from "@/components/form";
import { updateSite } from "@/lib/actions";
import db from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Rocket, ExternalLink } from "lucide-react";
import Link from "next/link";

export default async function SiteSettingsDomains({
  params,
}: {
  params: { id: string };
}) {
  const data = await db.query.sites.findFirst({
    where: (sites, { eq }) => eq(sites.id, decodeURIComponent(params.id)),
  });

  return (
    <div className="flex flex-col space-y-6 max-w-[800px]">
      <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900/80" />
        </div>

        <div className="relative p-6 flex items-center justify-between border-b border-white/[0.08]">
          <h1 className="font-cal text-2xl text-white">Domain Settings</h1>
        </div>
      </div>

      <Form
        title="Subdomain"
        description="The subdomain for your site."
        helpText="Please use 32 characters maximum."
        inputAttrs={{
          name: "subdomain",
          type: "text",
          defaultValue: data?.subdomain!,
          placeholder: "subdomain",
          maxLength: 32,
        }}
        handleSubmit={updateSite}
      />
      
      <div className="relative">
        <div className="absolute -inset-x-6 -inset-y-4">
          <div className="h-full w-full bg-gradient-to-r from-dream-purple/10 via-dream-cyan/10 to-dream-cyan/10 opacity-[0.15] blur-lg" />
        </div>
        
        <Card className="relative border border-dream-cyan/20 bg-neutral-900/50">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-medium text-white">Custom Domain</h3>
                <Badge variant="secondary" className="bg-dream-cyan/10 text-dream-cyan">
                  Coming Soon
                </Badge>
              </div>
              <Lock className="w-4 h-4 text-dream-cyan" />
            </div>
            <p className="text-sm text-neutral-400">
              The custom domain for your site.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <div className="flex items-center gap-4">
              <input
                type="text"
                className="flex-1 bg-neutral-800/50 border border-neutral-700 rounded-md px-3 py-2 text-neutral-400 placeholder-neutral-500"
                placeholder="yourdomain.com"
                disabled
              />
              <Button variant="outline" disabled className="border-dream-cyan/20 text-dream-cyan">
                Save
              </Button>
            </div>

            <div className="rounded-lg bg-dream-cyan/5 border border-dream-cyan/10 p-4">
              <div className="flex gap-2">
                <Rocket className="h-5 w-5 text-dream-cyan" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">
                    Available on Growth Plan
                  </p>
                  <p className="text-sm text-neutral-400">
                    Upgrade to our Growth plan to use custom domains and unlock additional premium features.
                  </p>
                  <div className="pt-3">
                    <Link href="/settings/billing">
                      <Button size="sm" className="bg-dream-cyan text-black hover:bg-dream-cyan/90">
                        <span>Upgrade to Growth</span>
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}