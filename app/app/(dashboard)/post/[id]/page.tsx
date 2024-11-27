import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

import db from "@/lib/db";

export default async function PostPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const data = await db.query.posts.findFirst({
    where: (posts, { eq }) => eq(posts.id, decodeURIComponent(params.id)),
    with: {
      site: {
        columns: {
          subdomain: true,
        },
      },
    },
  });
  if (!data ||data.createdBy !== session.user.id) {
    notFound();
  }

  return;
}
