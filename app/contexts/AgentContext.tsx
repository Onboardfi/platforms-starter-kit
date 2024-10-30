"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SelectAgent } from "@/lib/schema";
import { useParams } from "next/navigation";
import { getAgentById, updateAgent, updateAgentMetadata } from "@/lib/actions";

interface AgentContextProps {
  agent: SelectAgent | null;
  setAgent: (agent: SelectAgent | null) => void;
  isPendingSaving: boolean;
  isPendingPublishing: boolean;
  handleTogglePublish: () => void;
}

const AgentContext = createContext<AgentContextProps | undefined>(undefined);

function useAgent() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
}

function AgentProvider({ children }: { children: React.ReactNode }) {
  const { id } = useParams() as { id?: string };
  const [agent, setAgentState] = useState<SelectAgent | null>(null);
  const [isPendingSaving, setIsPendingSaving] = useState(false);
  const [isPendingPublishing, setIsPendingPublishing] = useState(false);

  useEffect(() => {
    async function fetchAgent() {
      if (id) {
        const fetchedAgent = await getAgentById(id);
        setAgentState(fetchedAgent);
      }
    }
    fetchAgent();
  }, [id]);

  const setAgent = (newAgent: SelectAgent | null) => {
    setAgentState(newAgent);
    if (newAgent) {
      setIsPendingSaving(true);
      updateAgent(newAgent)
        .then(() => setIsPendingSaving(false))
        .catch((error) => {
          console.error('Failed to update agent:', error);
          setIsPendingSaving(false);
        });
    }
  };

  const handleTogglePublish = async () => {
    if (!agent) return;

    setIsPendingPublishing(true);
    try {
      const updatedAgent = { ...agent, published: !agent.published };
      const formData = new FormData();
      formData.append('published', String(updatedAgent.published));
      
      await updateAgentMetadata(formData, agent.id, 'published');
      setAgentState(updatedAgent);
    } catch (error) {
      console.error('Failed to toggle publish:', error);
    } finally {
      setIsPendingPublishing(false);
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

export { useAgent, AgentProvider, AgentContext };