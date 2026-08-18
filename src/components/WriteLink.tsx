"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { isEditor } from "@/lib/editors";

export default function WriteLink() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => setShow(isEditor(u)));
  }, []);

  if (!show) return null;
  return (
    <Link
      href="/write"
      className="rounded-full px-3 py-1.5 text-slate-700 transition hover:bg-brand-bg hover:text-ink"
    >
      ✏️ Write
    </Link>
  );
}
