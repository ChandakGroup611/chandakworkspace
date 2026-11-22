import { AMCRecordViewPage } from "@/components/amc/AMCRecordPages";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AMCRecordViewPage kind="subscription" id={id} />;
}
