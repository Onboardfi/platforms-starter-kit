// components/groups/agents/options-dropdown.tsx

"use client";

import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

interface OptionsDropdownProps {
  id: string;
}

export default function OptionsDropdown({ id }: OptionsDropdownProps) {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`/agents/edit/${id}`);
  };

  const handleDelete = () => {
    // Implement delete logic here, possibly calling an API route
    console.log(`Delete agent with ID: ${id}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button   aria-label="Options">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
