import Link from "next/link";
import { Empty } from "@/app/_components/states";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "관심 주택 | 집 비교 | HomeFit AI" };

// IA CP_040000_PG 관심 주택 목록 (PRD FR-28, spec 004 뼈대: 저장은 다음 단계)
export default function CompareListPage() {
  return (
    <>
      <p><Link href="/compare/new" className={styles.primaryButton}>+ 관심 주택 등록</Link></p>
      <Empty>아직 등록한 관심 주택이 없습니다. 저장 기능은 다음 단계에서 만듭니다.</Empty>
    </>
  );
}
