import { Sidebar } from "@/components/Sidebar";
import dynamic from "next/dynamic";

const FloatingAssistant = dynamic(
  () => import("@/components/FloatingAssistant").then((m) => m.FloatingAssistant),
  { ssr: false }
);

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <FloatingAssistant
        initialMessage="Olá! Posso te ajudar a entender laudos, encontrar artefatos aprovados ou tirar dúvidas sobre o processo de auditoria."
      />
    </div>
  );
}
