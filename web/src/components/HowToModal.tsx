import { useState } from "react";
import workflowSvg from "../../../assets/images/workflow_sequence_diagram_jp.svg?url";
import { t } from "../i18n";

export function HowToModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>{t.howTo}</button>
      {open && (
        <div role="dialog" aria-label={t.howToDialog}>
          <img src={workflowSvg} alt={t.howToDialog} />
          <p>{t.howToText}</p>
          <button type="button" onClick={() => setOpen(false)}>{t.close}</button>
        </div>
      )}
    </>
  );
}
