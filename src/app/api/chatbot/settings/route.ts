import { NextRequest } from "next/server"
import { handleSettings } from "@/features/chatbot/routes"

export async function POST(req: NextRequest) {
  return handleSettings(req)
}
