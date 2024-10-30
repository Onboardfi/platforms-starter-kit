"use client";

import BlurImage from "@/components/blur-image";
import type { SelectSite } from "@/lib/schema";
import { placeholderBlurhash, toDateString } from "@/lib/utils";
import { ExternalLink, Settings, Users } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SiteCard({ data }: { data: SelectSite }) {
  const url = `${data.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
  const siteUrl = process.env.NEXT_PUBLIC_VERCEL_ENV ? `https://${url}` : `http://${data.subdomain}.localhost:3000`;


  const renderLogo = () => {
    if (data.logo) {
      return <img src={data.logo} alt={`${data.name || 'Site'} logo`} className="h-full w-full object-cover rounded-full" />;
    }
    return (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-purple-800 rounded-full">
        <span className="text-2xl font-bold text-white">{data.name?.charAt(0) || "S"}</span>
      </div>
    );
  };

  return (
    <Card className="group overflow-hidden relative">
      <div className="relative">
        <div className="relative h-24">
          {data.image ? (
            <BlurImage
              alt={data.name ?? "Site Banner"}
              blurDataURL={data.imageBlurhash ?? placeholderBlurhash}
              className="object-cover w-full h-full"
              fill
              placeholder="blur"
              src={data.image}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-gray-800 to-gray-900" />
          )}

          <div className="absolute top-3 right-3 flex gap-2">
            <Badge variant="secondary">{url}</Badge>
           
          </div>
        </div>

        <div className="absolute -bottom-12 left-6">
          <div className="h-24 w-24 rounded-full border-4 border-black bg-black">
            <div className="h-full w-full overflow-hidden">{renderLogo()}</div>
          </div>
        </div>
      </div>

      <CardContent className="pt-16 pb-6">
        <div className="space-y-1 mb-6">
          <h3 className="font-cal text-xl">{data.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{data.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-800">
          <div>
            <p className="text-gray-400 text-xs">Created</p>
            <p className="text-sm mt-1 font-mono">{toDateString(data.createdAt)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Font</p>
            <p className="text-sm mt-1 font-mono">{data.font}</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between gap-2 px-6 pb-6">
        <Button asChild variant="default" className="w-full">
          <Link href={`/site/${data.id}`} className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Onboards
          </Link>
        </Button>
        <Button asChild variant="secondary" className="w-full">
          <Link href={`/site/${data.id}/settings`} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </Button>
    
      </CardFooter>
    </Card>
  );
}