import { NextRequest } from "next/server"
import { handleUsers } from "@/features/chatbot/routes"

export async function POST(req: NextRequest) {
  return handleUsers(req)
}
