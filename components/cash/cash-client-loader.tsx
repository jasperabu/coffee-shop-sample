"use client"

import dynamic from "next/dynamic"
import type { CashClientProps } from "./cash-client"

const CashClient = dynamic(
  () => import("./cash-client").then((m) => m.CashClient),
  { ssr: false }
)

export function CashClientLoader(props: CashClientProps) {
  return <CashClient {...props} />
}
