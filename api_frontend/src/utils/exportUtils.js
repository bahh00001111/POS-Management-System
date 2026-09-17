const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function buildHtml({ title, subtitle, sections }) {
  const blocks = (sections || [])
    .map((section) => {
      const head = (section.columns || [])
        .map(
          (c) =>
            `<th style="background:#6b4f34;color:#ffffff;padding:8px 10px;text-align:left;font-weight:bold;border:1px solid #6b4f34;">${esc(c)}</th>`
        )
        .join("");
      const body = (section.rows || [])
        .map(
          (row) =>
            `<tr>${row
              .map(
                (cell) =>
                  `<td style="padding:6px 10px;border:1px solid #ddd;vertical-align:top;">${esc(cell)}</td>`
              )
              .join("")}</tr>`
        )
        .join("");

      return `
        <h2 style="font-family:Arial,sans-serif;color:#444;margin:18px 0 6px;">${esc(section.heading || "")}</h2>
        <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:12px;" cellspacing="0" cellpadding="0">
          <thead><tr>${head}</tr></thead>
          <tbody>${body || `<tr><td style="padding:8px;border:1px solid #ddd;color:#999;">No data</td></tr>`}</tbody>
        </table>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(title)}</title>
</head>
<body style="font-family:Arial,sans-serif;padding:24px;">
  <h1 style="color:#1c1917;margin:0 0 4px;">${esc(title)}</h1>
  ${subtitle ? `<p style="color:#78716c;margin:0 0 12px;font-style:italic;">${esc(subtitle)}</p>` : ""}
  <hr style="border:none;border-top:2px solid #6b4f34;margin:0 0 8px;"/>
  ${blocks}
  <p style="color:#a8a29e;font-size:11px;margin-top:24px;">Generated on ${new Date().toLocaleString()}</p>
</body>
</html>`;
}

function saveFile(content, filename, mime) {
  const blob = new Blob(["\ufeff", content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const todayString = () => new Date().toISOString().slice(0, 10);

export function exportToExcel({ title = "", subtitle = "", sections = [], filename = "export" }) {
  saveFile(
    buildHtml({ title, subtitle, sections }),
    `${filename.replace(/\.xlsx?$/i, "")}.xls`,
    "application/vnd.ms-excel"
  );
}

export function exportToWord({ title = "", subtitle = "", sections = [], filename = "export" }) {
  saveFile(
    buildHtml({ title, subtitle, sections }),
    `${filename.replace(/\.docx?$/i, "")}.doc`,
    "application/msword"
  );
}