import type { NextConfig } from "next";

// Cabeceras de seguridad (sin CSP estricta para no romper los scripts de Next).
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

// Datos públicos del proyecto Supabase (la clave anon va en el navegador igual). Si Vercel tiene las
// variables cargadas, mandan esas; si no, el build usa estas para no cortarse.
const SUPABASE_URL = "https://lcqqzufpkbdfitgtdjjk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcXF6dWZwa2JkZml0Z3RkamprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MTk1MjMsImV4cCI6MjEwNjA5NTUyM30.igGfflzJTGQGXaOccPOYYXqS20a536QC-27IIleC7mA";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // iPhone lee este archivo para abrir la app directo al tocar caminaapp.com/r/... o /join-group/... (universal links).
      { source: "/.well-known/apple-app-site-association", headers: [{ key: "Content-Type", value: "application/json" }] },
    ];
  },
};

export default nextConfig;
