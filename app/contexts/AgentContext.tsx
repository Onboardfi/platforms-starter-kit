"use client";

import React, { createContext, useContext, useState, useEffect, useTransition } from "react";
import { SelectAgent } from "@/lib/schema";
import { useParams } from "next/navigation";
import { getAgentById, updateAgent, updateAgentMetadata } from "@/lib/actions";

interface AgentContextProps {
  agent: SelectAgent | null;
  setAgent: React.Dispatch<React.SetStateAction<SelectAgent | null>>;
  isPendingSaving: boolean;
  isPendingPublishing: boolean;
  handleTogglePublish: () => void;
}

const AgentContext = createContext<AgentContextProps | undefined>(undefined);

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
}

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const { id } = useParams() as { id?: string };
  const [agent, setAgent] = useState<SelectAgent | null>(null);
  const [isPendingSaving, startTransitionSaving] = useTransition();
  const [isPendingPublishing, startTransitionPublishing] = useTransition();

  useEffect(() => {
    async function fetchAgent() {
      if (id) {
        const fetchedAgent = await getAgentById(id);
        setAgent(fetchedAgent);
      }
    }
    fetchAgent();
  }, [id]);

  useEffect(() => {
    if (agent) {
      startTransitionSaving(async () => {
        await updateAgent(agent);
      });
    }
  }, [agent]);

  const handleTogglePublish = () => {
    if (agent) {
      startTransitionPublishing(async () => {
        const updatedAgent = { ...agent, published: !agent.published };
        // Create FormData and append the necessary values
        const formData = new FormData();
        formData.append('published', String(updatedAgent.published));
        
        await updateAgentMetadata(
          formData,
          agent.id,
          'published'  // Add the key parameter
        );
        
        setAgent(updatedAgent);
      });
    }
  };

  return (
    <AgentContext.Provider
      value={{
        agent,
        setAgent,
        isPendingSaving,
        isPendingPublishing,
        handleTogglePublish,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

// Export the context and provider as a single default export
export { AgentContext };