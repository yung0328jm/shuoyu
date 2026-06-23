import { RemunerationFormPanel } from "@/components/RemunerationFormPanel";

export default function RemunerationPage() {
  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-[#f0c040]">勞務報酬單</h1>
      <RemunerationFormPanel />
    </div>
  );
}
