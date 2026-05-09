import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/v1/tasks", () => {
  it("returns 401 when authorization is missing or not an API key", async () => {
    const noAuth = await GET(new Request("http://localhost/api/v1/tasks"));
    expect(noAuth.status).toBe(401);

    const badBearer = await GET(
      new Request("http://localhost/api/v1/tasks", {
        headers: { Authorization: "Bearer sk_live_xxx" },
      }),
    );
    expect(badBearer.status).toBe(401);
  });
});
