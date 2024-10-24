// components/integration-card.tsx
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BlurImage from "@/components/blur-image";
import { placeholderBlurhash } from "@/lib/utils";
import { ExternalLink, Plug } from "lucide-react";

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string | null;
  imageBlurhash?: string | null;
  status: "connected" | "not_connected";
  docUrl: string;
}

export default function IntegrationCard({ data }: { data: Integration }) {
  return (
    <Card className="group overflow-hidden">
      <CardHeader className="p-0">
        <div className="relative h-32 overflow-hidden bg-stone-100 dark:bg-stone-800">
          <BlurImage
            alt={`${data.name} logo`}
            width={128}
            height={128}
            className="mx-auto object-contain p-4"
            src={data.image ?? "/api/placeholder/128/128"}
            placeholder="blur"
            blurDataURL={data.imageBlurhash ?? placeholderBlurhash}
          />
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <h3 className="font-cal text-xl truncate">{data.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {data.description}
        </p>
        <div className="mt-2">
          <span className="inline-block rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-400">
            {data.category}
          </span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex flex-col gap-2">
        <Button
          variant={data.status === "connected" ? "secondary" : "default"}
          className="w-full"
        >
          <Plug className="mr-2 h-4 w-4" />
          {data.status === "connected" ? "Manage Integration" : "Connect"}
        </Button>
        
        <Button
          variant="ghost"
          className="w-full text-xs"
          asChild
        >
          <a
            href={data.docUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2"
          >
            View Documentation
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}