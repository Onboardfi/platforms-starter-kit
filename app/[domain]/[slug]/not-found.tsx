import { getSiteData } from "@/lib/fetchers";
import { headers } from "next/headers";
import Image from "next/image";

export default async function NotFound() {
  // Get the domain information from headers
  const headersList = headers();
  const domain = headersList
    .get("host")
    ?.replace(".localhost:3000", `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`);
  
  // Fetch site data for customized messaging
  const data = await getSiteData(domain as string);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      {/* Page title with optional site name */}
      <h1 className="font-cal text-4xl mb-8">
        {data ? `${data.name}: ` : ""}404
      </h1>

      {/* Astronaut illustration */}
      <div className="relative w-60 h-60 mb-8">
        <Image
          alt="Lost astronaut floating in space"
          src="/astro404.png"
          width={400}
          height={400}
          className="object-contain"
          priority
        />
      </div>

      {/* Custom or default 404 message */}
      <p className="text-lg text-stone-500 text-center max-w-md">
        {data
          ? data.message404
          : "Blimey! You've found a page that doesn't exist."}
      </p>
    </div>
  );
}