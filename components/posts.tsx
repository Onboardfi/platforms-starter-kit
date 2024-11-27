import { getSession } from "@/lib/auth";
import db from "@/lib/db";
import Image from "next/image";
import { redirect } from "next/navigation";
import PostCard from "./post-card";

export default async function Posts({
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



  return(
   
      <p className="text-lg text-stone-500">
        You do not have any posts yet. Create one to get started.
      </p>
  
  );
}
