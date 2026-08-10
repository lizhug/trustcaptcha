import { getPrismaClient } from "@trustcaptcha/database";

export type DashboardMetrics = {
  actionBreakdown: Array<{
    action: string;
    averageScore: number;
    success: number;
    total: number;
  }>;
  averageRiskScore: number;
  failedRequests: number;
  riskDistribution: Array<{ bucket: string; count: number }>;
  successRate: number;
  totalRequests: number;
  trend: Array<{ date: string; success: number; total: number }>;
};

type TrendRow = {
  date: string;
  success: number;
  total: number;
};

type RiskRow = {
  bucket: string;
  count: number;
};

type ActionRow = {
  action: string;
  averageScore: number;
  success: number;
  total: number;
};

export async function getDashboardMetrics(
  customerId: string,
): Promise<DashboardMetrics> {
  const prisma = getPrismaClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000);

  const [
    totalRequests,
    successfulRequests,
    scoreAggregate,
    trendRows,
    riskRows,
    actionRows,
  ] = await Promise.all([
    prisma.verificationLog.count({
      where: { customerId, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.verificationLog.count({
      where: {
        customerId,
        createdAt: { gte: thirtyDaysAgo },
        status: "SUCCESS",
      },
    }),
    prisma.verificationLog.aggregate({
      where: { customerId, createdAt: { gte: thirtyDaysAgo } },
      _avg: { score: true },
    }),
    prisma.$queryRaw<TrendRow[]>`
        SELECT
          to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date,
          count(*)::int AS total,
          count(*) FILTER (WHERE status = 'SUCCESS')::int AS success
        FROM verification_logs
        WHERE "customerId" = ${customerId}::uuid
          AND "createdAt" >= now() - interval '14 days'
        GROUP BY date_trunc('day', "createdAt")
        ORDER BY date_trunc('day', "createdAt") ASC
      `,
    prisma.$queryRaw<RiskRow[]>`
        SELECT
          CASE
            WHEN score BETWEEN 0 AND 39 THEN '0–39'
            WHEN score BETWEEN 40 AND 59 THEN '40–59'
            WHEN score BETWEEN 60 AND 79 THEN '60–79'
            WHEN score BETWEEN 80 AND 100 THEN '80–100'
            ELSE 'Unscored'
          END AS bucket,
          count(*)::int AS count
        FROM verification_logs
        WHERE "customerId" = ${customerId}::uuid
          AND "createdAt" >= now() - interval '30 days'
        GROUP BY bucket
        ORDER BY min(score) NULLS FIRST
      `,
    prisma.$queryRaw<ActionRow[]>`
        SELECT
          action,
          count(*)::int AS total,
          count(*) FILTER (WHERE status = 'SUCCESS')::int AS success,
          coalesce(round(avg(score)), 0)::int AS "averageScore"
        FROM verification_logs
        WHERE "customerId" = ${customerId}::uuid
          AND "createdAt" >= now() - interval '30 days'
        GROUP BY action
        ORDER BY count(*) DESC, action ASC
        LIMIT 10
      `,
  ]);

  return {
    actionBreakdown: actionRows,
    averageRiskScore: Math.round(scoreAggregate._avg.score ?? 0),
    failedRequests: totalRequests - successfulRequests,
    riskDistribution: riskRows,
    successRate:
      totalRequests === 0
        ? 0
        : Number(((successfulRequests / totalRequests) * 100).toFixed(1)),
    totalRequests,
    trend: fillTrendGaps(trendRows, 14),
  };
}

function fillTrendGaps(rows: TrendRow[], days: number): TrendRow[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));

  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (days - index - 1));
    const key = date.toISOString().slice(0, 10);
    return byDate.get(key) ?? { date: key, success: 0, total: 0 };
  });
}
