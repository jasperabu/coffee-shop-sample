"use client"

import dynamic from "next/dynamic"
import type { ProductsClientProps } from "./products-client"

// ssr: false must live in a Client Component — not a Server Component page.
// This thin wrapper handles that so the page can stay a pure Server Component.
const ProductsClient = dynamic(
  () => import("./products-client").then((m) => m.ProductsClient),
  { ssr: false }
)

export function ProductsClientLoader(props: ProductsClientProps) {
  return <ProductsClient {...props} />
}
