import { ProtectPage } from "frontend/components/auth/ProtectPage";
import { MapEditor } from "frontend/components/maps/MapEditor";
import { useT } from "i18n";
import Head from "next/head";

export default function NewMapPage() {
  const t = useT();

  return (
    <ProtectPage>
      <Head>
        <title>{`${t.mapEditor.titleNew} | Wars World`}</title>
      </Head>
      <MapEditor />
    </ProtectPage>
  );
}
