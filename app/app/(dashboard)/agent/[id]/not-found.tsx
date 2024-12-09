import Image from "next/image";

export default function NotFoundPost() {
  return (
    <div className="mt-20 flex flex-col items-center">
      {/* Error Code */}
      <h1 className="font-cal text-4xl mb-8 text-neutral-800 dark:text-white">
        404
      </h1>

      {/* Astronaut Illustration */}
      <div className="relative w-60 h-60 mb-8 transform -scale-x-100">
        <Image
          alt="Lost astronaut floating in space"
          src="/astro404.png"
          width={400}
          height={400}
          className="object-contain"
          priority
        />
      </div>

      {/* Error Message */}
      <p className="text-lg text-stone-500 text-center max-w-md px-4">
        Post does not exist, or you do not have permission to edit it
      </p>
    </div>
  );
}