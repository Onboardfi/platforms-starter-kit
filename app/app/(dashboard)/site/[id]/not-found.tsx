import Image from "next/image";

export default function NotFoundSite() {
  return (
    <div className="mt-20 flex flex-col items-center">
      {/* Error Code */}
      <h1 className="font-cal text-4xl mb-8 text-neutral-800 dark:text-white">
        404
      </h1>

      {/* Astronaut Illustration with Dark Mode Support */}
      <div className="relative w-72 h-72 mb-8 group transition-transform duration-500 hover:rotate-6">
        {/* We overlay the image with different opacities for dark/light modes */}
        <div className="relative">
          <Image
            alt="Lost astronaut floating in space"
            src="/astro404.png"
            width={400}
            height={400}
            className="object-contain opacity-90 transition-opacity dark:opacity-100"
            priority
          />
          
          {/* Add a subtle glow effect in dark mode */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-white/10 opacity-0 dark:opacity-20 rounded-full blur-2xl" />
        </div>
      </div>

      {/* Error Message */}
      <p className="text-lg text-center max-w-md px-6 text-stone-500 dark:text-stone-400">
        Site does not exist, or you do not have permission to view it
      </p>
    </div>
  );
}