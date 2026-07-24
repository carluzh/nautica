"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Mock partner-waitlist capture. No backend yet, so a valid email just fires a
// confirmation toast. Kept client-side so the /pro page can stay a server
// component that exports metadata.
export function ProWaitlist() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Enter a work email so we can reach you.");
      return;
    }
    setSubmitting(true);
    // Simulate a request. Real capture wires in later.
    window.setTimeout(() => {
      toast.success("You are on the partner list.", {
        description: "We will reach out about a pilot quest shortly.",
      });
      setEmail("");
      setSubmitting(false);
    }, 600);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-3 sm:flex-row"
      noValidate
    >
      <label htmlFor="partner-email" className="sr-only">
        Work email
      </label>
      <Input
        id="partner-email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@lab.org"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={submitting}
        className="h-10 flex-1 bg-background/60"
      />
      <Button type="submit" size="lg" disabled={submitting} className="group shrink-0">
        {submitting ? (
          <>
            <Loader2 className="animate-spin" />
            Joining
          </>
        ) : (
          <>
            Join the waitlist
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </Button>
    </form>
  );
}
