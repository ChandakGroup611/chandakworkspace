import { AMCRecordFormPage } from "@/components/amc/AMCRecordPages";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AMCRecordFormPage kind="amc" id={id} />;
}
