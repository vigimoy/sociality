import { Suspense } from "react";
import { SearchPage } from "@/components/sociality/profiles";
export default function Page() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}
