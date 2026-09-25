import WainApp from "@/components/WainApp";
import { LangProvider } from "@/lib/i18n";

export default function Home() {
  return (
    <LangProvider>
      <WainApp />
    </LangProvider>
  );
}
