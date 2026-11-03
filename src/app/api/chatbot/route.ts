import { NextRequest } from "next/server"
import { handleChat } from "@/features/chatbot/routes"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  return handleChat(req)
}
