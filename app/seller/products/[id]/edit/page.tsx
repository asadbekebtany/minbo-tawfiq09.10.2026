"use client";

import { use } from "react";
import { ProductForm } from "@/components/seller/product-form";

export default function SellerEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProductForm mode="edit" productId={id} />;
}
