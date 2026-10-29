-- ============================================================================
-- Travel Billing ERP - Seed & Initial Demo Data
-- Database: travel_billing_erp
-- ============================================================================

-- 1. Company Settings
INSERT INTO company_settings (
    id, agency_name, tagline, owner_name, phone, whatsapp, email, website,
    address, gstin, pan, bank_name, account_name, account_number, ifsc_code, upi_id,
    default_gst_rate, default_tcs_rate, currency, currency_symbol
) VALUES (
    1, 'Nilkanth Tourism', 'Discover India & Beyond — Premium Tour Packages',
    'Ramesh Chandra Verma', '+91 75750 99090', '+91 75750 99090',
    'info@nilkanthtourism.com', 'www.nilkanthtourism.com', 'Gujarat, India',
    '07AAAAA1234A1Z5', 'AAAAA1234A', 'HDFC Bank Ltd', 'Nilkanth Tourism',
    '50200088991122', 'HDFC0000123', 'nilkanthtourism@hdfcbank', 5.0, 5.0, 'INR', '₹'
) ON CONFLICT (id) DO NOTHING;

-- 2. Liquid Financial Accounts
INSERT INTO accounts (id, account_name, account_type, account_number, bank_name, current_balance, is_default) VALUES
('ACC-01', 'Cash in Hand (Office Safe)', 'Cash', '', 'Cash', 28500.00, 0),
('ACC-02', 'HDFC Bank Current A/c', 'Bank', '50200088991122', 'HDFC Bank Ltd', 342500.00, 1),
('ACC-03', 'State Bank of India Current', 'Bank', '389922110044', 'SBI Connaught Place', 187200.00, 0),
('ACC-04', 'UPI Business QR (HDFC)', 'UPI', 'namastebharat@hdfcbank', 'HDFC Bank Ltd', 45000.00, 0)
ON CONFLICT (id) DO NOTHING;

-- 3. Suppliers
INSERT INTO suppliers (id, name, category, contact_person, phone, email, city, state, bank_details, upi_id, gstin) VALUES
('SUP-101', 'Taj Lake Palace & Resorts', 'Hotel', 'Sanjay Rathore', '+91 98290 12345', 'reservations.udaipur@tajhotels.com', 'Udaipur', 'Rajasthan', 'ICICI Bank 001205001122', 'tajudaipur@icici', '08AAACT1234F1Z8'),
('SUP-102', 'Snow Valley Resorts & Spa', 'Hotel', 'Vikram Negi', '+91 94180 54321', 'manali@snowvalleyresorts.com', 'Manali', 'Himachal Pradesh', 'HDFC Bank 502000112233', 'snowvalley@hdfcbank', '02AAACS5432B1Z4'),
('SUP-103', 'Spice Village Eco Resort', 'Hotel', 'Mathew George', '+91 94470 67890', 'spicevillage@cghearth.com', 'Thekkady', 'Kerala', 'Federal Bank 100201004567', 'spicevillage@federal', '32AAACG9876C1Z2'),
('SUP-104', 'Lemon Tree Premier Delhi Airport', 'Hotel', 'Pooja Chawla', '+91 98100 87654', 'delhi@lemontreehotels.com', 'New Delhi', 'Delhi', 'Axis Bank 912020012345', 'lemontree@axisbank', '07AAACL3456D1Z1'),
('SUP-105', 'Royal Rajasthan Tourist Cabs', 'Cab/Transport', 'Bhairon Singh', '+91 98291 99887', 'royalrajasthancabs@gmail.com', 'Jaipur', 'Rajasthan', 'SBI 312233445566', 'bhairon.cabs@sbi', '08ABCDE1122K1Z9'),
('SUP-106', 'Kashmir Paradise Holidays DMC', 'DMC', 'Farooq Ahmed', '+91 94190 22334', 'info@kashmirparadisedmc.com', 'Srinagar', 'Jammu & Kashmir', 'J&K Bank 002101007788', 'farooq.kashmir@jkb', '01AABCK9988M1Z3'),
('SUP-107', 'Kerala Backwater Voyages & Houseboats', 'Cab/Transport', 'Unnikrishnan Nair', '+91 98460 33445', 'alleppeyhouseboats@yahoo.com', 'Alleppey', 'Kerala', 'Canara Bank 123410105678', 'unni.voyages@cnrb', '32AABBK7766P1Z5')
ON CONFLICT (id) DO NOTHING;

-- 4. Master Hotels
INSERT INTO hotels (id, name, destination, star_rating, address, supplier_id, phone, email, room_types, base_rate, meal_plans, payment_terms, cancellation_policy) VALUES
('HTL-01', 'Taj Lake Palace', 'Udaipur', 5, 'Pichola Lake, Udaipur, Rajasthan 313001', 'SUP-101', '+91 98290 12345', 'reservations.udaipur@tajhotels.com', '["Luxury Lake View Room", "Palace Room", "Grand Royal Suite"]', 28500.00, '["CP", "MAP", "AP"]', '50% advance on confirmation, balance 7 days prior to check-in', 'Full refund if cancelled 15 days prior; 50% retention within 7-14 days'),
('HTL-02', 'Snow Valley Resorts', 'Manali', 4, 'Log Huts Area, Manali, HP 175131', 'SUP-102', '+91 94180 54321', 'manali@snowvalleyresorts.com', '["Standard Room", "Luxury Room", "Duplex Family Suite"]', 4200.00, '["EP", "CP", "MAP"]', '100% payment before arrival', 'Non-refundable if cancelled within 72 hours'),
('HTL-03', 'Spice Village Eco Resort', 'Thekkady', 5, 'Kumily, Thekkady, Kerala 685509', 'SUP-103', '+91 94470 67890', 'spicevillage@cghearth.com', '["Standard Villa", "Deluxe Cottage"]', 8500.00, '["CP", "MAP"]', '50% advance, balance on check-in', 'Refundable up to 7 days before check-in'),
('HTL-04', 'Lemon Tree Premier', 'New Delhi', 4, 'Asset No 6, Aerocity, New Delhi 110037', 'SUP-104', '+91 98100 87654', 'delhi@lemontreehotels.com', '["Superior Room", "Deluxe Room", "Executive Suite"]', 6500.00, '["CP", "MAP"]', 'Full advance or corporate credit 15 days', 'Free cancellation up to 24 hours prior'),
('HTL-05', 'The Lalit Grand Palace', 'Srinagar', 5, 'Gupkar Road, Srinagar, J&K 190001', 'SUP-106', '+91 94190 22334', 'srinagar@thelalit.com', '["Deluxe Palace Room", "Valley View Suite"]', 14500.00, '["CP", "MAP", "AP"]', '100% advance 10 days before arrival', 'Retention applies if cancelled within 10 days'),
('HTL-06', 'Whispering Palms Beach Resort', 'Goa', 4, 'Candolim Beach, North Goa 403515', 'SUP-104', '+91 98221 44556', 'goa@whisperingpalms.com', '["Standard Balcony Room", "Pool Facing Deluxe"]', 5800.00, '["CP", "MAP", "All Inclusive"]', '50% advance, balance at check-in', '1 night retention for cancellation within 7 days')
ON CONFLICT (id) DO NOTHING;

-- 5. Customers
INSERT INTO customers (id, name, phone, email, city, state, address, gstin, emergency_contact, notes) VALUES
('CUST-101', 'Rajesh Sharma', '+91 98112 34567', 'rajesh.sharma@tcs.com', 'Gurugram', 'Haryana', 'Flat 402, DLF Phase 5, Gurugram', '', '+91 98112 34568 (Wife - Sunita)', 'Prefers vegetarian Jain meals, upper floor rooms'),
('CUST-102', 'Priya Kapoor Patel', '+91 98200 45678', 'priya.patel@ril.com', 'Mumbai', 'Maharashtra', '12B, Sea Green Apts, Worli, Mumbai', '', '+91 98200 45679 (Husband - Anish)', 'Honeymoon couple, anniversary on day 3'),
('CUST-103', 'Vikram Malhotra', '+91 99400 56789', 'vikram@malhotratech.com', 'Bengaluru', 'Karnataka', '74 Indira Nagar 100ft Road, Bengaluru', '29AAACM8877L1Z0', '+91 99400 56790', 'Corporate B2B client, requires GST invoice'),
('CUST-104', 'Dr. Arvind Swaminathan', '+91 94440 67891', 'arvind.swami@apollo.org', 'Chennai', 'Tamil Nadu', 'Plot 5, Besant Nagar, Chennai', '', '+91 94440 67892', 'Senior citizens travelling, requires ground floor and wheelchair assistance'),
('CUST-105', 'Meenakshi Sundaram', '+91 97110 78912', 'meenakshi@gmail.com', 'Noida', 'Uttar Pradesh', 'Sector 62, Express Zenith, Noida', '', '+91 97110 78913', 'Family trip with 2 kids')
ON CONFLICT (id) DO NOTHING;

-- 6. Packages
INSERT INTO packages (
    id, name, destination, country, description, duration_days, duration_nights,
    selling_price, estimated_cost, pricing_basis, inclusions, exclusions, cancellation_terms,
    day_wise_itinerary, image_url, is_active
) VALUES
(
    'PKG-001', 'Golden Triangle Heritage (Delhi - Agra - Jaipur)', 'Delhi, Agra, Jaipur', 'India',
    'A timeless journey through India’s imperial history, majestic forts, and the world-renowned Taj Mahal with premium chauffeur-driven transport and 4-star heritage stays.',
    5, 4, 48500.00, 36000.00, 'Per Couple (Twin Sharing)',
    '• 4 Nights accommodation in 4-star hotels\n• Daily buffet breakfast & dinner\n• Private air-conditioned Sedan with experienced driver for 5 days\n• All toll taxes, state permits, parking & driver allowances\n• Guided tour of Taj Mahal & Amer Fort with entrance support\n• 1 Traditional Rajasthani cultural dinner',
    '• Monument entry tickets & camera fees\n• Airfare or train tickets\n• Personal expenses, laundry, tips and alcoholic drinks\n• GST 5% on billing',
    '• Cancellation 30+ days before travel: 10% administration fee\n• Cancellation 15-29 days before travel: 25% package retention\n• Cancellation 7-14 days before travel: 50% package retention\n• Cancellation less than 7 days: 100% non-refundable',
    '[{"day":1,"title":"Arrival in Delhi & Heritage City Tour","morning_activity":"Airport pickup in private AC Sedan, hotel check-in at Lemon Tree Aerocity.","afternoon_activity":"Guided tour of Qutub Minar, Humayun’s Tomb and India Gate drive-past.","evening_activity":"Explore Connaught Place & dinner at Connaught Clubhouse.","stay_hotel":"Lemon Tree Premier Aerocity","meals_included":"Dinner"},{"day":2,"title":"Delhi to Agra via Yamuna Expressway & Taj Mahal at Sunset","morning_activity":"Breakfast at hotel, scenic drive to Agra (approx 3.5 hrs).","afternoon_activity":"Check-in at Agra hotel, visit historical Agra Fort.","evening_activity":"Breathtaking Sunset view of Taj Mahal with licensed guide.","stay_hotel":"Courtyard by Marriott Agra","meals_included":"Breakfast, Dinner"},{"day":3,"title":"Agra to Jaipur via Fatehpur Sikri & Chand Baori","morning_activity":"Early morning sunrise glimpse of Taj Mahal, breakfast and checkout.","afternoon_activity":"Enroute visit to ghost city Fatehpur Sikri and Abhaneri Stepwell.","evening_activity":"Arrive in the Pink City Jaipur, traditional Rajasthani dinner at Chokhi Dhani.","stay_hotel":"ITC Rajputana Jaipur","meals_included":"Breakfast, Dinner"},{"day":4,"title":"Jaipur Forts, Palaces & Pink City Bazaars","morning_activity":"Visit Amer Fort with elephant/jeep ride, photo stop at Jal Mahal.","afternoon_activity":"Visit City Palace, Jantar Mantar and iconic Hawa Mahal.","evening_activity":"Free time for handicraft and gemstone shopping in Johari Bazaar.","stay_hotel":"ITC Rajputana Jaipur","meals_included":"Breakfast, Dinner"},{"day":5,"title":"Jaipur to Delhi Departure","morning_activity":"Leisurely breakfast, check-out from hotel.","afternoon_activity":"Comfortable transfer back to New Delhi Airport (approx 4.5 hrs).","evening_activity":"Drop-off at IGI Airport for your return flight home with sweet memories.","stay_hotel":"None (Departure)","meals_included":"Breakfast"}]',
    'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800', 1
),
(
    'PKG-002', 'Kashmir Paradise On Earth (Srinagar, Gulmarg & Pahalgam)', 'Srinagar, Gulmarg, Pahalgam, Sonamarg', 'India',
    'Experience the Switzerland of India with snow-capped Himalayan peaks, enchanting Shikara rides on Dal Lake, scenic meadow walks, and stay in traditional heritage houseboats.',
    6, 5, 64000.00, 47500.00, 'Per Couple (Twin Sharing)',
    '• 1 Night in Luxury Dal Lake Houseboat\n• 4 Nights in premium 4-star hotels\n• Daily buffet breakfast & dinner (Kashmiri & North Indian menu)\n• Private Innova/Ertiga for all airport transfers and sightseeing\n• 1 Hour Shikara ride on Dal Lake\n• Gulmarg & Pahalgam day trips with union cab coordination\n• 24x7 local on-ground assistance',
    '• Gondola ride Phase 1 & 2 tickets (must be booked online in advance)\n• Pony / Horse rides in Gulmarg, Baisaran or Sonamarg\n• Internal Union Cabs in Aru / Chandanwari / Betaab Valley\n• GST 5%',
    '• Cancellation 21+ days before: 15% retention\n• Cancellation 10-20 days before: 40% retention\n• Cancellation within 9 days: 100% retention',
    '[{"day":1,"title":"Arrival in Srinagar & Dal Lake Shikara Ride","morning_activity":"Airport pickup, transfer to luxury wooden Houseboat on Dal Lake.","afternoon_activity":"Check-in, traditional welcome Kahwa tea, relax.","evening_activity":"1-Hour sunset Shikara ride across Floating Gardens and Char Chinar.","stay_hotel":"Mascot Luxury Houseboats Dal Lake","meals_included":"Dinner"},{"day":2,"title":"Srinagar to Gulmarg Meadow of Flowers & Gondola Ride","morning_activity":"Scenic drive to Gulmarg (54 km / 2 hrs) through pine forests.","afternoon_activity":"Board famous Gulmarg Gondola Cable Car to Phase 1 & Phase 2.","evening_activity":"Snow activities, warm Kashmiri dinner at hotel.","stay_hotel":"The Khyber Himalayan Resort / Pine Spring","meals_included":"Breakfast, Dinner"},{"day":3,"title":"Gulmarg to Pahalgam Valley of Shepherds","morning_activity":"Drive to Pahalgam via Pampore Saffron fields and Avantipura ruins.","afternoon_activity":"Visit Betaab Valley, Chandanwari and Aru Valley in local union cab.","evening_activity":"River rafting on Lidder River or riverside stroll.","stay_hotel":"Pine N Peak Hotel Pahalgam","meals_included":"Breakfast, Dinner"},{"day":4,"title":"Pahalgam to Srinagar & Mughal Gardens","morning_activity":"Morning leisure in Pahalgam, transfer back to Srinagar city hotel.","afternoon_activity":"Sightseeing of Nishat Bagh, Shalimar Bagh & Chashme Shahi.","evening_activity":"Shopping for authentic Pashmina shawls, dry fruits and saffron at Lal Chowk.","stay_hotel":"The Lalit Grand Palace Srinagar","meals_included":"Breakfast, Dinner"},{"day":5,"title":"Day Excursion to Sonamarg Golden Meadow & Thajiwas Glacier","morning_activity":"Full-day trip to Sonamarg along the Sindh River valley.","afternoon_activity":"Pony trek or union cab to Thajiwas Glacier for year-round snow.","evening_activity":"Return to Srinagar hotel for farewell dinner.","stay_hotel":"The Lalit Grand Palace Srinagar","meals_included":"Breakfast, Dinner"},{"day":6,"title":"Srinagar Airport Departure","morning_activity":"Breakfast with panoramic views, check-out.","afternoon_activity":"Transfer to Srinagar Airport 3 hours prior to flight.","evening_activity":"Flight home.","stay_hotel":"None (Departure)","meals_included":"Breakfast"}]',
    'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=800', 1
)
ON CONFLICT (id) DO NOTHING;

-- 7. Operating Expenses
INSERT INTO expenses (id, expense_number, expense_date, category, amount, payment_mode, account_id, vendor_name, reference_no, tax_deductible, notes) VALUES
('EXP-2026-001', 'EXP-2026-001', '2026-10-01', 'Office Rent', 35000.00, 'Bank Transfer', 'ACC-02', 'Connaught Commercial Estate', 'NEFT-RENT-OCT', 1, 'Monthly Connaught Place office lease rent'),
('EXP-2026-002', 'EXP-2026-002', '2026-10-05', 'Staff Salaries', 65000.00, 'Bank Transfer', 'ACC-02', 'Operations Staff & Tour Coordinators', 'NEFT-SAL-OCT', 1, 'Staff salaries for 2 executive operations coordinators'),
('EXP-2026-003', 'EXP-2026-003', '2026-10-08', 'Internet & Phone', 3200.00, 'UPI', 'ACC-04', 'Airtel Broadband & Corporate CUG', 'UPI-AIRTEL-4432', 1, 'High-speed fiber & business mobile plan'),
('EXP-2026-004', 'EXP-2026-004', '2026-10-12', 'Marketing & Ads', 12500.00, 'Bank Transfer', 'ACC-02', 'Google & Meta Travel Ads', 'CARD-AD-8899', 1, 'Diwali vacation campaign ads'),
('EXP-2026-005', 'EXP-2026-005', '2026-10-14', 'Office Tea & Misc', 1850.00, 'Cash', 'ACC-01', 'Local Market & Pantry Vendor', 'CASH-VOUCHER-01', 1, 'Client refreshments, tea & snacks')
ON CONFLICT (id) DO NOTHING;

