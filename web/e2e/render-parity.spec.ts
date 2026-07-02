import { test, expect } from "@playwright/test";

// CSV + Jinja fixture — same values as src/worker/pyodide-runtime.node.test.ts
const CSV_DATA = "id,value\n1,100\n2,N/A\n3,300\n";
const JINJA_TPL = "{% for r in csv_rows %}{{ r.id }}:{{ r.value }}\n{% endfor %}";
const EXPECTED_OUTPUT = "1:100\n2:N/A\n3:300\n";

test("renders the CSV+Jinja fixture byte-identically in the new editor UI", async ({
  page,
}) => {
  // 1. Open a blank editor
  await page.goto("/#/new");

  // 2. Select CSV as the format.
  //    The format Segmented (only visible on the data tab) renders plain <button> elements.
  await page.getByRole("button", { name: "CSV" }).click();

  // 3. Enter CSV data into the data pane's CodeView.
  //    CodeView renders a transparent <textarea> overlay when editable (onChange is provided
  //    and readOnly is not set).  The data tab is active by default; the single textarea in
  //    the left pane is the data editor.
  const dataTextarea = page.locator("textarea").first();
  await dataTextarea.click();
  // fill() selects-all then types the replacement text.
  await dataTextarea.fill(CSV_DATA);

  // 4. Switch to the template tab and enter the Jinja template.
  //    "データ定義" → "テンプレート" button click re-renders the left pane's CodeView.
  await page.getByRole("button", { name: "テンプレート" }).click();
  const tplTextarea = page.locator("textarea").first();
  await tplTextarea.click();
  await tplTextarea.fill(JINJA_TPL);

  // 5. Switch the right pane to "Raw" mode.
  await page.getByRole("button", { name: "Raw" }).click();

  // 6. Poll the raw output.
  //    In Raw mode the right pane renders a *readOnly* CodeView: no <textarea>, just a
  //    positioned highlight <div> whose child <div>s represent individual output lines.
  //    CodeView renders empty lines as a <span>​</span>; we strip that sentinel.
  //    We reconstruct the full string by joining line texts with "\n" and appending the
  //    trailing "\n" that corresponds to the trailing empty-string element after split.
  //
  //    Pyodide boot can take up to ~180 s; the outer test timeout is also 180 s.
  await expect
    .poll(
      async () => {
        return page.evaluate(() => {
          // The workspace grid contains two <section> elements: left (input) and right (output).
          const sections = document.querySelectorAll("section");
          const rightSection = sections[1];
          if (!rightSection) return null;

          // The CodeView for raw output sits inside the flex content <div> (flex: 1).
          // Its highlight layer is a position:absolute <div> containing one child <div>
          // per line of the output string.
          // We find it by looking for the absolute div that holds line rows.
          const absoluteDivs = rightSection.querySelectorAll(
            "div[style*='position: absolute']",
          );

          for (const container of absoluteDivs) {
            // Each direct child div is one output line.
            const lineDivs = Array.from(container.children).filter(
              (el) => el.tagName === "DIV",
            );
            if (lineDivs.length === 0) continue;

            // Reconstruct the raw text: each line div's textContent, with zero-width
            // spaces stripped (CodeView inserts ​ for empty lines).
            const lines = lineDivs.map((div) =>
              (div.textContent ?? "").replace(/​/g, ""),
            );

            // The code string was split by "\n"; the last element is "" for a trailing
            // newline.  If the last line is empty, the join below naturally produces the
            // correct trailing "\n".
            return lines.join("\n");
          }
          return null;
        });
      },
      { timeout: 180_000, intervals: [2_000, 5_000, 10_000] },
    )
    .toBe(EXPECTED_OUTPUT);
});
