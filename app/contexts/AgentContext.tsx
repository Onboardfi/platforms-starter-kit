"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SelectAgent } from "@/lib/schema";
import { useParams, redirect } from "next/navigation";
import { getAgentById, updateAgentAPI, updateAgentMetadata } from "@/lib/actions";

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
    if (newAgent?.createdBy) { // Only update if we have a valid createdBy
      setIsPendingSaving(true);
      updateAgentAPI(newAgent, newAgent.createdBy)
        .then(() => setIsPendingSaving(false))
        .catch((error: Error) => {
          console.error('Failed to update agent:', error);
          setIsPendingSaving(false);
        });
    }
  };

  const handleTogglePublish = async () => {
    if (!agent?.site) return; // Make sure we have a valid agent with site

    setIsPendingPublishing(true);
    try {
      const formData = new FormData();
      formData.append('published', (!agent.published).toString());
      
      const response = await updateAgentMetadata(
        formData,
        {
          ...agent,
          site: {
            ...agent.site,
            organization: agent.site.organization || null,
            creator: agent.site.creator || null
          }
        },
        'published'
      );

      if (response.success && response.data) {
        setAgentState({
          ...agent,
          published: !agent.published
        });
      }
    } catch (error: unknown) {
      console.error('Failed to toggle publish:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsPendingPublishing(false);
    }
  };

  // Redirect if we don't have a valid agent ID
  useEffect(() => {
    if (!id) {
      redirect('/');
    }
  }, [id]);

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