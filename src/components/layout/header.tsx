//src\components\layout\header.tsx
import { getCurrentUser } from "@/lib/auth-guards";
import HeaderClient from "./header-client";

export default async function Header() {
  const user = await getCurrentUser();

  return <HeaderClient user={user} />;
}
