"use client";

import { useEffect } from "react";
import { pingAppwriteOnce } from "@/lib/appwrite/browser";

export function AppwriteConnectionCheck() {
  useEffect(() => {
    void pingAppwriteOnce()
      .then(() => {
        document.documentElement.dataset.appwrite = "connected";
        console.info("Appwrite conectado.");
      })
      .catch((error: unknown) => {
        document.documentElement.dataset.appwrite = "error";
        console.error("Não foi possível conectar ao Appwrite.", error);
      });
  }, []);

  return null;
}

