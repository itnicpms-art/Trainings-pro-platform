import "server-only";

export type HomepageMetricsData = {
  activeLearners: number | null;
  availableCourses: number | null;
  partnerUniversities: number | null;
  learnerSatisfaction: number | null;
};

/**
 * Public homepage metrics boundary.
 *
 * Keep values null until a public-safe aggregated source exists. Future queries
 * must respect RLS, expose no personal data, and never use a service-role key in
 * the public rendering path.
 */
export async function getHomepageMetrics(): Promise<HomepageMetricsData> {
  return {
    activeLearners: null,
    availableCourses: null,
    partnerUniversities: null,
    learnerSatisfaction: null,
  };
}
