import { Suspense } from "react";
import { AuthForm } from "@/components/sociality/forms";
export default function Page() {
  return (
    <Suspense>
      <AuthForm register />
    </Suspense>
  );
}
