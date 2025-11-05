import { NextResponse } from "next/server";

type SubscribeRequest = Record<string, unknown> & {
  email?: unknown;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function readRequestBody(request: Request): Promise<SubscribeRequest> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType || contentType.includes("application/json")) {
    return request
      .json()
      .catch((error) => {
        console.error("Failed to parse JSON subscription payload", error);
        throw new NextResponse(
          JSON.stringify({ error: "Invalid JSON body supplied." }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      });
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      return Object.fromEntries(
        Array.from(formData.entries()).map(([key, value]) => [
          key,
          typeof value === "string" ? value : value.name,
        ])
      );
    } catch (error) {
      console.error("Failed to parse form subscription payload", error);
      throw new NextResponse(
        JSON.stringify({ error: "Invalid form submission received." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  throw new NextResponse(
    JSON.stringify({ error: "Unsupported content type." }),
    {
      status: 415,
      headers: { "Content-Type": "application/json" },
    }
  );
}

function sanitizePayload(data: SubscribeRequest): Record<string, unknown> {
  const sanitizedEntries: Array<[string, unknown]> = [];

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        continue;
      }
      sanitizedEntries.push([key, trimmed]);
      continue;
    }

    if (value !== undefined && value !== null) {
      sanitizedEntries.push([key, value]);
    }
  }

  return Object.fromEntries(sanitizedEntries);
}

export async function POST(request: Request) {
  let data: SubscribeRequest;

  try {
    data = await readRequestBody(request);
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }

    console.error("Unhandled error while reading subscription request", error);
    return NextResponse.json(
      { error: "We couldn’t read your submission. Please try again." },
      { status: 400 }
    );
  }

  const payload = sanitizePayload(data);
  const email = typeof payload.email === "string" ? payload.email : "";

  if (!email || !emailPattern.test(email)) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 }
    );
  }

  const webhookUrl = process.env.ZAPIER_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error("ZAPIER_WEBHOOK_URL is not configured");
    return NextResponse.json(
      {
        error:
          "We’re unable to save your submission right now. Please contact support while we look into it.",
      },
      { status: 500 }
    );
  }

  const submission = {
    ...payload,
    submittedAt: new Date().toISOString(),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1000 * 10);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submission),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const responseText = await response.text();
      console.error("Zapier webhook failed", {
        status: response.status,
        body: responseText,
      });
      return NextResponse.json(
        { error: "We couldn’t save your submission. Please try again." },
        { status: 502 }
      );
    }
  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof Error && error.name === "AbortError") {
      console.error("Zapier webhook request timed out");
      return NextResponse.json(
        {
          error: "The request took too long to complete. Please try again in a moment.",
        },
        { status: 504 }
      );
    }

    console.error("Unexpected error calling Zapier webhook", error);
    return NextResponse.json(
      {
        error: "We ran into an issue while saving your submission. Please try again shortly.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ message: "Thanks! You’re on the list." });
}
