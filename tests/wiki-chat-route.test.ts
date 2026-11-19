import { beforeEach, describe, expect, it, vi } from "vitest";

// spec 012 FR-009·FR-014, 경계·예외: /api/wiki-chat의 거절 분기(401·403·502·400·429·502). DB·AI는 가짜로 바꾼다(PR #15 리뷰 4)
const fake = vi.hoisted(() => ({
  userId: "admin-1" as string | null,
  rpc: { data: true as unknown, error: null as unknown },
  answer: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/server", () => ({
  currentUserId: async () => fake.userId,
  createClient: async () => ({ rpc: async () => fake.rpc }),
}));
vi.mock("@/chat/wiki-chat.server", () => ({ answerWikiQuestion: fake.answer }));

const { POST } = await import("@/app/api/wiki-chat/route");

const ask = (body: unknown) => POST(new Request("http://localhost/api/wiki-chat", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/wiki-chat 거절 분기", () => {
  beforeEach(() => {
    fake.userId = "admin-1";
    fake.rpc = { data: true, error: null };
    fake.answer.mockReset();
  });

  it("로그인 안 함 → 401, 답을 만들지 않는다", async () => {
    fake.userId = null;
    expect((await ask({ question: "승인 규칙?" })).status).toBe(401);
    expect(fake.answer).not.toHaveBeenCalled();
  });

  it("관리자 확인 실패 → 502", async () => {
    fake.rpc = { data: null, error: { message: "db down" } };
    expect((await ask({ question: "승인 규칙?" })).status).toBe(502);
  });

  it("일반 사용자 → 403, 답을 만들지 않는다", async () => {
    fake.rpc = { data: false, error: null };
    expect((await ask({ question: "승인 규칙?" })).status).toBe(403);
    expect(fake.answer).not.toHaveBeenCalled();
  });

  it("빈 질문·301자 → 400", async () => {
    expect((await ask({ question: "  " })).status).toBe(400);
    expect((await ask({ question: "가".repeat(301) })).status).toBe(400);
    expect(fake.answer).not.toHaveBeenCalled();
  });

  it("오늘 한도를 다 씀 → 429", async () => {
    fake.answer.mockResolvedValue({ kind: "limit" });
    const res = await ask({ question: "승인 규칙?" });
    expect(res.status).toBe(429);
    expect((await res.json()).error).toContain("한도");
  });

  it("답 만들기 실패 → 502, 오류 내용은 돌려주지 않는다", async () => {
    fake.answer.mockRejectedValue(new Error("secret detail"));
    const res = await ask({ question: "승인 규칙?" });
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("secret detail");
  });

  it("관리자 질문 → 200과 답", async () => {
    fake.answer.mockResolvedValue({ kind: "answer", answer: "답", sources: [], isMock: true, remaining: 19 });
    const res = await ask({ question: "승인 규칙?" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ answer: "답", remaining: 19 });
  });
});
