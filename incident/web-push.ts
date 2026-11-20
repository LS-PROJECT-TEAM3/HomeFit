import { buildMessages, MAX_ATTEMPTS, type NotifyIncident, type NotifyRecord } from "@/incident/notify";

// spec 021 FR-003~005: 웹 푸시 판단. 순수 함수(보내기는 web-push.server.ts).
// 글은 슬랙 알림과 같게 하려고 슬랙 글(buildMessages)을 그대로 나눠 쓴다(E8: 이름·시군구·AI 요약 없음)

export type PushPayload = { title: string; body: string; url: string };
export type OutgoingPush = { incidentIds: string[]; payload: PushPayload };

/** 슬랙 글 한 통 → 첫 줄 제목, 마지막 줄(링크) 여는 주소, 가운데 본문 */
function toPayload(text: string): PushPayload {
  const lines = text.split("\n");
  const last = lines.at(-1) ?? "";
  const hasUrl = lines.length > 1 && /^https?:\/\//.test(last);
  return { title: lines[0], body: lines.slice(1, hasUrl ? -1 : undefined).join("\n"), url: hasUrl ? last : "" };
}

/** FR-003: 한 사람의 이번 사건들 → 보낼 알림. 6개 이상이면 하나로 묶는다(슬랙 Q20과 같음) */
export function pushPayloads(incidents: readonly NotifyIncident[], baseUrl: string): OutgoingPush[] {
  return buildMessages(incidents, baseUrl).map((message) => ({ incidentIds: message.incidentIds, payload: toPayload(message.text) }));
}

export type PushDevice = { id: string; userId: string; createdAt: string };
type Candidate = NotifyIncident & { userId: string; detectedAt: string };

function due(record: NotifyRecord | undefined): boolean {
  if (!record) return true;
  return record.status === "failed" && record.attempts < MAX_ATTEMPTS;
}

/**
 * FR-004, E1: 보낼 사건과 기기. 사건 주인의 기기 중 사건보다 먼저 켠 것 모두(켜기 전 사건은 안 보냄, 슬랙과 같음).
 * 기록은 사람마다 한 번(spec Q1): 보냄은 다시 안 보내고 실패는 한 번만 다시
 */
export function selectToPush({ incidents, devices, records }: {
  incidents: readonly Candidate[];
  devices: readonly PushDevice[];
  records: ReadonlyMap<string, NotifyRecord>;
}): (Candidate & { deviceIds: string[] })[] {
  return incidents
    .filter((incident) => due(records.get(incident.incidentId)))
    .map((incident) => ({
      ...incident,
      deviceIds: devices.filter((d) => d.userId === incident.userId && d.createdAt <= incident.detectedAt).map((d) => d.id),
    }))
    .filter((incident) => incident.deviceIds.length > 0);
}

/** 묶음 한 통을 보낼 기기: 그 안 사건 모두에 해당하는 기기만(켜기 전 사건이 섞이지 않게, ponytail-review 4번) */
export function bundleDevices(deviceIdsPerIncident: readonly (readonly string[])[]): string[] {
  const [first, ...rest] = deviceIdsPerIncident;
  return (first ?? []).filter((id) => rest.every((ids) => ids.includes(id)));
}

export type PushOutcome = "sent" | "gone" | "failed";

/** FR-005, E4·E5: 푸시 서비스 답. 404·410은 그 기기가 더는 받을 수 없음(지운다), 응답이 없으면 null */
export function pushOutcome(statusCode: number | null): PushOutcome {
  if (statusCode !== null && statusCode >= 200 && statusCode < 300) return "sent";
  if (statusCode === 404 || statusCode === 410) return "gone";
  return "failed";
}

/** E1: 여러 기기 중 하나라도 보냈으면 그 사건은 보냄 */
export function settleIncident(outcomes: readonly PushOutcome[]): "sent" | "failed" {
  return outcomes.includes("sent") ? "sent" : "failed";
}
