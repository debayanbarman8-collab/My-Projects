const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_sales_ops_jwt_secret_key_2026_xyz123';

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const [users] = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (!users || users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];
    
    // In demo environment, if password matches 'Password123!' or stored hash matches
    let isValidPassword = false;
    if (password === 'Password123!') {
      isValidPassword = true;
    } else if (user.password_hash) {
      isValidPassword = bcrypt.compareSync(password, user.password_hash);
    }

    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid password. (Default is Password123!)' });
    }

    const isCustomer = user.role === 'customer';
    const targetPortal = isCustomer ? '/customer' : '/';

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        account_id: user.account_id || null,
        company: user.company || null
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      portal: targetPortal,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        phone: user.phone,
        account_id: user.account_id || null,
        company: user.company || null,
        title: user.title || null
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getDemoAccounts(req, res, next) {
  try {
    const demoSales = [
      { id: 1, name: 'Elena Vance', email: 'elena.vance@revpulse.io', role: 'sales_ops_admin', title: 'Director of Sales Operations', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', tag: 'Full Admin Access' },
      { id: 2, name: 'Marcus Sterling', email: 'marcus.s@revpulse.io', role: 'sales_manager', title: 'Sales Operations Manager', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150', tag: 'Team & Quota Lead' },
      { id: 3, name: 'Sarah Jenkins', email: 'sarah.j@revpulse.io', role: 'account_executive', title: 'Senior Enterprise AE', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', tag: 'Top Attainment Rep' }
    ];

    const demoCustomers = [
      { id: 101, name: 'David Sterling', email: 'd.sterling@apexfinancial.demo', role: 'customer', title: 'VP of Engineering', company: 'Apex Financial Cloud', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', deal_value: '$285k ARR', stage: 'Negotiation & Legal' },
      { id: 102, name: 'Dr. Rachel Zhao', email: 'rachel.z@neurolinkhealth.demo', role: 'customer', title: 'CMIO', company: 'NeuroLink Health Systems', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', deal_value: '$420k ARR', stage: 'Proposal & Pricing' },
      { id: 103, name: 'Samantha Vogel', email: 'svogel@cybershieldzero.demo', role: 'customer', title: 'CISO', company: 'CyberShield Zero', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', deal_value: '$195k ARR', stage: 'Closed Won Customer' }
    ];

    res.json({
      success: true,
      data: {
        sales: demoSales,
        customers: demoCustomers
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getReps(req, res, next) {
  try {
    const [users] = await query('SELECT id, name, email, role, avatar_url, phone, status, territory_id FROM users WHERE status = "active"');
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
}

async function getCurrentUser(req, res, next) {
  try {
    const userId = req.user ? req.user.id : 1;
    const [users] = await query('SELECT id, name, email, role, avatar_url, phone, status, territory_id FROM users WHERE id = ?', [userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: users[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getDemoAccounts,
  getReps,
  getCurrentUser
};
