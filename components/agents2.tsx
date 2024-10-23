import { getSession } from "@/lib/auth";
import db from "@/lib/db";
import Image from "next/image";
import { redirect } from "next/navigation";
import AgentCard from "./agent-card";

export default async function Agents({
  siteId,
  limit,
}: {
  siteId?: string;
  limit?: number;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  const agents = await db.query.agents.findMany({
    where: (agents, { and, eq }) =>
      and(
        eq(agents.userId, session.user.id),
        siteId ? eq(agents.siteId, siteId) : undefined,
      ),
    with: {
      site: true,
    },
    orderBy: (agents, { desc }) => desc(agents.updatedAt),
    ...(limit ? { limit } : {}),
  });

  return agents.length > 0 ? (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {agents.map((agent) => (
        <AgentCard key={agent.id} data={agent} />
      ))}
    </div>
  ) : (
    <div className="flex flex-col items-center space-x-4">
      <h1 className="font-cal text-4xl">No Agents Yet</h1>
      <Image
        alt="No agents"
        src="https://illustrations.popsy.co/gray/graphic-design.svg"
        width={400}
        height={400}
      />
      <p className="text-lg text-stone-500">
        You do not have any agents yet. Create one to get started.
      </p>
    </div>
  );
}
