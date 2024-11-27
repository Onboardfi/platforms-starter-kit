import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Form from "@/components/form";

import DeletePostForm from "@/components/form/delete-post-form";
import db from "@/lib/db";


export default async function PostSettings({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const data = await db.query.posts.findFirst({
    where: (posts, { eq }) => eq(posts.id, decodeURIComponent(params.id)),
  });
  if (!data || data.createdBy !== session.user.id) {
    notFound();
  }
  return (
    <div className="flex max-w-screen-xl flex-col space-y-12 p-6">
      <div className="flex flex-col space-y-6">
        <h1 className="font-cal text-3xl font-bold dark:text-white">
          Post Settings
        </h1>
     
        <DeletePostForm postName={data?.title!} />
      </div>
    </div>
  );
}
