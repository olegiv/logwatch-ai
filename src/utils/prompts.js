/**
 * Claude prompt templates for logwatch analysis
 */

/**
 * Generate analysis prompt for Claude
 * @param {string} logContent - Raw logwatch output
 * @param {string|null} historicalContext - Optional historical context from previous analyses
 * @returns {string} Formatted prompt for Claude
 */
export function getAnalysisPrompt(logContent, historicalContext = null) {
  return `You are a senior system administrator analyzing a logwatch report.

LOGWATCH OUTPUT:
${logContent}

${historicalContext ? `HISTORICAL CONTEXT:\n${historicalContext}\n` : ''}

Analyze this report and provide:

1. SYSTEM STATUS: Overall system health rating (choose one):
   - "Excellent" - No issues, system running optimally
   - "Good" - Minor issues only, system stable
   - "Satisfactory" - Some concerning issues but manageable
   - "Bad" - Multiple serious issues requiring attention
   - "Awful" - Critical failures, immediate action required

2. SUMMARY: Brief 2-3 sentence overview of system health
3. CRITICAL ISSUES: List any security threats, system failures, or urgent problems
4. WARNINGS: List concerning but non-critical issues
5. RECOMMENDATIONS: Actionable steps to address problems
6. KEY METRICS: Extract important numbers (failed logins, errors, disk usage, etc.)

Format your response as JSON with this structure:
{
  "systemStatus": "Excellent|Good|Satisfactory|Bad|Awful",
  "summary": "string",
  "criticalIssues": ["string"],
  "warnings": ["string"],
  "recommendations": ["string"],
  "metrics": {
    "failedLogins": number,
    "errorCount": number,
    "diskUsage": "string"
  }
}

Be concise but thorough. Focus on actionable insights.`;
}

/**
 * Generate trend analysis prompt for historical data
 * @param {Array} recentSummaries - Array of recent analysis summaries
 * @returns {string} Formatted prompt for trend analysis
 */
export function getTrendAnalysisPrompt(recentSummaries) {
  const summariesText = recentSummaries
    .map(s => `Date: ${s.date}\nSummary: ${s.summary}\nCritical: ${s.critical_count}, Warnings: ${s.warning_count}`)
    .join('\n\n');

  return `Based on the following historical logwatch summaries, identify any trends or patterns:

${summariesText}

Provide a brief analysis of:
1. Are issues increasing or decreasing?
2. Are there recurring problems?
3. Any notable patterns?

Keep response under 200 words.`;
}
