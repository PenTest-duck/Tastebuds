"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState } from "react";

type FormState = {
  error?: string;
  success?: boolean;
};

type GeneralSettingsFormProps = {
  defaultValues: {
    firstName: string;
    lastName: string;
  };
  action: (
    prevState: FormState,
    formData: FormData
  ) => Promise<FormState> | FormState;
};

const initialState: FormState = {
  error: undefined,
  success: false,
};

export function GeneralSettingsForm({
  defaultValues,
  action,
}: GeneralSettingsFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={defaultValues.firstName}
            placeholder="Jane"
            minLength={2}
            maxLength={64}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={defaultValues.lastName}
            placeholder="Doe"
            minLength={2}
            maxLength={64}
            required
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.success && !state.error && (
        <p className="text-sm text-emerald-600">
          Saved. Your changes are now live.
        </p>
      )}

      <div className="flex items-center justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save changes"}
    </Button>
  );
}
