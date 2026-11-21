const { query } = require('../config/db');

async function getCustomerOverview(req, res, next) {
  try {
    const user = req.user || { id: 101, name: 'David Sterling', email: 'd.sterling@apexfinancial.demo', account_id: 1, role: 'customer' };
    const accountId = user.account_id || 1;

    // Fetch account details
    const [accounts] = await query('SELECT * FROM accounts WHERE id = ?', [accountId]);
    const account = accounts[0] || {
      id: 1,
      name: 'Apex Financial Cloud',
      industry: 'Financial Services',
      employees: 2400,
      tier: 'Tier-1 Enterprise'
    };

    // Fetch deals for this account
    const [deals] = await query('SELECT * FROM opportunities WHERE account_id = ? ORDER BY id DESC', [accountId]);
    const primaryDeal = deals[0] || {
      id: 1,
      title: 'Apex Financial - Multi-Region RevOps Modernization',
      amount: 285000,
      stage_id: 5,
      stage_name: 'Negotiation & Legal',
      expected_close_date: '2026-12-15',
      discount_percent: 6.5
    };

    // Fetch assigned sales representative
    const repId = primaryDeal.assigned_rep_id || account.assigned_rep_id || 3;
    const [reps] = await query('SELECT id, name, email, phone, avatar_url, role FROM users WHERE id = ?', [repId]);
    const assignedRep = reps[0] || {
      name: 'Sarah Jenkins',
      email: 'sarah.j@revpulse.io',
      phone: '+1 (555) 456-7890',
      avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      role: 'Senior Enterprise Account Executive'
    };

    // Fetch customer messages/activities
    const [activities] = await query('SELECT * FROM activities WHERE opportunity_id = ? ORDER BY id DESC LIMIT 10', [primaryDeal.id]);

    // Implementation milestones
    const milestones = [
      { id: 1, title: 'Technical Architecture & API Scoping', status: 'Completed', date: '2026-10-15', lead: 'Sarah Jenkins (RevPulse)' },
      { id: 2, title: 'Security Architecture & SOC2 Type II Audit', status: 'Completed', date: '2026-11-04', lead: 'David Sterling (Apex)' },
      { id: 3, title: 'Master Services Agreement & Procurement Redlines', status: 'In Progress', date: 'Target: 2026-12-05', lead: 'Legal Council' },
      { id: 4, title: 'Production Cluster Provisioning & Go-Live', status: 'Upcoming', date: 'Scheduled: 2027-01-15', lead: 'DevOps & Implementation' }
    ];

    // Documents Vault
    const documents = [
      { id: 'doc-1', title: 'Master Services Agreement (MSA) Draft V2.pdf', type: 'Contract', size: '2.4 MB', status: 'Under Review', date: '2026-11-18' },
      { id: 'doc-2', title: 'SOC2 Type II Compliance Report 2026.pdf', type: 'Security', size: '4.8 MB', status: 'Verified & Signed', date: '2026-11-02' },
      { id: 'doc-3', title: 'Enterprise Service Level Agreement (SLA 99.99%).pdf', type: 'SLA', size: '1.1 MB', status: 'Approved', date: '2026-11-10' },
      { id: 'doc-4', title: 'Mutual Non-Disclosure Agreement (Executed).pdf', type: 'NDA', size: '850 KB', status: 'Executed', date: '2026-09-28' }
    ];

    // Commercial breakdown
    const pricingItems = [
      { item: 'RevPulse Enterprise Core Platform (Multi-Region)', qty: 'Unlimited Seats', price: 220000 },
      { item: 'ML Revenue Intelligence & Predictive Lead Engine', qty: 'Active License', price: 45000 },
      { item: 'Dedicated 24/7 Technical Account Manager & 99.99% SLA', qty: 'Annual Package', price: 20000 }
    ];

    res.json({
      success: true,
      data: {
        customer: {
          id: user.id,
          name: user.name || 'David Sterling',
          email: user.email || 'd.sterling@apexfinancial.demo',
          title: user.title || 'VP of Engineering',
          company: account.name
        },
        account,
        primaryDeal,
        assignedRep,
        milestones,
        documents,
        pricing: {
          items: pricingItems,
          subtotal: 285000,
          discount_applied: `${primaryDeal.discount_percent || 6.5}% Enterprise Volume Discount applied`,
          final_arr: primaryDeal.amount
        },
        recentActivities: activities
      }
    });
  } catch (err) {
    next(err);
  }
}

async function sendCustomerMessage(req, res, next) {
  try {
    const { message, deal_id = 1 } = req.body;
    const user = req.user || { id: 101, name: 'David Sterling' };

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const [deals] = await query('SELECT * FROM opportunities WHERE id = ?', [deal_id]);
    const repId = deals && deals[0] ? deals[0].assigned_rep_id : 3;

    await query(
      `INSERT INTO activities (type, title, description, opportunity_id, rep_id, sentiment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'Email',
        `Client Inquiry from ${user.name}`,
        message,
        deal_id,
        repId,
        'Positive'
      ]
    );

    res.json({
      success: true,
      message: 'Your message has been delivered to your Account Executive. A response will be provided shortly.'
    });
  } catch (err) {
    next(err);
  }
}

async function calculateCustomerROI(req, res, next) {
  try {
    const {
      sales_team_size = 50,
      avg_rep_salary = 110000,
      hours_saved_weekly_per_rep = 5,
      win_rate_increase_pct = 4.5,
      current_annual_revenue = 45000000
    } = req.body;

    const teamSize = Number(sales_team_size);
    const salary = Number(avg_rep_salary);
    const hoursSaved = Number(hours_saved_weekly_per_rep);
    const hourlyRate = salary / (50 * 40); // 50 weeks, 40 hours/week

    // Time savings value
    const annualTimeSavings = Math.round(teamSize * (hoursSaved * 50) * hourlyRate);

    // Revenue uplift from win rate improvement
    const revenueUplift = Math.round(Number(current_annual_revenue) * (Number(win_rate_increase_pct) / 100));

    const totalAnnualValue = annualTimeSavings + revenueUplift;
    const estimatedPlatformCost = 150000;
    const netReturn = totalAnnualValue - estimatedPlatformCost;
    const roiPercentage = Math.round((netReturn / estimatedPlatformCost) * 100);
    const paybackMonths = Math.max(1, Math.round((estimatedPlatformCost / (totalAnnualValue / 12)) * 10) / 10);

    res.json({
      success: true,
      data: {
        annual_time_savings: annualTimeSavings,
        revenue_uplift: revenueUplift,
        total_annual_value: totalAnnualValue,
        estimated_platform_cost: estimatedPlatformCost,
        net_return: netReturn,
        roi_percentage: roiPercentage,
        payback_months: paybackMonths
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCustomerOverview,
  sendCustomerMessage,
  calculateCustomerROI
};
