'use strict';
const zlib = require('node:zlib');

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return ~crc >>> 0;
}

function createZip(files) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const dataBuf = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, 'utf8');
    const compressed = zlib.deflateRawSync(dataBuf);
    const crc = crc32(dataBuf);

    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(dataBuf.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, compressed);

    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(dataBuf.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt32LE(0, 36);
    centralHeader.writeUInt32LE(offset, 42);
    nameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);
    offset += localHeader.length + compressed.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeCellText(value) {
  let text = String(value ?? '');
  // Neutralize CSV/Excel formula injection vulnerabilities
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = "'" + text;
  }
  return text;
}

function colName(colIndex) {
  let name = '';
  let n = colIndex;
  while (n >= 0) {
    name = String.fromCharCode((n % 26) + 65) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

function buildWorksheetXml(columns, rows) {
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n';
  xml += '<sheetData>\n';

  // Row 1: Header
  xml += '  <row r="1">\n';
  columns.forEach((col, cIdx) => {
    const r = `${colName(cIdx)}1`;
    const val = escapeXml(col.label || col.key);
    xml += `    <c r="${r}" t="inlineStr" s="1"><is><t>${val}</t></is></c>\n`;
  });
  xml += '  </row>\n';

  // Data rows
  rows.forEach((row, rIdx) => {
    const rowNum = rIdx + 2;
    xml += `  <row r="${rowNum}">\n`;
    columns.forEach((col, cIdx) => {
      const r = `${colName(cIdx)}${rowNum}`;
      let val = row[col.key];
      if (Array.isArray(val)) {
        val = val.join(', ');
      }
      if (val === null || val === undefined) {
        val = '';
      }
      val = sanitizeCellText(val);
      const safeVal = escapeXml(val);
      xml += `    <c r="${r}" t="inlineStr"><is><t>${safeVal}</t></is></c>\n`;
    });
    xml += '  </row>\n';
  });

  xml += '</sheetData>\n';
  xml += '</worksheet>';
  return xml;
}

function buildWorkbookXlsx(sheets) {
  // files:
  // [Content_Types].xml
  // _rels/.rels
  // xl/workbook.xml
  // xl/_rels/workbook.xml.rels
  // xl/styles.xml
  // xl/worksheets/sheet1.xml, etc.

  const files = [];

  // 1. [Content_Types].xml
  let ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  ct += '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n';
  ct += '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n';
  ct += '  <Default Extension="xml" ContentType="application/xml"/>\n';
  ct += '  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\n';
  ct += '  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>\n';
  sheets.forEach((_, idx) => {
    ct += `  <Override PartName="/xl/worksheets/sheet${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n`;
  });
  ct += '</Types>';
  files.push({ name: '[Content_Types].xml', data: ct });

  // 2. _rels/.rels
  let rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  rels += '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n';
  rels += '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>\n';
  rels += '</Relationships>';
  files.push({ name: '_rels/.rels', data: rels });

  // 3. xl/workbook.xml
  let wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  wb += '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n';
  wb += '  <sheets>\n';
  sheets.forEach((sheet, idx) => {
    const sId = idx + 1;
    const name = escapeXml(sheet.name.slice(0, 31)); // Excel max sheet name is 31 chars
    wb += `    <sheet name="${name}" sheetId="${sId}" r:id="rId${sId}"/>\n`;
  });
  wb += '  </sheets>\n';
  wb += '</workbook>';
  files.push({ name: 'xl/workbook.xml', data: wb });

  // 4. xl/_rels/workbook.xml.rels
  let wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  wbRels += '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n';
  sheets.forEach((_, idx) => {
    const sId = idx + 1;
    wbRels += `  <Relationship Id="rId${sId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sId}.xml"/>\n`;
  });
  wbRels += `  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>\n`;
  wbRels += '</Relationships>';
  files.push({ name: 'xl/_rels/workbook.xml.rels', data: wbRels });

  // 5. xl/styles.xml (bold headers, simple clean formatting)
  let styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  styles += '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n';
  styles += '  <fonts count="2">\n';
  styles += '    <font><sz val="11"/><name val="Calibri"/></font>\n';
  styles += '    <font><b/><sz val="11"/><name val="Calibri"/></font>\n';
  styles += '  </fonts>\n';
  styles += '  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>\n';
  styles += '  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>\n';
  styles += '  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>\n';
  styles += '  <cellXfs count="2">\n';
  styles += '    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>\n';
  styles += '    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>\n';
  styles += '  </cellXfs>\n';
  styles += '</styleSheet>';
  files.push({ name: 'xl/styles.xml', data: styles });

  // 6. Each worksheet
  sheets.forEach((sheet, idx) => {
    const wsXml = buildWorksheetXml(sheet.columns, sheet.rows);
    files.push({ name: `xl/worksheets/sheet${idx + 1}.xml`, data: wsXml });
  });

  return createZip(files);
}

function buildCsv(columns, rows) {
  const safe = (value) => {
    let text = sanitizeCellText(value);
    return '"' + text.replace(/"/g, '""') + '"';
  };

  const header = columns.map(c => safe(c.label || c.key)).join(',');
  const lines = [header];

  for (const row of rows) {
    const line = columns.map(c => {
      let val = row[c.key];
      if (Array.isArray(val)) val = val.join('; ');
      if (val === null || val === undefined) val = '';
      return safe(val);
    }).join(',');
    lines.push(line);
  }

  // Prepend UTF-8 BOM so Excel opens CSV with correct encoding
  return '\ufeff' + lines.join('\r\n');
}

module.exports = {
  buildWorkbookXlsx,
  buildCsv,
  sanitizeCellText
};

