-- SpendWise demo data. Login: demo@spendwise.app / Demo@1234
-- Safe to run again: it recreates the demo user.
DELETE FROM users WHERE email = 'demo@spendwise.app';
INSERT INTO users (id, email, name, password_hash, base_currency) VALUES ('00000000-0000-4000-8000-00000000d3a0', 'demo@spendwise.app', 'Demo User', '$2a$10$i/KXtxU6t6bNKgtD5RyYoextcah8qZPwDgQ.yEkDwpvACZTtIs8Am', 'INR');
INSERT INTO categories (user_id, name, type, color) VALUES
('00000000-0000-4000-8000-00000000d3a0', 'Food', 'expense', '#0F766E'),
('00000000-0000-4000-8000-00000000d3a0', 'Shopping', 'expense', '#2563EB'),
('00000000-0000-4000-8000-00000000d3a0', 'Transport', 'expense', '#D97706'),
('00000000-0000-4000-8000-00000000d3a0', 'Rent', 'expense', '#7C3AED'),
('00000000-0000-4000-8000-00000000d3a0', 'Bills', 'expense', '#DB2777'),
('00000000-0000-4000-8000-00000000d3a0', 'Healthcare', 'expense', '#DC2626'),
('00000000-0000-4000-8000-00000000d3a0', 'Education', 'expense', '#0891B2'),
('00000000-0000-4000-8000-00000000d3a0', 'Entertainment', 'expense', '#EA580C'),
('00000000-0000-4000-8000-00000000d3a0', 'Travel', 'expense', '#4F46E5'),
('00000000-0000-4000-8000-00000000d3a0', 'Subscriptions', 'expense', '#65A30D'),
('00000000-0000-4000-8000-00000000d3a0', 'Others', 'expense', '#6B7280'),
('00000000-0000-4000-8000-00000000d3a0', 'Salary', 'income', '#15803D'),
('00000000-0000-4000-8000-00000000d3a0', 'Freelance', 'income', '#0D9488'),
('00000000-0000-4000-8000-00000000d3a0', 'Gifts', 'income', '#C026D3'),
('00000000-0000-4000-8000-00000000d3a0', 'Investments', 'income', '#CA8A04'),
('00000000-0000-4000-8000-00000000d3a0', 'Others', 'income', '#6B7280');
INSERT INTO accounts (user_id, name, type, currency, opening_balance) VALUES
('00000000-0000-4000-8000-00000000d3a0', 'Cash – INR', 'cash', 'INR', 5000),
('00000000-0000-4000-8000-00000000d3a0', 'Bank – INR', 'bank', 'INR', 40000),
('00000000-0000-4000-8000-00000000d3a0', 'Wallet – AED', 'wallet', 'AED', 800),
('00000000-0000-4000-8000-00000000d3a0', 'Cash – USD', 'cash', 'USD', 150);
INSERT INTO transactions (user_id, account_id, category_id, type, amount, currency, rate_to_base, base_currency, date, description, payment_method) VALUES
('00000000-0000-4000-8000-00000000d3a0', (SELECT id FROM accounts WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Bank – INR'), (SELECT id FROM categories WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Salary' AND type = 'income'), 'income', 50000, 'INR', 1, 'INR', current_date - 3, 'Monthly salary', 'card'),
('00000000-0000-4000-8000-00000000d3a0', (SELECT id FROM accounts WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Wallet – AED'), (SELECT id FROM categories WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Freelance' AND type = 'income'), 'income', 1200, 'AED', 22.7, 'INR', current_date - 9, 'Logo design project', 'card'),
('00000000-0000-4000-8000-00000000d3a0', (SELECT id FROM accounts WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Wallet – AED'), (SELECT id FROM categories WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Food' AND type = 'expense'), 'expense', 45, 'AED', 22.7, 'INR', current_date - 1, 'Lunch', 'card'),
('00000000-0000-4000-8000-00000000d3a0', (SELECT id FROM accounts WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Wallet – AED'), (SELECT id FROM categories WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Transport' AND type = 'expense'), 'expense', 30, 'AED', 22.7, 'INR', current_date - 2, 'Taxi', 'card'),
('00000000-0000-4000-8000-00000000d3a0', (SELECT id FROM accounts WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Cash – USD'), (SELECT id FROM categories WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Subscriptions' AND type = 'expense'), 'expense', 12, 'USD', 83.4, 'INR', current_date - 4, 'Netflix', 'card'),
('00000000-0000-4000-8000-00000000d3a0', (SELECT id FROM accounts WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Bank – INR'), (SELECT id FROM categories WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Rent' AND type = 'expense'), 'expense', 15000, 'INR', 1, 'INR', current_date - 5, 'Room rent', 'card'),
('00000000-0000-4000-8000-00000000d3a0', (SELECT id FROM accounts WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Cash – INR'), (SELECT id FROM categories WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Food' AND type = 'expense'), 'expense', 350, 'INR', 1, 'INR', current_date - 6, 'Groceries', 'card'),
('00000000-0000-4000-8000-00000000d3a0', (SELECT id FROM accounts WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Bank – INR'), (SELECT id FROM categories WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Bills' AND type = 'expense'), 'expense', 1800, 'INR', 1, 'INR', current_date - 8, 'Electricity', 'card'),
('00000000-0000-4000-8000-00000000d3a0', (SELECT id FROM accounts WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Wallet – AED'), (SELECT id FROM categories WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Shopping' AND type = 'expense'), 'expense', 220, 'AED', 22.7, 'INR', current_date - 12, 'Shoes', 'card'),
('00000000-0000-4000-8000-00000000d3a0', (SELECT id FROM accounts WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Bank – INR'), (SELECT id FROM categories WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Education' AND type = 'expense'), 'expense', 2500, 'INR', 1, 'INR', current_date - 15, 'Online course', 'card'),
('00000000-0000-4000-8000-00000000d3a0', (SELECT id FROM accounts WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Bank – INR'), (SELECT id FROM categories WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Salary' AND type = 'income'), 'income', 50000, 'INR', 1, 'INR', current_date - 33, 'Monthly salary', 'card'),
('00000000-0000-4000-8000-00000000d3a0', (SELECT id FROM accounts WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Bank – INR'), (SELECT id FROM categories WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Rent' AND type = 'expense'), 'expense', 15000, 'INR', 1, 'INR', current_date - 35, 'Room rent', 'card'),
('00000000-0000-4000-8000-00000000d3a0', (SELECT id FROM accounts WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Wallet – AED'), (SELECT id FROM categories WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Entertainment' AND type = 'expense'), 'expense', 90, 'AED', 22.7, 'INR', current_date - 40, 'Cinema', 'card'),
('00000000-0000-4000-8000-00000000d3a0', (SELECT id FROM accounts WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Cash – INR'), (SELECT id FROM categories WHERE user_id = '00000000-0000-4000-8000-00000000d3a0' AND name = 'Travel' AND type = 'expense'), 'expense', 4200, 'INR', 1, 'INR', current_date - 50, 'Train tickets', 'card');
