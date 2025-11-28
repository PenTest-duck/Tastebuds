"use client";

import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Send } from "lucide-react";
import { useState } from "react";
import { Spinner } from "./ui/spinner";
import { toast } from "sonner";

export const RedeemCode = () => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRedeemCode = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe/redeem", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        return toast.error("Failed to redeem code");
      }

      const data = await response.json();
      if (!data.success) {
        return toast.error("Invalid or expired code");
      }

      toast.success("Code redeemed successfully. Refresh to see changes.");
    } catch (error) {
      console.error("Error redeeming code:", error);
      return toast.error("Failed to redeem code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-row items-center gap-2">
      <Input
        type="text"
        placeholder="Redeem code"
        value={code}
        onChange={(e) => setCode(e.target.value.trim())}
        disabled={isLoading}
      />
      <Button variant="outline" onClick={handleRedeemCode} disabled={isLoading}>
        {isLoading ? (
          <Spinner className="size-4" />
        ) : (
          <Send className="size-4" />
        )}
      </Button>
    </div>
  );
};
