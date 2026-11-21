const bcrypt = require('bcryptjs');

const defaultPasswordHash = bcrypt.hashSync('Password123!', 8);

const territories = [
  { id: 1, name: 'North America - Enterprise', region: 'North America', tier: 'Enterprise', min_company_size: 500, max_company_size: 1000000, target_industry: 'All', description: 'Large enterprise accounts across US & Canada (>500 employees)' },
  { id: 2, name: 'North America - Mid-Market', region: 'North America', tier: 'Mid-Market', min_company_size: 100, max_company_size: 499, target_industry: 'Technology, Financial Services', description: 'Growth-stage companies in North America' },
  { id: 3, name: 'EMEA - Multi-Regional', region: 'EMEA', tier: 'Enterprise', min_company_size: 250, max_company_size: 500000, target_industry: 'FinTech, Healthcare, Industrial', description: 'Europe, Middle East, and Africa strategic accounts' },
  { id: 4, name: 'APAC - High Growth', region: 'APAC', tier: 'Mid-Market', min_company_size: 50, max_company_size: 50000, target_industry: 'E-commerce, SaaS, Telecom', description: 'Asia Pacific expanding territories' }
];

const users = [
  { id: 1, name: 'Elena Vance', email: 'elena.vance@revpulse.io', password_hash: defaultPasswordHash, role: 'sales_ops_admin', territory_id: 1, phone: '+1 (555) 234-5678', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', status: 'active' },
  { id: 2, name: 'Marcus Sterling', email: 'marcus.s@revpulse.io', password_hash: defaultPasswordHash, role: 'sales_manager', territory_id: 1, phone: '+1 (555) 345-6789', avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150', status: 'active' },
  { id: 3, name: 'Sarah Jenkins', email: 'sarah.j@revpulse.io', password_hash: defaultPasswordHash, role: 'account_executive', territory_id: 1, phone: '+1 (555) 456-7890', avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', status: 'active' },
  { id: 4, name: 'Liam Chen', email: 'liam.chen@revpulse.io', password_hash: defaultPasswordHash, role: 'account_executive', territory_id: 2, phone: '+1 (555) 567-8901', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', status: 'active' },
  { id: 5, name: 'Priya Patel', email: 'priya.p@revpulse.io', password_hash: defaultPasswordHash, role: 'account_executive', territory_id: 3, phone: '+1 (555) 678-9012', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', status: 'active' },
  { id: 6, name: 'Carlos Rodriguez', email: 'carlos.r@revpulse.io', password_hash: defaultPasswordHash, role: 'account_executive', territory_id: 4, phone: '+1 (555) 789-0123', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', status: 'active' },
  { id: 7, name: 'Emma Watson', email: 'emma.w@revpulse.io', password_hash: defaultPasswordHash, role: 'sales_dev_rep', territory_id: 2, phone: '+1 (555) 890-1234', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', status: 'active' },
  // Enterprise Customer Portal Accounts
  { id: 101, name: 'David Sterling', email: 'd.sterling@apexfinancial.demo', password_hash: defaultPasswordHash, role: 'customer', account_id: 1, phone: '+1 (555) 911-2233', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', status: 'active', title: 'VP of Engineering', company: 'Apex Financial Cloud' },
  { id: 102, name: 'Dr. Rachel Zhao', email: 'rachel.z@neurolinkhealth.demo', password_hash: defaultPasswordHash, role: 'customer', account_id: 2, phone: '+1 (555) 822-3344', avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', status: 'active', title: 'Chief Medical Information Officer', company: 'NeuroLink Health Systems' },
  { id: 103, name: 'Samantha Vogel', email: 'svogel@cybershieldzero.demo', password_hash: defaultPasswordHash, role: 'customer', account_id: 4, phone: '+1 (555) 733-4455', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', status: 'active', title: 'CISO', company: 'CyberShield Zero' }
];

const stages = [
  { id: 1, name: 'Discovery & Qualification', stage_order: 1, default_probability: 10.0, is_closed: false, is_won: false, target_max_days: 10 },
  { id: 2, name: 'Solution Demo', stage_order: 2, default_probability: 25.0, is_closed: false, is_won: false, target_max_days: 14 },
  { id: 3, name: 'Technical Validation (POC)', stage_order: 3, default_probability: 50.0, is_closed: false, is_won: false, target_max_days: 21 },
  { id: 4, name: 'Proposal & Pricing', stage_order: 4, default_probability: 70.0, is_closed: false, is_won: false, target_max_days: 14 },
  { id: 5, name: 'Negotiation & Legal', stage_order: 5, default_probability: 85.0, is_closed: false, is_won: false, target_max_days: 14 },
  { id: 6, name: 'Closed Won', stage_order: 6, default_probability: 100.0, is_closed: true, is_won: true, target_max_days: 0 },
  { id: 7, name: 'Closed Lost', stage_order: 7, default_probability: 0.0, is_closed: true, is_won: false, target_max_days: 0 }
];

const accounts = [
  { id: 1, name: 'Apex Financial Cloud', industry: 'Financial Services', employees: 2400, annual_revenue: 120000000.00, website: 'https://apexfinancial.demo', tier: 'Tier-1 Enterprise', assigned_rep_id: 3, territory_id: 1 },
  { id: 2, name: 'NeuroLink Health Systems', industry: 'Healthcare', employees: 4200, annual_revenue: 340000000.00, website: 'https://neurolinkhealth.demo', tier: 'Tier-1 Enterprise', assigned_rep_id: 3, territory_id: 1 },
  { id: 3, name: 'Skyward Logistics Corp', industry: 'Transportation & Logistics', employees: 850, annual_revenue: 45000000.00, website: 'https://skywardlogistics.demo', tier: 'Tier-2 Mid-Market', assigned_rep_id: 4, territory_id: 2 },
  { id: 4, name: 'CyberShield Zero', industry: 'Cybersecurity', employees: 320, annual_revenue: 28000000.00, website: 'https://cybershieldzero.demo', tier: 'Tier-2 Mid-Market', assigned_rep_id: 4, territory_id: 2 },
  { id: 5, name: 'HyperScale AI Labs', industry: 'Artificial Intelligence', employees: 180, annual_revenue: 35000000.00, website: 'https://hyperscaleai.demo', tier: 'Tier-2 Mid-Market', assigned_rep_id: 5, territory_id: 3 },
  { id: 6, name: 'BioNova Pharmaceuticals', industry: 'Biotechnology', employees: 3100, annual_revenue: 520000000.00, website: 'https://bionovapharma.demo', tier: 'Tier-1 Enterprise', assigned_rep_id: 5, territory_id: 3 },
  { id: 7, name: 'OmniCommerce Global', industry: 'E-commerce & Retail', employees: 1200, annual_revenue: 95000000.00, website: 'https://omnicommerce.demo', tier: 'Tier-1 Enterprise', assigned_rep_id: 6, territory_id: 4 },
  { id: 8, name: 'FinTech Forge Singapore', industry: 'Financial Services', employees: 420, annual_revenue: 60000000.00, website: 'https://fintechforge.demo', tier: 'Tier-2 Mid-Market', assigned_rep_id: 6, territory_id: 4 },
  { id: 9, name: 'DataSphere Networks', industry: 'Telecommunications', employees: 5500, annual_revenue: 850000000.00, website: 'https://dataspherenet.demo', tier: 'Tier-1 Enterprise', assigned_rep_id: 3, territory_id: 1 },
  { id: 10, name: 'Quantum Analytics SaaS', industry: 'Software & SaaS', employees: 210, annual_revenue: 18000000.00, website: 'https://quantumanalytics.demo', tier: 'Tier-3 SMB', assigned_rep_id: 4, territory_id: 2 }
];

const leads = [
  { id: 1, first_name: 'David', last_name: 'Sterling', email: 'd.sterling@apexfinancial.demo', company: 'Apex Financial Cloud', title: 'VP of Engineering', industry: 'Financial Services', company_size: 2400, annual_revenue: 120000000.00, lead_source: 'Inbound Demo', status: 'Converted', assigned_to: 3, territory_id: 1, website_visits: 14, email_opens: 8, content_downloads: 4, decision_maker: true, budget_confirmed: true, urgency_level: 'High', ml_score: 94, ml_grade: 'A', converted_deal_id: 1 },
  { id: 2, first_name: 'Rachel', last_name: 'Zhao', email: 'rachel.z@neurolinkhealth.demo', company: 'NeuroLink Health Systems', title: 'Chief Medical Information Officer', industry: 'Healthcare', company_size: 4200, annual_revenue: 340000000.00, lead_source: 'Partner Referral', status: 'Converted', assigned_to: 3, territory_id: 1, website_visits: 9, email_opens: 6, content_downloads: 3, decision_maker: true, budget_confirmed: true, urgency_level: 'High', ml_score: 91, ml_grade: 'A', converted_deal_id: 2 },
  { id: 3, first_name: 'Robert', last_name: 'King', email: 'rking@skywardlogistics.demo', company: 'Skyward Logistics Corp', title: 'Head of Supply Chain IT', industry: 'Transportation & Logistics', company_size: 850, annual_revenue: 45000000.00, lead_source: 'Organic Search', status: 'Converted', assigned_to: 4, territory_id: 2, website_visits: 7, email_opens: 5, content_downloads: 2, decision_maker: false, budget_confirmed: true, urgency_level: 'Medium', ml_score: 76, ml_grade: 'B', converted_deal_id: 3 },
  { id: 4, first_name: 'Samantha', last_name: 'Vogel', email: 'svogel@cybershieldzero.demo', company: 'CyberShield Zero', title: 'Chief Information Security Officer', industry: 'Cybersecurity', company_size: 320, annual_revenue: 28000000.00, lead_source: 'Webinar', status: 'Converted', assigned_to: 4, territory_id: 2, website_visits: 12, email_opens: 7, content_downloads: 5, decision_maker: true, budget_confirmed: true, urgency_level: 'Immediate', ml_score: 96, ml_grade: 'A', converted_deal_id: 4 },
  { id: 5, first_name: 'Alexandre', last_name: 'Dubois', email: 'adubois@hyperscaleai.demo', company: 'HyperScale AI Labs', title: 'Director of Machine Learning', industry: 'Artificial Intelligence', company_size: 180, annual_revenue: 35000000.00, lead_source: 'Inbound Demo', status: 'Converted', assigned_to: 5, territory_id: 3, website_visits: 11, email_opens: 9, content_downloads: 3, decision_maker: true, budget_confirmed: false, urgency_level: 'High', ml_score: 82, ml_grade: 'B', converted_deal_id: 5 },
  { id: 6, first_name: 'Klaus', last_name: 'Muller', email: 'k.muller@bionovapharma.demo', company: 'BioNova Pharmaceuticals', title: 'VP of Enterprise Infrastructure', industry: 'Biotechnology', company_size: 3100, annual_revenue: 520000000.00, lead_source: 'Event', status: 'Converted', assigned_to: 5, territory_id: 3, website_visits: 6, email_opens: 4, content_downloads: 2, decision_maker: true, budget_confirmed: true, urgency_level: 'Medium', ml_score: 87, ml_grade: 'B', converted_deal_id: 6 },
  { id: 7, first_name: 'Mei-Ling', last_name: 'Tan', email: 'meiling.tan@omnicommerce.demo', company: 'OmniCommerce Global', title: 'Chief Technology Officer', industry: 'E-commerce & Retail', company_size: 1200, annual_revenue: 95000000.00, lead_source: 'Inbound Demo', status: 'Converted', assigned_to: 6, territory_id: 4, website_visits: 15, email_opens: 10, content_downloads: 6, decision_maker: true, budget_confirmed: true, urgency_level: 'Immediate', ml_score: 98, ml_grade: 'A', converted_deal_id: 7 },
  { id: 8, first_name: 'Kenji', last_name: 'Sato', email: 'ksato@fintechforge.demo', company: 'FinTech Forge Singapore', title: 'Head of Core Banking Solutions', industry: 'Financial Services', company_size: 420, annual_revenue: 60000000.00, lead_source: 'Partner Referral', status: 'Converted', assigned_to: 6, territory_id: 4, website_visits: 8, email_opens: 5, content_downloads: 2, decision_maker: false, budget_confirmed: true, urgency_level: 'Medium', ml_score: 79, ml_grade: 'B', converted_deal_id: 8 },
  { id: 9, first_name: 'Arthur', last_name: 'Pendelton', email: 'arthur.p@dataspherenet.demo', company: 'DataSphere Networks', title: 'EVP of Network Architecture', industry: 'Telecommunications', company_size: 5500, annual_revenue: 850000000.00, lead_source: 'Inbound Demo', status: 'Converted', assigned_to: 3, territory_id: 1, website_visits: 18, email_opens: 12, content_downloads: 7, decision_maker: true, budget_confirmed: true, urgency_level: 'High', ml_score: 97, ml_grade: 'A', converted_deal_id: 9 },
  { id: 10, first_name: 'Jessica', last_name: 'Bates', email: 'jessica@quantumanalytics.demo', company: 'Quantum Analytics SaaS', title: 'VP Product Engineering', industry: 'Software & SaaS', company_size: 210, annual_revenue: 18000000.00, lead_source: 'Organic Search', status: 'Qualified', assigned_to: 4, territory_id: 2, website_visits: 8, email_opens: 6, content_downloads: 3, decision_maker: true, budget_confirmed: true, urgency_level: 'Medium', ml_score: 84, ml_grade: 'B', converted_deal_id: null },
  { id: 11, first_name: 'Vikram', last_name: 'Deshmukh', email: 'vikram.d@cloudzenith.demo', company: 'CloudZenith Solutions', title: 'Director of DevOps', industry: 'Software & SaaS', company_size: 340, annual_revenue: 29000000.00, lead_source: 'Inbound Demo', status: 'Qualified', assigned_to: 4, territory_id: 2, website_visits: 10, email_opens: 7, content_downloads: 4, decision_maker: true, budget_confirmed: false, urgency_level: 'High', ml_score: 83, ml_grade: 'B', converted_deal_id: null },
  { id: 12, first_name: 'Helena', last_name: 'Rostova', email: 'hrostova@nordicgrid.demo', company: 'Nordic Energy Grid', title: 'Head of SCADA Infrastructure', industry: 'Energy & Utilities', company_size: 1900, annual_revenue: 210000000.00, lead_source: 'Cold Outreach', status: 'Contacted', assigned_to: 5, territory_id: 3, website_visits: 4, email_opens: 3, content_downloads: 1, decision_maker: true, budget_confirmed: false, urgency_level: 'Low', ml_score: 62, ml_grade: 'C', converted_deal_id: null },
  { id: 13, first_name: 'Tariq', last_name: 'Al-Mansoor', email: 'talmansoor@emiratestech.demo', company: 'Emirates Telecom Digital', title: 'Chief Operations Officer', industry: 'Telecommunications', company_size: 3800, annual_revenue: 410000000.00, lead_source: 'Event', status: 'Qualified', assigned_to: 5, territory_id: 3, website_visits: 11, email_opens: 8, content_downloads: 5, decision_maker: true, budget_confirmed: true, urgency_level: 'High', ml_score: 93, ml_grade: 'A', converted_deal_id: null },
  { id: 14, first_name: 'Chao', last_name: 'Xue', email: 'cxue@dragonfleet.demo', company: 'Dragon Fleet Logistics', title: 'VP Global Supply Systems', industry: 'Transportation & Logistics', company_size: 2900, annual_revenue: 190000000.00, lead_source: 'Partner Referral', status: 'New', assigned_to: 6, territory_id: 4, website_visits: 3, email_opens: 2, content_downloads: 0, decision_maker: false, budget_confirmed: false, urgency_level: 'Medium', ml_score: 51, ml_grade: 'C', converted_deal_id: null },
  { id: 15, first_name: 'Gemma', last_name: 'Connolly', email: 'gemma@hiberniapay.demo', company: 'Hibernia Pay EU', title: 'Head of Payment Security', industry: 'Financial Services', company_size: 480, annual_revenue: 55000000.00, lead_source: 'Inbound Demo', status: 'Qualified', assigned_to: 5, territory_id: 3, website_visits: 13, email_opens: 9, content_downloads: 6, decision_maker: true, budget_confirmed: true, urgency_level: 'Immediate', ml_score: 95, ml_grade: 'A', converted_deal_id: null },
  { id: 16, first_name: 'Trevor', last_name: 'Morrison', email: 'trevor@cascadebiologics.demo', company: 'Cascade Biologics', title: 'Director of Clinical Trial Data', industry: 'Healthcare', company_size: 720, annual_revenue: 68000000.00, lead_source: 'Webinar', status: 'Contacted', assigned_to: 3, territory_id: 1, website_visits: 5, email_opens: 4, content_downloads: 2, decision_maker: false, budget_confirmed: true, urgency_level: 'Low', ml_score: 68, ml_grade: 'B', converted_deal_id: null },
  { id: 17, first_name: 'Lucas', last_name: 'Moretti', email: 'lmoretti@paulistaauto.demo', company: 'Paulista Mobility Corp', title: 'Fleet Systems Architect', industry: 'Automotive', company_size: 1400, annual_revenue: 88000000.00, lead_source: 'Cold Outreach', status: 'New', assigned_to: 6, territory_id: 4, website_visits: 2, email_opens: 1, content_downloads: 0, decision_maker: false, budget_confirmed: false, urgency_level: 'Low', ml_score: 41, ml_grade: 'D', converted_deal_id: null },
  { id: 18, first_name: 'Nadia', last_name: 'Kovacs', email: 'nkovacs@danubedata.demo', company: 'Danube Cloud Grid', title: 'VP Infrastructure Engineering', industry: 'Technology', company_size: 610, annual_revenue: 47000000.00, lead_source: 'Inbound Demo', status: 'Qualified', assigned_to: 5, territory_id: 3, website_visits: 9, email_opens: 6, content_downloads: 3, decision_maker: true, budget_confirmed: true, urgency_level: 'High', ml_score: 88, ml_grade: 'A', converted_deal_id: null }
];

const opportunities = [
  {
    id: 1,
    title: 'Apex Financial - Multi-Region RevOps Modernization',
    account_id: 1,
    lead_id: 1,
    stage_id: 5, // Negotiation & Legal
    amount: 285000.00,
    expected_close_date: '2026-12-15',
    assigned_rep_id: 3,
    secondary_rep_id: 7,
    split_percentage: 85.0,
    forecast_category: 'Commit',
    discount_percent: 6.5,
    competitor: 'Salesforce Revenue Cloud',
    has_executive_sponsor: true,
    has_security_approval: true,
    days_in_current_stage: 8,
    total_activities_count: 24,
    ml_win_probability: 88.5,
    ml_risk_level: 'Low Risk',
    ml_insights: JSON.stringify({
      top_positive: ['Active Executive Sponsor verified (CFO and VP Eng)', 'Security Review sign-off complete', 'High engagement velocity (24 touchpoints)'],
      top_risks: ['Competitive pressure from incumbent vendor', 'Minor legal redline on indemnification clause']
    })
  },
  {
    id: 2,
    title: 'NeuroLink - Clinical Intelligence Cloud Platform',
    account_id: 2,
    lead_id: 2,
    stage_id: 4, // Proposal & Pricing
    amount: 420000.00,
    expected_close_date: '2026-12-22',
    assigned_rep_id: 3,
    secondary_rep_id: null,
    split_percentage: 100.0,
    forecast_category: 'Commit',
    discount_percent: 10.0,
    competitor: 'Epic Systems Integration',
    has_executive_sponsor: true,
    has_security_approval: false,
    days_in_current_stage: 11,
    total_activities_count: 18,
    ml_win_probability: 74.2,
    ml_risk_level: 'Moderate Risk',
    ml_insights: JSON.stringify({
      top_positive: ['Strong budget confirmation from CMIO', 'High deal size alignment with enterprise tier'],
      top_risks: ['Pending HIPAA Compliance InfoSec review', 'Sales cycle exceeding target by 4 days']
    })
  },
  {
    id: 3,
    title: 'Skyward Logistics - Real-time Routing Operations',
    account_id: 3,
    lead_id: 3,
    stage_id: 3, // Technical Validation (POC)
    amount: 145000.00,
    expected_close_date: '2027-01-18',
    assigned_rep_id: 4,
    secondary_rep_id: null,
    split_percentage: 100.0,
    forecast_category: 'Best Case',
    discount_percent: 12.0,
    competitor: 'Samsara Cloud',
    has_executive_sponsor: false,
    has_security_approval: false,
    days_in_current_stage: 19,
    total_activities_count: 12,
    ml_win_probability: 52.8,
    ml_risk_level: 'Moderate Risk',
    ml_insights: JSON.stringify({
      top_positive: ['Technical POC passed benchmark tests'],
      top_risks: ['No C-level Executive Sponsor identified yet', 'Days in POC approaching threshold (19 days)']
    })
  },
  {
    id: 4,
    title: 'CyberShield Zero - Automated Threat Ops Expansion',
    account_id: 4,
    lead_id: 4,
    stage_id: 6, // Closed Won
    amount: 195000.00,
    expected_close_date: '2026-11-10',
    assigned_rep_id: 4,
    secondary_rep_id: 7,
    split_percentage: 80.0,
    forecast_category: 'Closed',
    discount_percent: 5.0,
    competitor: 'CrowdStrike Falcon Platform',
    has_executive_sponsor: true,
    has_security_approval: true,
    days_in_current_stage: 0,
    total_activities_count: 29,
    ml_win_probability: 100.0,
    ml_risk_level: 'Low Risk',
    ml_insights: JSON.stringify({
      top_positive: ['Deal successfully Closed Won', 'Fast velocity: closed 8 days ahead of benchmark'],
      top_risks: []
    })
  },
  {
    id: 5,
    title: 'HyperScale AI - Distributed Model Pipeline Sync',
    account_id: 5,
    lead_id: 5,
    stage_id: 2, // Solution Demo
    amount: 88000.00,
    expected_close_date: '2027-01-25',
    assigned_rep_id: 5,
    secondary_rep_id: null,
    split_percentage: 100.0,
    forecast_category: 'Pipeline',
    discount_percent: 0.0,
    competitor: 'Weights & Biases Enterprise',
    has_executive_sponsor: false,
    has_security_approval: false,
    days_in_current_stage: 5,
    total_activities_count: 6,
    ml_win_probability: 38.0,
    ml_risk_level: 'Moderate Risk',
    ml_insights: JSON.stringify({
      top_positive: ['High technical interest in API throughput', 'Recent funding round ($25M Series B)'],
      top_risks: ['Early pipeline stage', 'Budget confirmation still pending']
    })
  },
  {
    id: 6,
    title: 'BioNova Pharma - Enterprise Drug Discovery Ops',
    account_id: 6,
    lead_id: 6,
    stage_id: 5, // Negotiation & Legal
    amount: 380000.00,
    expected_close_date: '2026-12-30',
    assigned_rep_id: 5,
    secondary_rep_id: null,
    split_percentage: 100.0,
    forecast_category: 'Commit',
    discount_percent: 8.0,
    competitor: 'Schrodinger Cloud',
    has_executive_sponsor: true,
    has_security_approval: true,
    days_in_current_stage: 9,
    total_activities_count: 22,
    ml_win_probability: 86.4,
    ml_risk_level: 'Low Risk',
    ml_insights: JSON.stringify({
      top_positive: ['Executive alignment with VP Infrastructure', 'Security architecture fully approved'],
      top_risks: ['Fiscal year-end closing window pressure']
    })
  },
  {
    id: 7,
    title: 'OmniCommerce - Global High-Volume Checkout Engine',
    account_id: 7,
    lead_id: 7,
    stage_id: 6, // Closed Won
    amount: 310000.00,
    expected_close_date: '2026-11-14',
    assigned_rep_id: 6,
    secondary_rep_id: 7,
    split_percentage: 90.0,
    forecast_category: 'Closed',
    discount_percent: 7.5,
    competitor: 'Shopify Plus Enterprise',
    has_executive_sponsor: true,
    has_security_approval: true,
    days_in_current_stage: 0,
    total_activities_count: 31,
    ml_win_probability: 100.0,
    ml_risk_level: 'Low Risk',
    ml_insights: JSON.stringify({
      top_positive: ['Closed Won with high ARR', 'Strong champion in CTO'],
      top_risks: []
    })
  },
  {
    id: 8,
    title: 'FinTech Forge - Cross-Border Payment Core System',
    account_id: 8,
    lead_id: 8,
    stage_id: 4, // Proposal & Pricing
    amount: 175000.00,
    expected_close_date: '2027-01-10',
    assigned_rep_id: 6,
    secondary_rep_id: null,
    split_percentage: 100.0,
    forecast_category: 'Best Case',
    discount_percent: 15.0,
    competitor: 'Adyen Unified Commerce',
    has_executive_sponsor: true,
    has_security_approval: false,
    days_in_current_stage: 14,
    total_activities_count: 15,
    ml_win_probability: 63.5,
    ml_risk_level: 'Moderate Risk',
    ml_insights: JSON.stringify({
      top_positive: ['Regional head endorsement in Singapore'],
      top_risks: ['High discount requested (15%)', 'Prolonged pricing review (>14 days)']
    })
  },
  {
    id: 9,
    title: 'DataSphere Networks - Telco Tier-1 Mesh Infrastructure',
    account_id: 9,
    lead_id: 9,
    stage_id: 5, // Negotiation & Legal
    amount: 650000.00,
    expected_close_date: '2026-12-28',
    assigned_rep_id: 3,
    secondary_rep_id: 7,
    split_percentage: 85.0,
    forecast_category: 'Commit',
    discount_percent: 9.0,
    competitor: 'Cisco DNA Spaces',
    has_executive_sponsor: true,
    has_security_approval: true,
    days_in_current_stage: 7,
    total_activities_count: 38,
    ml_win_probability: 91.2,
    ml_risk_level: 'Low Risk',
    ml_insights: JSON.stringify({
      top_positive: ['Largest enterprise deal in pipeline ($650k ARR)', 'Unanimous vendor recommendation from Steering Committee', 'SOC2 and FedRAMP validation passed'],
      top_risks: ['Strict Master Services Agreement (MSA) indemnification clause under redline']
    })
  },
  {
    id: 10,
    title: 'Quantum Analytics - SaaS BI Modernization',
    account_id: 10,
    lead_id: 10,
    stage_id: 7, // Closed Lost
    amount: 65000.00,
    expected_close_date: '2026-10-30',
    assigned_rep_id: 4,
    secondary_rep_id: null,
    split_percentage: 100.0,
    forecast_category: 'Omitted',
    discount_percent: 20.0,
    competitor: 'Tableau Online',
    has_executive_sponsor: false,
    has_security_approval: false,
    days_in_current_stage: 0,
    total_activities_count: 8,
    ml_win_probability: 0.0,
    ml_risk_level: 'Critical Risk',
    ml_insights: JSON.stringify({
      top_positive: [],
      top_risks: ['Lost to competitor on legacy integrations', 'Excessive discount requested but budget frozen']
    }),
    lost_reason: 'Budget frozen by CFO; chosen incumbent renewal'
  },
  {
    id: 11,
    title: 'OmniCommerce - Mobile App Acceleration Module',
    account_id: 7,
    lead_id: null,
    stage_id: 1, // Discovery
    amount: 95000.00,
    expected_close_date: '2027-02-15',
    assigned_rep_id: 6,
    secondary_rep_id: null,
    split_percentage: 100.0,
    forecast_category: 'Pipeline',
    discount_percent: 0.0,
    competitor: 'None',
    has_executive_sponsor: true,
    has_security_approval: false,
    days_in_current_stage: 4,
    total_activities_count: 4,
    ml_win_probability: 42.0,
    ml_risk_level: 'Moderate Risk',
    ml_insights: JSON.stringify({
      top_positive: ['Expansion deal with existing happy customer'],
      top_risks: ['Early discovery stage']
    })
  },
  {
    id: 12,
    title: 'Apex Financial - Fraud Detection Analytics Extension',
    account_id: 1,
    lead_id: null,
    stage_id: 2, // Solution Demo
    amount: 160000.00,
    expected_close_date: '2027-02-01',
    assigned_rep_id: 3,
    secondary_rep_id: null,
    split_percentage: 100.0,
    forecast_category: 'Pipeline',
    discount_percent: 5.0,
    competitor: 'Dataminr Financial',
    has_executive_sponsor: true,
    has_security_approval: false,
    days_in_current_stage: 6,
    total_activities_count: 9,
    ml_win_probability: 58.0,
    ml_risk_level: 'Moderate Risk',
    ml_insights: JSON.stringify({
      top_positive: ['Existing executive sponsor engagement', 'Immediate project timeline requirement'],
      top_risks: ['Needs integration validation with legacy core banking database']
    })
  }
];

const quotas = [
  { id: 1, rep_id: 3, fiscal_year: 2026, fiscal_quarter: 'Q4-2026', target_amount: 500000.00, attained_amount: 475000.00, status: 'On Track' },
  { id: 2, rep_id: 4, fiscal_year: 2026, fiscal_quarter: 'Q4-2026', target_amount: 350000.00, attained_amount: 195000.00, status: 'Behind' },
  { id: 3, rep_id: 5, fiscal_year: 2026, fiscal_quarter: 'Q4-2026', target_amount: 400000.00, attained_amount: 380000.00, status: 'On Track' },
  { id: 4, rep_id: 6, fiscal_year: 2026, fiscal_quarter: 'Q4-2026', target_amount: 300000.00, attained_amount: 310000.00, status: 'Exceeded' }
];

const commissions = [
  {
    id: 1,
    opportunity_id: 4,
    rep_id: 4,
    deal_amount: 195000.00,
    quota_attainment_pct_at_close: 55.7,
    base_rate_pct: 8.00,
    accelerator_multiplier: 1.00,
    effective_commission_pct: 8.00,
    total_payout: 12480.00, // (195000 * 80% split) * 8%
    payout_status: 'Approved',
    payment_date: '2026-11-30'
  },
  {
    id: 2,
    opportunity_id: 4,
    rep_id: 7, // SDR split
    deal_amount: 195000.00,
    quota_attainment_pct_at_close: 92.0,
    base_rate_pct: 3.50,
    accelerator_multiplier: 1.00,
    effective_commission_pct: 3.50,
    total_payout: 1365.00, // (195000 * 20% split) * 3.5%
    payout_status: 'Approved',
    payment_date: '2026-11-30'
  },
  {
    id: 3,
    opportunity_id: 7,
    rep_id: 6,
    deal_amount: 310000.00,
    quota_attainment_pct_at_close: 103.3, // Triggered >100% Accelerator!
    base_rate_pct: 8.00,
    accelerator_multiplier: 1.50, // 1.5x accelerator for exceeding quota
    effective_commission_pct: 12.00,
    total_payout: 33480.00, // (310000 * 90% split) * 12%
    payout_status: 'Pending Review',
    payment_date: null
  }
];

const activities = [
  { id: 1, type: 'Meeting', title: 'Executive Sponsor Alignment with CFO', description: 'Met with CFO David Sterling to review final contract terms and ROI model. CFO confirmed budget clearance for Dec 15 signature.', lead_id: null, opportunity_id: 1, rep_id: 3, sentiment: 'Positive', created_at: '2026-11-18 14:30:00' },
  { id: 2, type: 'Call', title: 'Technical Security Review Followup', description: 'Reviewed third-party penetration testing reports and encryption standards with Infosec officer. Zero red flags.', lead_id: null, opportunity_id: 1, rep_id: 3, sentiment: 'Positive', created_at: '2026-11-19 11:00:00' },
  { id: 3, type: 'Demo', title: 'Deep-dive Clinical Workflow Demo', description: 'Presented ML-assisted clinical workflow automation to CMIO Dr. Zhao and 6 clinical directors.', lead_id: null, opportunity_id: 2, rep_id: 3, sentiment: 'Positive', created_at: '2026-11-15 16:00:00' },
  { id: 4, type: 'Proposal Sent', title: 'Enterprise MSA & Pricing Schedule V2', description: 'Delivered revised proposal reflecting 10% volume discount based on 3-year upfront commitment.', lead_id: null, opportunity_id: 2, rep_id: 3, sentiment: 'Neutral', created_at: '2026-11-17 09:30:00' },
  { id: 5, type: 'Contract Sent', title: 'Signed Order Form Executed', description: 'Received fully executed order form from CISO Samantha Vogel for $195k ARR.', lead_id: null, opportunity_id: 4, rep_id: 4, sentiment: 'Positive', created_at: '2026-11-10 17:15:00' },
  { id: 6, type: 'Call', title: 'Inbound Qualification Call with CTO', description: 'Qualified CTO Mei-Ling Tan on international currency conversion latency. Strong budget and Q4 project mandate.', lead_id: 7, opportunity_id: null, rep_id: 6, sentiment: 'Positive', created_at: '2026-11-05 10:00:00' },
  { id: 7, type: 'Demo', title: 'Live Latency Benchmark Test', description: 'Demonstrated sub-15ms transaction routing across AWS Asia-Pacific regions.', lead_id: null, opportunity_id: 7, rep_id: 6, sentiment: 'Positive', created_at: '2026-11-08 14:00:00' },
  { id: 8, type: 'Email', title: 'Procurement Terms Redline Exchange', description: 'Exchanged redlines with legal council regarding standard SLA commitments.', lead_id: null, opportunity_id: 6, rep_id: 5, sentiment: 'Neutral', created_at: '2026-11-19 15:45:00' }
];

const mlLogs = [
  {
    id: 1,
    model_name: 'LeadScore-LogisticNet',
    version: 'v2.4.1',
    samples_count: 2450,
    accuracy: 0.9120,
    precision_score: 0.8940,
    recall_score: 0.8870,
    f1_score: 0.8905,
    auc_roc: 0.9410,
    hyperparameters: JSON.stringify({ learning_rate: 0.015, l2_penalty: 0.001, epochs: 250, optimizer: 'Adam' }),
    trained_at: '2026-11-15 03:00:00'
  },
  {
    id: 2,
    model_name: 'DealWinPredictor-XGBoostClassifier',
    version: 'v3.1.0',
    samples_count: 1840,
    accuracy: 0.8840,
    precision_score: 0.8620,
    recall_score: 0.8510,
    f1_score: 0.8565,
    auc_roc: 0.9230,
    hyperparameters: JSON.stringify({ max_depth: 6, n_estimators: 150, subsample: 0.85, colsample_bytree: 0.8 }),
    trained_at: '2026-11-18 04:30:00'
  }
];

module.exports = {
  territories,
  users,
  stages,
  accounts,
  leads,
  opportunities,
  quotas,
  commissions,
  activities,
  mlLogs
};
