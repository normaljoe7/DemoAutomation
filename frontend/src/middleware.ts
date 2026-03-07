import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// AUTH DISABLED — middleware is a passthrough. Re-enable by restoring the original logic.
export function middleware(_request: NextRequest) {
    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
