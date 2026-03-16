import { Suspense } from "react";
import CreditUnionJoinClient from "./join-client";

export default function CreditUnionJoinPage() {
  return (
    <Suspense fallback={null}>
      <CreditUnionJoinClient />
    </Suspense>
  );
}

