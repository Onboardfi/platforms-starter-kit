// components/form/delete-agent-form.tsx

"use client";

import LoadingDots from "@/components/icons/loading-dots";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { deleteAgent } from "@/lib/actions";
import va from "@vercel/analytics";

export default function DeleteAgentForm({ agentName }: { agentName: string }) {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  return (
    <form
      action={async (formData: FormData) => {
        if (window.confirm("Are you sure you want to delete your agent?")) {
          const res = await deleteAgent(formData, id);
          if ('error' in res && res.error) {
            toast.error(res.error);
          } else {
            va.track("Deleted Agent");
            router.refresh();
            router.push(`/app/agents`); // Adjust the route as needed
            toast.success(`Successfully deleted agent!`);
          }
        }
      }}
      className="rounded-lg border border-red-600 bg-white dark:bg-black"
    >
      <div className="relative flex flex-col space-y-4 p-5 sm:p-10">
        <h2 className="font-cal text-xl dark:text-white">Delete Agent</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Deletes your agent permanently. Type in the name of your agent{" "}
          <b>{agentName}</b> to confirm.
        </p>

        <input
          name="confirm"
          type="text"
          required
          pattern={agentName}
          placeholder={agentName}
          className="w-full max-w-md rounded-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500 dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700"
        />
      </div>

      <div className="flex flex-col items-center justify-center space-y-2 rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 sm:flex-row sm:justify-between sm:space-y-0 sm:px-10 dark:border-stone-700 dark:bg-stone-800">
        <p className="text-center text-sm text-stone-500 dark:text-stone-400">
          This action is irreversible. Please proceed with caution.
        </p>
        <div className="w-32">
          <FormButton />
        </div>
      </div>
    </form>
  );
}

function FormButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className={cn(
        "flex h-8 w-32 items-center justify-center space-x-2 rounded-md border text-sm transition-all focus:outline-none sm:h-10",
        pending
          ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
          : "border-red-600 bg-red-600 text-white hover:bg-white hover:text-red-600 dark:hover:bg-transparent"
      )}
      disabled={pending}
    >
      {pending ? <LoadingDots color="#808080" /> : <p>Confirm Delete</p>}
    </button>
  );
}
