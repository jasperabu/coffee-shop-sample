"use client"

import dynamic from "next/dynamic"
import type { InventoryClientProps } from "./inventory-client"

const InventoryClient = dynamic(
  () => import("./inventory-client").then((m) => m.InventoryClient),
  { ssr: false }
)

export function InventoryClientLoader(props: InventoryClientProps) {
  return <InventoryClient {...props} />
}