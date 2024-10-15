// components/agent-card.tsx

import Link from 'next/link';
import BlurImage from '@/components/blur-image';
import { placeholderBlurhash, toDateString } from '@/lib/utils';
import { Agent } from '@/types/agent';

interface AgentCardProps {
  data: Agent;
}

export default function AgentCard({ data }: AgentCardProps) {
  return (
    <div className="group cursor-pointer border rounded-md p-4">
      {/* Header with Badge */}
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold dark:text-white">{data.name}</h3>
        <span
          className={`text-sm font-semibold px-2 py-1 rounded-full ${
            data.published
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {data.published ? 'Published' : 'Unpublished'}
        </span>
      </div>

      {/* Image */}
      <div className="relative h-60 w-full overflow-hidden rounded-md mt-4">
        <BlurImage
          alt={data.name ?? 'Agent Image'}
          blurDataURL={data.imageBlurhash ?? placeholderBlurhash}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          width={500}
          height={300}
          placeholder="blur"
          src={data.image ?? '/placeholder.png'}
        />
      </div>

      {/* Description and Date */}
      <p className="mt-2 text-stone-600 dark:text-stone-400">
        {data.description}
      </p>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
        {toDateString(data.createdAt)}
      </p>

      {/* Buttons */}
      <div className="mt-4 flex space-x-2">
        <Link
          href={`/agent/${data.id}`}
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Agent Page
        </Link>
        {data.site && data.site.subdomain ? (
          <Link
            href={`http://${data.site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/${data.slug}`}
            className="px-4 py-2 bg-gray-600 text-white rounded-md"
          >
            Site Page
          </Link>
        ) : (
          <span className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md">
            Site Page Unavailable
          </span>
        )}
      </div>
    </div>
  );
}
