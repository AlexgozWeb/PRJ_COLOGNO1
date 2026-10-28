import { google } from "googleapis"

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
]

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: SCOPES,
  })
}

export function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() })
}

export function getDriveClient() {
  return google.drive({ version: "v3", auth: getAuth() })
}
