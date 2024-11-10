// SessionDetails.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Session } from "@/lib/types";

interface SessionDetailsProps {
  session: Session;
  onBack: () => void;
  isCurrentSession: boolean;
}

const SessionDetails = ({
  session,
  onBack,
  isCurrentSession,
}: SessionDetailsProps) => {
  if (!session) return null;

  return (
    <div className="relative animate-fade-in-up">
      {/* Card Container */}
      <Card className="bg-neutral-900/50 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-lg">
        {/* Card Header */}
        <CardHeader className="relative space-y-0 pb-2">
          <div className="flex items-center space-x-4">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={onBack}
              className={cn(
                "h-9 px-4 rounded-xl text-white/70 font-light",
                "hover:bg-white/5 hover:text-white",
                "transition-all duration-300",
                "flex items-center space-x-2"
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Sessions</span>
            </Button>

            {/* Session Title */}
            <CardTitle className="text-sm font-light text-white/90">
              {session.name}
            </CardTitle>

            {/* Current Session Badge */}
            {isCurrentSession && (
              <Badge
                variant="outline"
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-light",
                  "bg-blue-500/10 border-blue-500/20 text-blue-500",
                  "backdrop-blur-md"
                )}
              >
                Current Session
              </Badge>
            )}
          </div>
        </CardHeader>

        {/* Steps List */}
        <CardContent className="space-y-4">
          {session.stepProgress?.steps.map((step, index) => (
            <div
              key={step.id}
              className="group relative animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Step Card */}
              <Card
                className={cn(
                  "relative overflow-hidden rounded-2xl",
                  "bg-neutral-800/50 backdrop-blur-md",
                  "border border-white/10",
                  "transition-all duration-300",
                  "hover:border-white/20",
                  "shadow-md hover:shadow-lg"
                )}
              >
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Content */}
                <CardContent className="relative pt-6">
                  <div className="flex items-center justify-between">
                    {/* Step Info */}
                    <div className="space-y-1">
                      <h4 className="font-light text-white/90">{step.title}</h4>
                      <p className="text-sm text-white/50">
                        {step.description}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <Badge
                      variant={step.completed ? "default" : "secondary"}
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-light backdrop-blur-md",
                        step.completed
                          ? "bg-green-500/10 border-green-500/20 text-green-500"
                          : "bg-white/5 border-white/10 text-white/50"
                      )}
                    >
                      {step.completed ? "Completed" : "Pending"}
                    </Badge>
                  </div>

                  {/* Completion Time */}
                  {step.completedAt && (
                    <p className="text-xs text-white/30 mt-2 font-light">
                      Completed: {new Date(step.completedAt).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionDetails;
