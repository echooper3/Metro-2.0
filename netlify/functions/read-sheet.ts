import type { Handler } from "@netlify/functions";
import * as XLSX from "xlsx";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // 1. Get uploaded file (Netlify sends multipart body as base64)
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No file uploaded" }),
      };
    }

    const file = Buffer.from(
      event.body,
      event.isBase64Encoded ? "base64" : "utf8",
    );

    // 2. Read workbook from buffer
    const workbook = XLSX.read(file, { type: "buffer" });

    // 3. Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 4. Convert sheet to JSON, filtering out completely empty rows
    const jsonData = (XLSX.utils.sheet_to_json(worksheet) as any[]).filter(
      (row: any) =>
        Object.values(row).some(
          (val) => val !== "" && val !== null && val !== undefined,
        ),
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
