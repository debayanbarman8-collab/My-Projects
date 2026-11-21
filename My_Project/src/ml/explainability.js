/**
 * Explainable AI (XAI) Attribution Engine
 * Generates local feature contributions (SHAP-inspired) so sales reps
 * and managers understand WHY a score or win probability was predicted.
 */

function generateLeadFactors(lead) {
  const factors = [];

  // Behavioral signals
  if (lead.decision_maker) {
    factors.push({ name: 'Decision Maker Identified', impact: '+18%', direction: 'positive', description: 'Contact holds VP/C-level purchasing authority' });
  } else {
    factors.push({ name: 'Non-Decision Maker Contact', impact: '-10%', direction: 'negative', description: 'Contact is an influencer or technical evaluator; champion required' });
  }

  if (lead.budget_confirmed) {
    factors.push({ name: 'Budget Confirmed', impact: '+15%', direction: 'positive', description: 'Capital expenditure approved for current fiscal cycle' });
  } else {
    factors.push({ name: 'Unverified Budget', impact: '-12%', direction: 'negative', description: 'Pricing sensitivity likely during proposal stage' });
  }

  if (lead.website_visits >= 8) {
    factors.push({ name: 'High Digital Intent', impact: `+${Math.min(15, lead.website_visits)}%`, direction: 'positive', description: `${lead.website_visits} website sessions in the last 30 days` });
  } else if (lead.website_visits <= 2) {
    factors.push({ name: 'Low Intent Activity', impact: '-8%', direction: 'negative', description: 'Limited initial exploration of product collateral' });
  }

  if (lead.email_opens >= 5) {
    factors.push({ name: 'Strong Cadence Engagement', impact: '+9%', direction: 'positive', description: `${lead.email_opens} sales emails opened and read` });
  }

  if (lead.company_size >= 500) {
    factors.push({ name: 'Enterprise Market Fit', impact: '+12%', direction: 'positive', description: `Company headcount (${lead.company_size}) aligns with high LTV tier` });
  }

  if (lead.urgency_level === 'Immediate' || lead.urgency_level === 'High') {
    factors.push({ name: 'Critical Time-to-Value Requirement', impact: '+10%', direction: 'positive', description: `Lead flagged urgency as "${lead.urgency_level}"` });
  } else if (lead.urgency_level === 'Low') {
    factors.push({ name: 'Long Buying Horizon', impact: '-9%', direction: 'negative', description: 'No immediate purchase deadline established' });
  }

  if (lead.lead_source === 'Inbound Demo' || lead.lead_source === 'Partner Referral') {
    factors.push({ name: 'High-Converting Source', impact: '+11%', direction: 'positive', description: `Inbound request via ${lead.lead_source}` });
  }

  return factors;
}

function generateDealInsights(deal, stage) {
  const top_positive = [];
  const top_risks = [];

  // Stage baseline
  if (deal.stage_id >= 4) {
    top_positive.push(`Advanced Pipeline Progression (${stage ? stage.name : 'Late Stage'})`);
  }

  // Executive sponsorship
  if (deal.has_executive_sponsor) {
    top_positive.push('Active Executive Sponsor Verified (C-Suite / VP Alignment)');
  } else {
    top_risks.push('No Executive Sponsor on record — single-threaded deal risk');
  }

  // Security sign-off
  if (deal.has_security_approval) {
    top_positive.push('Infosec / Compliance Architectural Sign-Off Completed');
  } else if (deal.stage_id >= 4) {
    top_risks.push('Pending Security/Legal Clearance in late stage — potential procurement freeze');
  }

  // Deal stagnation / Velocity
  const targetDays = stage ? stage.target_max_days : 14;
  if (deal.days_in_current_stage > targetDays && deal.stage_id < 6) {
    top_risks.push(`Deal Stalled: In current stage for ${deal.days_in_current_stage} days (Target max: ${targetDays} days)`);
  } else if (deal.days_in_current_stage <= 7 && deal.stage_id < 6) {
    top_positive.push(`High Deal Velocity: Moving swiftly through stage (${deal.days_in_current_stage} days elapsed)`);
  }

  // Discounting impact
  if (deal.discount_percent > 15) {
    top_risks.push(`Heavy Discounting (${deal.discount_percent}%) indicates price pushback or competitive commoditization`);
  } else if (deal.discount_percent <= 5) {
    top_positive.push('Premium Pricing Defensibility: Minimal discounting (<5%)');
  }

  // Touchpoint engagement
  if (deal.total_activities_count >= 18) {
    top_positive.push(`High Engagement Frequency: ${deal.total_activities_count} recorded touchpoints`);
  } else if (deal.total_activities_count < 5 && deal.stage_id > 2) {
    top_risks.push('Low Rep Activity Cadence (<5 logged touchpoints for mid-stage deal)');
  }

  // Competitor presence
  if (deal.competitor && deal.competitor !== 'None') {
    top_risks.push(`Head-to-head competitive evaluation against ${deal.competitor}`);
  }

  return { top_positive, top_risks };
}

module.exports = {
  generateLeadFactors,
  generateDealInsights
};
