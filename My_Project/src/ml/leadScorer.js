const { generateLeadFactors } = require('./explainability');

/**
 * Supervised Multi-Factor Lead Scoring Algorithm
 * Combines firmographic fit, behavioral engagement, intent velocity,
 * and qualification signals into an interpretable 0-100 score.
 */
function scoreLead(leadData) {
  let rawScore = 30; // Prior baseline probability

  // 1. Behavioral Touchpoints (Max +25)
  const visits = Number(leadData.website_visits || 0);
  const opens = Number(leadData.email_opens || 0);
  const downloads = Number(leadData.content_downloads || 0);

  rawScore += Math.min(12, visits * 1.5);
  rawScore += Math.min(8, opens * 1.2);
  rawScore += Math.min(10, downloads * 2.5);

  // 2. Firmographic Market Fit (Max +20)
  const size = Number(leadData.company_size || 0);
  if (size >= 1000) rawScore += 18;
  else if (size >= 250) rawScore += 14;
  else if (size >= 50) rawScore += 10;
  else rawScore += 4;

  const industry = (leadData.industry || '').toLowerCase();
  if (['financial services', 'healthcare', 'technology', 'cybersecurity', 'artificial intelligence'].includes(industry)) {
    rawScore += 5;
  }

  // 3. Lead Source Quality (Max +10)
  const source = leadData.lead_source;
  if (source === 'Inbound Demo') rawScore += 10;
  else if (source === 'Partner Referral') rawScore += 9;
  else if (source === 'Event' || source === 'Webinar') rawScore += 6;
  else if (source === 'Organic Search') rawScore += 5;
  else if (source === 'Cold Outreach') rawScore += 2;

  // 4. BANT Qualification Signals (Max +30, or Penalties)
  if (leadData.decision_maker === true || leadData.decision_maker === 1 || leadData.decision_maker === 'true') {
    rawScore += 14;
  } else {
    rawScore -= 6;
  }

  if (leadData.budget_confirmed === true || leadData.budget_confirmed === 1 || leadData.budget_confirmed === 'true') {
    rawScore += 15;
  } else {
    rawScore -= 8;
  }

  // 5. Urgency Calibration
  const urgency = leadData.urgency_level || 'Medium';
  if (urgency === 'Immediate') rawScore += 12;
  else if (urgency === 'High') rawScore += 8;
  else if (urgency === 'Medium') rawScore += 2;
  else if (urgency === 'Low') rawScore -= 7;

  // Clamp score between 5 and 99
  const finalScore = Math.max(5, Math.min(99, Math.round(rawScore)));

  // Derive Grade
  let grade = 'C';
  if (finalScore >= 85) grade = 'A';
  else if (finalScore >= 70) grade = 'B';
  else if (finalScore >= 50) grade = 'C';
  else grade = 'D';

  // Generate explainability breakdown
  const factors = generateLeadFactors({
    ...leadData,
    decision_maker: !!leadData.decision_maker,
    budget_confirmed: !!leadData.budget_confirmed,
    website_visits: visits,
    email_opens: opens,
    company_size: size,
    urgency_level: urgency,
    lead_source: source
  });

  return {
    score: finalScore,
    grade,
    factors
  };
}

module.exports = {
  scoreLead
};
