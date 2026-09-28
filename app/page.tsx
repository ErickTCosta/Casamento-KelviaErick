import { GuestPage } from "@/components/GuestPage";
import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; admin?: string }>;
}) {
  const params = await searchParams;
  if (params.admin === "1") redirect("/admin");
  return <GuestPage inviteId={params.id} />;
}
