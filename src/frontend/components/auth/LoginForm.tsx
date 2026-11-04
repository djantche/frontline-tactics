import { Button } from "frontend/ui/Button";
import { TextField } from "frontend/ui/TextField";
import { useT } from "i18n";
import { signIn } from "next-auth/react";
import type { FormEvent } from "react";
import { useState } from "react";
import { FormError } from "./FormError";

type Props = {
  initialError?: string;
  onSuccess: () => void;
};

export default function LoginForm({ initialError, onSuccess }: Props) {
  const t = useT();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const response = await signIn("credentials", { name, password, redirect: false });

    setIsSubmitting(false);

    if (response === undefined) {
      setError(t.auth.serverUnreachable);
    } else if (response.ok) {
      onSuccess();
    } else {
      setError(t.auth.invalidCredentials);
    }
  };

  return (
    <form className="@flex @flex-col @gap-4" onSubmit={(event) => void onSubmit(event)}>
      {error !== undefined && <FormError message={error} />}
      <TextField
        label={t.auth.username}
        autoComplete="username"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <TextField
        label={t.auth.password}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
        {t.auth.submitLogin}
      </Button>
    </form>
  );
}
