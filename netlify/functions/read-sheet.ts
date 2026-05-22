import type { Handler } from "@netlify/functions";
import * as XLSX from "xlsx";

function extractFileFromMultipart(body: string, isBase64: boolean): Buffer | null {
  const raw = isBase64 ? Buffer.from(body, "base64").toString("binary") : body;

  // Get boundary from first line e.g. "------WebKitFormBoundaryXYZ"
  const firstLine = raw.split("\r\n")[0];
  const boundary = firstLine.trim();
  if (!boundary) return null;

  // Split into parts and find the file part
  const parts = raw.split(boundary);
  for (const part of parts) {
    if (part.includes("Content-Disposition") && part.includes("filename=")) {
      // File data starts after the double CRLF following headers
      const headerEnd = part.indexOf("\r\n\r\n");
      if (headerEnd === -1) continue;
      // Strip trailing CRLF
      const fileData = part.slice(headerEnd + 4).replace(/\r\n$/, "");
      return Buffer.from(fileData, "binary");
    }
  }
  return null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    // 1. Get uploaded file — parse multipart body to extract raw file bytes
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: "No file uploaded" }) };
    }

    const file = extractFileFromMultipart(event.body, event.isBase64Encoded ?? false);
    if (!file) {
      return { statusCode: 400, body: JSON.stringify({ error: "Could not extract file from request" }) };
    }

    // 2. Read workbook from buffer
    const workbook = XLSX.read(file, { type: "buffer" });

    // 3. Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 4. Convert sheet to JSON, filtering out completely empty rows
const jsonData = (XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false }) as any[]).filter((row: any) =>
  Object.values(row).some((val) => val !== "" && val !== null && val !== undefined)
);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Success", data: jsonData }),
    };
  } catch (error: any) {
    console.error("Read Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || "Upload Failed" }),
    };
  }
};