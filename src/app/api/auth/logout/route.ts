import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Determine appropriate domain for cookie
    const requestHost = request.headers.get("host");
    const requestOrigin = request.headers.get("origin");
    let cookieDomain: string | undefined = undefined;

    // Set domain for Cloudflare tunnel or production
    if (
      requestHost?.includes("imajinasset.biz.id") ||
      requestOrigin?.includes("imajinasset.biz.id")
    ) {
      cookieDomain = ".imajinasset.biz.id";
    } else if (process.env.NODE_ENV === "production") {
      cookieDomain = ".imajinasset.biz.id";
    }

    console.log("Logout - Determined cookie domain:", cookieDomain);

    const forwardedProto = request.headers.get("x-forwarded-proto");
    const isSecureRequest =
      forwardedProto === "https" ||
      requestOrigin?.startsWith("https://") ||
      request.nextUrl.protocol === "https:";

    console.log("Logout - Using secure cookie:", isSecureRequest);

    // Clear auth token cookie
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: isSecureRequest,
      sameSite: isSecureRequest ? "none" : "lax",
      maxAge: 0,
      path: "/",
      domain: cookieDomain,
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
