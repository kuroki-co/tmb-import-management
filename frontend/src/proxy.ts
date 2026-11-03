import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_BACKEND_PROVIDER !== "supabase") {
    return NextResponse.next({ request });
  }

  const { url, publishableKey } = getSupabaseConfig();
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        response.headers.set("Cache-Control", "private, no-store, max-age=0");
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [name, value] of Object.entries(headers)) {
          response.headers.set(name, value);
        }
      },
    },
  });

  // Refresh expired sessions before the protected page renders. Supabase
  // writes rotated tokens back through the response cookie adapter above.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    const redirect = NextResponse.redirect(loginUrl);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    for (const header of ["cache-control", "pragma", "expires"]) {
      const value = response.headers.get(header);
      if (value) redirect.headers.set(header, value);
    }
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/panel/:path*"],
};
