import type { Handler } from "@netlify/functions";
import * as XLSX from "xlsx";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: "No file uploaded" }) };
    }

    const buffer = Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Success", data: jsonData }),
    };
  } catch (error: any) {
    console.error("Read Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error?.message || "Upload Failed" }) };
  }
};