import { TRPCClientError } from "@trpc/client";
import { Button } from "frontend/ui/Button";
import { TextField } from "frontend/ui/TextField";
import { trpc } from "frontend/utils/trpc-client";
import { useT } from "i18n";
import { signIn } from "next-auth/react";
import type { FormEvent } from "react";
import { useState } from "react";
import { signUpSchema } from "shared/schemas/auth";
import { FormError } from "./FormError";

type Props = {
  onSuccess: () => void;
};

type FieldErrors = Partial<Record<"name" | "email" | "password" | "confirmPassword", string>>;

export default function SignupForm({ onSuccess }: Props) {
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string>();
  const register = trpc.user.registerUser.useMutation();

  const validate = () => {
    const parsed = signUpSchema.safeParse({ name, email, password });
    const errors: FieldErrors = {};

    if (!parsed.success) {
      const invalidFields = parsed.error.issues.map((issue) => issue.path[0]);

      if (invalidFields.includes("name")) {
        errors.name = t.auth.usernameRequired;
      }

      if (invalidFields.includes("email")) {
        errors.email = t.auth.emailInvalid;
      }

      if (invalidFields.includes("password")) {
        errors.password = t.auth.passwordLength;
      }
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = t.auth.passwordMismatch;
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);

    if (!validate()) {
      return;
    }

    try {
      await register.mutateAsync({ name, email, password });
    } catch (err) {
      const code =
        err instanceof TRPCClientError ? (err.data as { code?: string } | undefined)?.code : null;
      const isConflict = code === "CONFLICT";
      setError(isConflict ? t.auth.emailTaken : t.auth.signupFailed);
      return;
    }

    const response = await signIn("credentials", { name, password, redirect: false });

    if (response?.ok === true) {
      onSuccess();
    } else {
      setError(t.auth.invalidCredentials);
    }
  };

  return (
    <form className="@flex @flex-col @gap-4" noValidate onSubmit={(event) => void onSubmit(event)}>
      {error !== undefined && <FormError message={error} />}
      <TextField
        label={t.auth.username}
        autoComplete="username"
        value={name}
        error={fieldErrors.name}
        onChange={(event) => setName(event.target.value)}
      />
      <TextField
        label={t.auth.email}
        type="email"
        autoComplete="email"
        value={email}
        error={fieldErrors.email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label={t.auth.password}
        type="password"
        autoComplete="new-password"
        value={password}
        error={fieldErrors.password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <TextField
        label={t.auth.confirmPassword}
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        error={fieldErrors.confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />
      <Button type="submit" size="lg" fullWidth loading={register.isLoading}>
        {t.auth.submitSignup}
      </Button>
    </form>
  );
}
