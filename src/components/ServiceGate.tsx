import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFeatureFlags } from "@/lib/api";

interface Props {
  serviceKey: string;
  serviceName: string;
  children: ReactNode;
}

export function ServiceGate({ serviceKey, serviceName, children }: Props) {
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getFeatureFlags()
      .then((d: { disabledServices?: string[] }) => {
        setDisabled((d.disabledServices || []).includes(serviceKey));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [serviceKey]);

  if (loading) return null;

  if (disabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
            <Ban className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-xl font-bold">{serviceName} is currently unavailable</h1>
          <p className="text-sm text-muted-foreground">
            This service has been temporarily disabled. Please check back later.
          </p>
          <Button onClick={() => navigate("/")} className="mt-2">
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
