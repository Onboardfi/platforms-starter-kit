// components/site-card.tsx
import BlurImage from "@/components/blur-image";
import type { SelectSite } from "@/lib/schema";
import { placeholderBlurhash, random } from "@/lib/utils";
import { BarChart, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SiteCard({ data }: { data: SelectSite }) {
  const url = `${data.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
  const siteUrl = process.env.NEXT_PUBLIC_VERCEL_ENV
    ? `https://${url}`
    : `http://${data.subdomain}.localhost:3000`;

  return (
    <Card className="group overflow-hidden">
      <Link href={`/site/${data.id}`}>
        <CardHeader className="p-0">
          <div className="relative aspect-video overflow-hidden">
            <BlurImage
              alt={data.name ?? "Card thumbnail"}
              width={500}
              height={400}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              src={data.image ?? "/placeholder.png"}
              placeholder="blur"
              blurDataURL={data.imageBlurhash ?? placeholderBlurhash}
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          <h3 className="font-cal text-xl truncate">{data.name}</h3>
          <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
            {data.description}
          </p>
        </CardContent>
      </Link>

      <CardFooter className="p-4 pt-0 flex justify-between gap-2">
        <Button
          variant="secondary"
          className="w-full text-xs"
          asChild
        >
          <a
            href={siteUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2"
          >
            {url}
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
        
        <Button
          variant="secondary"
          className="text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-900/50 dark:hover:bg-green-800/50 dark:text-green-400"
          asChild
        >
          <Link
            href={`/site/${data.id}/analytics`}
            className="flex items-center gap-2"
          >
            <BarChart className="h-4 w-4" />
            <span>{random(10, 40)}%</span>
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}