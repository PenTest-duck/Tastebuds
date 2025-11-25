import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-6rem)] px-4">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground">
          We encountered an error. Please try again later.
        </p>
        <div className="flex justify-center gap-2">
          <Button asChild>
            <Link href="/">Go back home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="mailto:support@usetastebuds.dev">Contact support</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
