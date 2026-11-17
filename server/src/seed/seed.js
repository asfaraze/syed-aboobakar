const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { initSchema } = require('../models/schema');
const AuditLogger = require('../utils/auditLogger');

// High-quality SVG icon data URIs for placeholder images by category
function getPlaceholderImage(category, name) {
  const colorMap = {
    'Rice & Grains': '#d97706',
    'Oil & Spices': '#ea580c',
    'Vegetables': '#16a34a',
    'Fruits': '#dc2626',
    'Meat & Fish': '#be123c',
    'Dairy & Eggs': '#eab308',
    'Snacks': '#f97316',
    'Drinks': '#0284c7',
    'Household': '#4f46e5',
    'Others': '#64748b'
  };
  const color = colorMap[category] || '#2563eb';
  const cleanName = name.replace(/"/g, "'");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#f8fafc"/>
    <circle cx="200" cy="170" r="90" fill="${color}" opacity="0.12"/>
    <circle cx="200" cy="170" r="70" fill="${color}" opacity="0.25"/>
    <text x="200" y="175" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="${color}" text-anchor="middle" dominant-baseline="middle">${category}</text>
    <rect x="30" y="290" width="340" height="85" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
    <text x="200" y="325" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1e293b" text-anchor="middle">${cleanName.substring(0, 32)}</text>
    <text x="200" y="352" font-family="Arial, sans-serif" font-size="13" fill="#64748b" text-anchor="middle">Syed Aboobakar Kedai</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function seed() {
  console.log('[Seed] Initializing database schema...');
  initSchema();

  console.log('[Seed] Checking existing records...');
  const userCount = db.get('SELECT COUNT(*) as count FROM users')?.count || 0;
  const productCount = db.get('SELECT COUNT(*) as count FROM products')?.count || 0;

  // 1. Seed Users if not present
  if (userCount === 0) {
    console.log('[Seed] Seeding initial users...');
    const ownerHash = await bcrypt.hash('Owner@123456', 10);
    const staffHash = await bcrypt.hash('Staff@123456', 10);
    const custHash = await bcrypt.hash('Customer@123456', 10);

    db.run(
      `INSERT INTO users (name, email, phone, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 'owner', 1)`,
      ['Syed Aboobakar (Owner)', 'owner@syedaboobakarkedai.com', '+60123456789', ownerHash]
    );

    db.run(
      `INSERT INTO users (name, email, phone, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 'staff', 1)`,
      ['Ahmad Razak (Staff)', 'staff@syedaboobakarkedai.com', '+60198765432', staffHash]
    );

    db.run(
      `INSERT INTO users (name, email, phone, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 'customer', 1)`,
      ['Nurul Huda (Customer)', 'customer@gmail.com', '+60112345678', custHash]
    );

    AuditLogger.log({
      action: 'INITIAL_DATABASE_SEED',
      details: 'Created owner, staff, and initial customer accounts'
    });
  }

  // 2. Seed Coupons if not present
  const couponCount = db.get('SELECT COUNT(*) as count FROM coupons')?.count || 0;
  if (couponCount === 0) {
    console.log('[Seed] Seeding sample promotional coupons...');
    db.run(
      `INSERT INTO coupons (code, discount_type, discount_value, min_spend_sen, max_discount_sen, usage_limit, times_used, is_active)
       VALUES 
       ('WELCOME10', 'percent', 10, 3000, 1000, 500, 0, 1),
       ('KEDAI5', 'fixed', 500, 4000, NULL, 200, 0, 1),
       ('JIMAT20', 'percent', 20, 10000, 3000, 100, 0, 1)`
    );
  }

  // 3. Seed 50+ Malaysian Grocery Products if not present
  if (productCount < 50) {
    console.log('[Seed] Seeding 50+ realistic Malaysian grocery products...');
    
    // Clear out old products to re-seed fresh 52 products
    db.run('DELETE FROM order_items');
    db.run('DELETE FROM orders');
    db.run('DELETE FROM inventory_movements');
    db.run('DELETE FROM products');

    const products = [
      // 1. Rice & Grains (5 items)
      {
        name: 'Jasmine Super Special Tempatan 10kg',
        name_ms: 'Beras Jasmine Super Special Tempatan 10kg',
        name_ta: 'ஜாஸ்மின் சூப்பர் ஸ்பெஷல் உள்ளூர் அரிசி 10கிலோ',
        category: 'Rice & Grains',
        price_sen: 3990,
        original_price_sen: 4200,
        discount_percent: 5,
        stock_quantity: 45,
        unit: '10kg bag',
        description: 'Premium quality local Malaysian white rice. Soft and fluffy when cooked.',
        description_ms: 'Beras putih tempatan berkualiti tinggi dari Malaysia. Lembut dan gebu bila dimasak.',
        description_ta: 'உயர்தர மலேசிய உள்ளூர் வெள்ளை அரிசி. சமைக்கும் போது மென்மையாகவும் பஞ்சுபோன்றதாகவும் இருக்கும்.'
      },
      {
        name: 'Cap Rambutan Beras Wangi AAA 5kg',
        name_ms: 'Beras Wangi AAA Cap Rambutan 5kg',
        name_ta: 'கேப் ரம்புட்டான் மணமுள்ள அரிசி AAA 5கிலோ',
        category: 'Rice & Grains',
        price_sen: 2950,
        original_price_sen: 3300,
        discount_percent: 11,
        stock_quantity: 30,
        unit: '5kg bag',
        description: 'Fragrant jasmine rice with natural floral aroma, perfect for family dinners.',
        description_ms: 'Beras wangi semulajadi berkualiti AAA, sesuai untuk hidangan seisi keluarga.',
        description_ta: 'இயற்கையான பூ நறுமணம் கொண்ட நறுமண அரிசி, குடும்ப உணவிற்கு ஏற்றது.'
      },
      {
        name: 'Kohinoor Basmati Super Extra Long 5kg',
        name_ms: 'Beras Basmati Kohinoor Super Extra Long 5kg',
        name_ta: 'கோஹினூர் பாஸ்மதி அரிசி 5கிலோ',
        category: 'Rice & Grains',
        price_sen: 5200,
        original_price_sen: 5800,
        discount_percent: 10,
        stock_quantity: 20,
        unit: '5kg bag',
        description: 'Extra long grain authentic Basmati rice, ideal for aromatic Biryani and Nasi Minyak.',
        description_ms: 'Beras basmati bijirin panjang asli untuk Nasi Beriani dan Nasi Minyak yang lazat.',
        description_ta: 'நீண்ட தானிய பாஸ்மதி அரிசி, பிரியாணிக்கு மிகவும் ஏற்றது.'
      },
      {
        name: 'Quaker Quick Cook Rolled Oats 800g',
        name_ms: 'Oat Segera Quaker 800g',
        name_ta: 'குவேக்கர் உடனடி ஓட்ஸ் 800கிராம்',
        category: 'Rice & Grains',
        price_sen: 1180,
        original_price_sen: 1350,
        discount_percent: 13,
        stock_quantity: 40,
        unit: '800g pack',
        description: '100% whole grain Australian oats, rich in beta-glucan soluble fibre for healthy heart.',
        description_ms: 'Oat bijirin penuh 100% dari Australia, kaya dengan serat larut untuk kesihatan jantung.',
        description_ta: '100% முழு தானிய ஓட்ஸ், இதய ஆரோக்கியத்திற்கு சிறந்தது.'
      },
      {
        name: 'Faiza Bihun Vermicelli 400g',
        name_ms: 'Bihun Faiza 400g',
        name_ta: 'ஃபைசா சேமியா 400கிராம்',
        category: 'Rice & Grains',
        price_sen: 320,
        original_price_sen: 350,
        discount_percent: 9,
        stock_quantity: 60,
        unit: '400g pack',
        description: 'Premium quality rice vermicelli, ideal for Bihun Goreng and Soups.',
        description_ms: 'Bihun beras berkualiti tinggi, sangat enak dimasak bihun goreng atau bihun sup.',
        description_ta: 'உயர்தர அரிசி சேமியா, பொரியல் மற்றும் சூப்பிற்கு உகந்தது.'
      },

      // 2. Oil & Spices (6 items)
      {
        name: 'Minyak Masak Seri Murni 5kg',
        name_ms: 'Minyak Masak Seri Murni 5kg',
        name_ta: 'ஸ்ரீ முர்னி சமையல் எண்ணெய் 5கிலோ',
        category: 'Oil & Spices',
        price_sen: 3190,
        original_price_sen: 3450,
        discount_percent: 8,
        stock_quantity: 50,
        unit: '5kg bottle',
        description: 'Pure refined vegetable cooking oil rich in Vitamin E, cholesterol free.',
        description_ms: 'Minyak masak sayuran tulen berkualiti tinggi, kaya Vitamin E dan bebas kolesterol.',
        description_ta: 'வைட்டமின் ஈ நிறைந்த தூய சுத்திகரிக்கப்பட்ட காய்கறி சமையல் எண்ணெய்.'
      },
      {
        name: "Alagappa's Chilli Powder 250g",
        name_ms: "Serbuk Cili Alagappa's 250g",
        name_ta: "அழகப்பாஸ் மிளகாய் தூள் 250கிராம்",
        category: 'Oil & Spices',
        price_sen: 590,
        original_price_sen: 650,
        discount_percent: 9,
        stock_quantity: 45,
        unit: '250g pack',
        description: "100% natural spicy Malaysian ground chilli powder with authentic aroma.",
        description_ms: "Serbuk cili gred premium asli, pedas dan memikat selera masakan Malaysia.",
        description_ta: "100% இயற்கையான காரமான மிளகாய் தூள்."
      },
      {
        name: "Baba's Meat Curry Powder 250g",
        name_ms: "Serbuk Kari Daging Baba's 250g",
        name_ta: "பாபாஸ் இறைச்சி கறி மசாலா தூள் 250கிராம்",
        category: 'Oil & Spices',
        price_sen: 480,
        original_price_sen: 520,
        discount_percent: 8,
        stock_quantity: 70,
        unit: '250g pack',
        description: "Malaysia's favourite curry powder blend for chicken, mutton and beef curries.",
        description_ms: "Rempah kari kegemaran Malaysia untuk kari ayam, daging dan kambing yang pekat.",
        description_ta: "மலேசியாவின் விருப்பமான சுவையான இறைச்சி கறி மசாலா தூள்."
      },
      {
        name: "Adabi Sup Bunjut Soup Spices 8g",
        name_ms: "Sup Bunjut Adabi 8g",
        name_ta: "அதாபி சூப் மசாலா 8கிராம்",
        category: 'Oil & Spices',
        price_sen: 140,
        original_price_sen: 160,
        discount_percent: 13,
        stock_quantity: 100,
        unit: '8g pack',
        description: "Traditional Malaysian soup spice pouch for aromatic beef and chicken soup.",
        description_ms: "Bunjut rempah sup tradisional untuk masakan sup ayam dan daging yang harum.",
        description_ta: "சுவையான சிக்கன் மற்றும் மட்டன் சூப்பிற்கான பாரம்பரிய மசாலா பொட்டலம்."
      },
      {
        name: 'Naturel Pure Canola Oil 2L',
        name_ms: 'Minyak Canola Tulen Naturel 2L',
        name_ta: 'நேச்சுரல் தூய கனோலா எண்ணெய் 2லிட்டர்',
        category: 'Oil & Spices',
        price_sen: 2790,
        original_price_sen: 3100,
        discount_percent: 10,
        stock_quantity: 25,
        unit: '2L bottle',
        description: 'Heart-friendly premium pure canola cooking oil with Omega 3 & 6.',
        description_ms: 'Minyak canola sihat untuk jantung mengandungi Omega 3 & 6.',
        description_ta: 'ஒமேகா 3 மற்றும் 6 கொண்ட இதயத்திற்கு உகந்த தூய கனோலா எண்ணெய்.'
      },
      {
        name: 'Serbuk Kunyit Adabi 100g',
        name_ms: 'Serbuk Kunyit Adabi 100g',
        name_ta: 'அதாபி மஞ்சள் தூள் 100கிராம்',
        category: 'Oil & Spices',
        price_sen: 220,
        original_price_sen: 250,
        discount_percent: 12,
        stock_quantity: 80,
        unit: '100g pack',
        description: 'Pure ground turmeric powder, essential for Malaysian fried chicken and fish marination.',
        description_ms: 'Serbuk kunyit tulen berkualiti tinggi untuk perapan ayam dan ikan goreng.',
        description_ta: 'தூய மஞ்சள் தூள், பொரியல் மற்றும் சமையலுக்கு சிறந்தது.'
      },

      // 3. Vegetables (6 items)
      {
        name: 'Cameron Highlands Sawi Hijau 500g',
        name_ms: 'Sawi Hijau Segar Cameron 500g',
        name_ta: 'பச்சை கடுகு கீரை 500கிராம்',
        category: 'Vegetables',
        price_sen: 350,
        original_price_sen: 420,
        discount_percent: 17,
        stock_quantity: 35,
        unit: '500g bunch',
        description: 'Fresh crisp green mustard vegetable delivered daily from Cameron Highlands.',
        description_ms: 'Sawi hijau segar dan rangup dari tanah tinggi Cameron Highlands.',
        description_ta: 'கேமரூன் மலைப்பகுதியில் இருந்து புதிய மொறுமொறுப்பான கீரை.'
      },
      {
        name: 'Kangkung Segar Kampung 300g',
        name_ms: 'Kangkung Segar 300g',
        name_ta: 'வள்ளல் கீரை 300கிராம்',
        category: 'Vegetables',
        price_sen: 240,
        original_price_sen: 280,
        discount_percent: 14,
        stock_quantity: 40,
        unit: '300g bunch',
        description: 'Fresh water spinach, perfect for popular Malaysian Kangkung Belacan.',
        description_ms: 'Kangkung segar pilihan ramai, enak digoreng belacan.',
        description_ta: 'சுவையான பொரியலுக்கு ஏற்ற புதிய கீரை.'
      },
      {
        name: 'Kobis Bulat Cameron 1kg',
        name_ms: 'Kobis Bulat Manis 1kg',
        name_ta: 'முட்டைக்கோஸ் 1கிலோ',
        category: 'Vegetables',
        price_sen: 420,
        original_price_sen: 480,
        discount_percent: 13,
        stock_quantity: 30,
        unit: '1kg head',
        description: 'Sweet and crunchy round cabbage from Cameron Highlands.',
        description_ms: 'Kobis bulat segar manis dan rangup untuk hidangan sup dan sayur campur.',
        description_ta: 'இனிப்பான மொறுமொறுப்பான புதிய முட்டைக்கோஸ்.'
      },
      {
        name: 'Cili Padi Merah Kampung 200g',
        name_ms: 'Cili Padi Merah Kampung 200g',
        name_ta: 'நாட்டு சிவப்பு ஊசி மிளகாய் 200கிராம்',
        category: 'Vegetables',
        price_sen: 450,
        original_price_sen: 500,
        discount_percent: 10,
        stock_quantity: 25,
        unit: '200g pack',
        description: 'Super spicy local red bird-eye chillies, essential for fiery sambals.',
        description_ms: 'Cili padi merah kampung yang sangat pedas dan wangi untuk sambal belacan.',
        description_ta: 'காரசாரமான சுவையான நாட்டு சிவப்பு ஊசி மிளகாய்.'
      },
      {
        name: 'Bawang Merah Ros Kecil India 1kg',
        name_ms: 'Bawang Merah Ros Kecil 1kg',
        name_ta: 'இந்திய சிறிய வெங்காயம் 1கிலோ',
        category: 'Vegetables',
        price_sen: 850,
        original_price_sen: 950,
        discount_percent: 11,
        stock_quantity: 35,
        unit: '1kg bag',
        description: 'Pungent Indian rose small shallots, adding deep authentic flavor to Asian curries.',
        description_ms: 'Bawang merah ros kecil berkualiti tinggi, memberikan rasa tumisan yang sangat sedap.',
        description_ta: 'உணவிற்கு கூடுதல் சுவை தரும் உயர்தர சிறிய வெங்காயம்.'
      },
      {
        name: 'Halia Tua Segar 500g',
        name_ms: 'Halia Tua Segar 500g',
        name_ta: 'புதிய நாட்டு இஞ்சி 500கிராம்',
        category: 'Vegetables',
        price_sen: 550,
        original_price_sen: 620,
        discount_percent: 11,
        stock_quantity: 25,
        unit: '500g pack',
        description: 'Aromatic mature ginger root, ideal for traditional Asian cooking and herbal tea.',
        description_ms: 'Halia tua berkualiti tinggi yang harum untuk masakan rendang dan minuman kesihatan.',
        description_ta: 'சமையல் மற்றும் ஆரோக்கிய பானத்திற்கு ஏற்ற புதிய நறுமண இஞ்சி.'
      },

      // 4. Fruits (5 items)
      {
        name: 'Pisang Berangan Emas 1kg',
        name_ms: 'Pisang Berangan Emas 1kg',
        name_ta: 'பெரங்கன் வாழைப்பழம் 1கிலோ',
        category: 'Fruits',
        price_sen: 650,
        original_price_sen: 750,
        discount_percent: 13,
        stock_quantity: 30,
        unit: '1kg comb',
        description: 'Sweet, fragrant, and golden ripe Malaysian Berangan bananas.',
        description_ms: 'Pisang berangan tempatan yang manis, harum dan kaya dengan kalium tenaga.',
        description_ta: 'இனிமையான சுவையான மலேசிய பெரங்கன் வாழைப்பழம்.'
      },
      {
        name: 'Betik Sekaki Manis 1.5kg',
        name_ms: 'Betik Sekaki Segar 1.5kg',
        name_ta: 'செகாக்கி பப்பாளி 1.5கிலோ',
        category: 'Fruits',
        price_sen: 590,
        original_price_sen: 680,
        discount_percent: 13,
        stock_quantity: 20,
        unit: '1 fruit (~1.5kg)',
        description: 'Juicy, vibrant red-orange Sekaki papaya, rich in digestive enzymes and vitamins.',
        description_ms: 'Betik sekaki tempatan manis dan berjus, sangat bagus untuk penghadaman.',
        description_ta: 'செரிமானத்திற்கு சிறந்த இனிப்பான புதிய பப்பாளி.'
      },
      {
        name: 'Tembikai Merah Tanpa Biji 3kg',
        name_ms: 'Tembikai Merah Tanpa Biji 3kg',
        name_ta: 'விதையில்லா சிவப்பு தர்பூசணி 3கிலோ',
        category: 'Fruits',
        price_sen: 1150,
        original_price_sen: 1350,
        discount_percent: 15,
        stock_quantity: 18,
        unit: '1 fruit (~3kg)',
        description: 'Refreshing sweet seedless red watermelon, ideal for hot tropical afternoons.',
        description_ms: 'Tembikai merah tanpa biji manis dan segar, melegakan dahaga waktu panas.',
        description_ta: 'தாகம் தீர்க்கும் இனிப்பான புதிய விதையில்லா தர்பூசணி.'
      },
      {
        name: 'Nenas Madu Johor 1 unit',
        name_ms: 'Nenas Madu Johor Manis 1 biji',
        name_ta: 'ஜொகூர் தேன் அன்னாசி 1 பழம்',
        category: 'Fruits',
        price_sen: 520,
        original_price_sen: 600,
        discount_percent: 13,
        stock_quantity: 25,
        unit: '1 fruit',
        description: 'Sweet honey pineapple from Johor, delightful in Pajeri or fresh salads.',
        description_ms: 'Nenas madu Johor yang sangat manis dan berjus, sedap untuk pajeri nenas.',
        description_ta: 'சுவையான புதிய தேன் அன்னாசிப்பழம்.'
      },
      {
        name: 'Epal Merah Fuji Rapi 5s',
        name_ms: 'Epal Merah Fuji Manis 5 biji',
        name_ta: 'ஃபுஜி சிவப்பு ஆப்பிள் 5 எண்ணிக்கை',
        category: 'Fruits',
        price_sen: 890,
        original_price_sen: 990,
        discount_percent: 10,
        stock_quantity: 35,
        unit: 'Pack of 5',
        description: 'Sweet, juicy and crisp imported Fuji red apples.',
        description_ms: 'Epal Fuji merah yang rangup, manis dan berjus untuk snek sihat sekeluarga.',
        description_ta: 'மொறுமொறுப்பான இனிப்பான புதிய சிவப்பு ஆப்பிள்.'
      },

      // 5. Meat & Fish (5 items)
      {
        name: 'Ayam Segar Bersih Standard 1.6kg',
        name_ms: 'Ayam Segar Bersih Halal 1.6kg',
        name_ta: 'புதிய ஹலால் கோழி 1.6கிலோ',
        category: 'Meat & Fish',
        price_sen: 1680,
        original_price_sen: 1890,
        discount_percent: 11,
        stock_quantity: 25,
        unit: '1 whole bird (~1.6kg)',
        description: 'Fresh dressed Halal broiler chicken, cleaned and ready for cooking.',
        description_ms: 'Ayam segar proses bersih halal tempatan, sedia untuk dimasak apa jua hidangan.',
        description_ta: 'சுத்தப்படுத்தப்பட்ட புதிய ஹலால் முழு கோழி.'
      },
      {
        name: 'Ikan Kembung Segar Pasar 500g',
        name_ms: 'Ikan Kembung Segar 500g',
        name_ta: 'அயிரை மீன் (கெம்போங்) 500கிராம்',
        category: 'Meat & Fish',
        price_sen: 1150,
        original_price_sen: 1300,
        discount_percent: 12,
        stock_quantity: 20,
        unit: '500g pack (~4-5 fish)',
        description: 'Fresh Indian mackerel caught locally, superb for Asam Pedas and deep frying.',
        description_ms: 'Ikan kembung segar dari laut tempatan, enak dimasak asam pedas atau goreng kunyit.',
        description_ta: 'புதிய கெம்போங் மீன், மீன் குழம்பு மற்றும் வறுவலுக்கு அருமையானது.'
      },
      {
        name: 'Daging Lembu Pejal Tempatan 500g',
        name_ms: 'Daging Lembu Segar Pejal 500g',
        name_ta: 'புதிய மாட்டிறைச்சி 500கிராம்',
        category: 'Meat & Fish',
        price_sen: 2250,
        original_price_sen: 2450,
        discount_percent: 8,
        stock_quantity: 15,
        unit: '500g pack',
        description: 'Fresh tender local beef topside cut, perfect for rich Rendang and spicy Daging Kicap.',
        description_ms: 'Daging pejal lembu segar tempatan yang lembut, sesuai untuk rendang dan gulai.',
        description_ta: 'ரெண்டாங் மற்றும் கறிக்கு ஏற்ற மென்மையான மாட்டிறைச்சி.'
      },
      {
        name: 'Udang Sederhana Segar Laut 500g',
        name_ms: 'Udang Segar Laut Sederhana 500g',
        name_ta: 'புதிய கடல் இறால் 500கிராம்',
        category: 'Meat & Fish',
        price_sen: 2100,
        original_price_sen: 2400,
        discount_percent: 13,
        stock_quantity: 15,
        unit: '500g pack',
        description: 'Sweet succulent fresh sea prawns, great for Sambal Udang and Tom Yum.',
        description_ms: 'Udang laut segar manis dan pejal, lazat dimasak sambal petai atau tomyam.',
        description_ta: 'சுவையான புதிய கடல் இறால்.'
      },
      {
        name: 'Ikan Siakap Segar Kolam 700g',
        name_ms: 'Ikan Siakap Segar 700g',
        name_ta: 'சியாக்காப் மீன் 700கிராம்',
        category: 'Meat & Fish',
        price_sen: 1550,
        original_price_sen: 1750,
        discount_percent: 11,
        stock_quantity: 16,
        unit: '1 fish (~700g)',
        description: 'Fresh Asian sea bass (Barramundi), fantastic for Siakap Stim Limau.',
        description_ms: 'Ikan siakap segar pilihan ramai, terbaik untuk hidangan stim limau ala Thai.',
        description_ta: 'சுவையான புதிய சியாக்காப் மீன்.'
      },

      // 6. Dairy & Eggs (5 items)
      {
        name: 'Telur Ayam Segar Gred A 30 Biji',
        name_ms: 'Telur Ayam Gred A Sarang 30 Biji',
        name_ta: 'கிரேடு ஏ முட்டை 30 எண்ணிக்கை',
        category: 'Dairy & Eggs',
        price_sen: 1380,
        original_price_sen: 1500,
        discount_percent: 8,
        stock_quantity: 50,
        unit: 'Tray of 30 eggs',
        description: 'Farm fresh Grade A eggs with bright yolks, packed with daily protein.',
        description_ms: 'Telur ayam gred A segar ladang berkualiti tinggi dengan kuning telur pekat.',
        description_ta: 'பண்ணை புதிய உயர்தர கிரேடு ஏ முட்டை 30 எண்ணிக்கை.'
      },
      {
        name: 'Dutch Lady PureFarm Fresh Milk 1L',
        name_ms: 'Susu Segar Penuh Krim Dutch Lady 1L',
        name_ta: 'டச்சு லேடி புதிய பால் 1லிட்டர்',
        category: 'Dairy & Eggs',
        price_sen: 740,
        original_price_sen: 820,
        discount_percent: 10,
        stock_quantity: 40,
        unit: '1L carton',
        description: 'Rich and creamy full cream fresh milk, wholesome nourishment for all ages.',
        description_ms: 'Susu segar penuh krim Dutch Lady lazat berkrim dengan khasiat kalsium tinggi.',
        description_ta: 'சுவையான முழு கிரீம் புதிய பால்.'
      },
      {
        name: 'SCS Salted Butter 227g',
        name_ms: 'Mentega Masin SCS 227g',
        name_ta: 'எஸ்.சி.எஸ் வெண்ணெய் 227கிராம்',
        category: 'Dairy & Eggs',
        price_sen: 1290,
        original_price_sen: 1450,
        discount_percent: 11,
        stock_quantity: 30,
        unit: '227g block',
        description: '100% pure Australian grass-fed dairy butter, perfect for baking and spread.',
        description_ms: 'Mentega tulen dari Australia, memberikan aroma wangi untuk biskut dan kek.',
        description_ta: 'உயர்தர தூய ஆஸ்திரேலிய வெண்ணெய்.'
      },
      {
        name: 'Chesdale Cheddar Cheese Slices 12s 250g',
        name_ms: 'Keju Keping Chesdale Cheddar 12s',
        name_ta: 'செஸ்டேல் சீஸ் துண்டுகள் 12 எண்ணிக்கை',
        category: 'Dairy & Eggs',
        price_sen: 1120,
        original_price_sen: 1250,
        discount_percent: 10,
        stock_quantity: 25,
        unit: '12 slices (250g)',
        description: 'Calcium-rich cheddar cheese slices, delicious for breakfast toast and burgers.',
        description_ms: 'Kepingan keju cheddar Chesdale kaya kalsium untuk sarapan pagi keluarga.',
        description_ta: 'ரொட்டி மற்றும் பர்கருக்கு ஏற்ற சுவையான சீஸ் துண்டுகள்.'
      },
      {
        name: 'Marigold Natural Yogurt 130g',
        name_ms: 'Yogurt Asli Marigold 130g',
        name_ta: 'மேரிகோல்ட் தயிர் 130கிராம்',
        category: 'Dairy & Eggs',
        price_sen: 210,
        original_price_sen: 240,
        discount_percent: 13,
        stock_quantity: 35,
        unit: '130g tub',
        description: 'Smooth creamy natural yogurt with live cultures for good gut digestive health.',
        description_ms: 'Yogurt semulajadi berkrim dengan kultur hidup untuk kesihatan perut usus.',
        description_ta: 'செரிமானத்திற்கு நன்மை பயக்கும் புதிய இயற்கை தயிர்.'
      },

      // 7. Snacks (5 items)
      {
        name: 'Hup Seng Special Cream Crackers 428g',
        name_ms: 'Biskut Hup Seng Ping Pong Cream Crackers 428g',
        name_ta: 'ஹப் செங் கிரீம் கிராக்கர்ஸ் 428கிராம்',
        category: 'Snacks',
        price_sen: 490,
        original_price_sen: 550,
        discount_percent: 11,
        stock_quantity: 60,
        unit: '428g pack',
        description: "Malaysia's timeless crispy cream crackers, best dipped in hot Milo or Kopi-O.",
        description_ms: 'Biskut krim kraker Cap Ping Pong lagenda, sedap dicicah air Milo panas.',
        description_ta: 'மலேசியாவின் பாரம்பரிய மொறுமொறுப்பான பிஸ்கட்.'
      },
      {
        name: "Julie's Peanut Butter Sandwich 360g",
        name_ms: "Biskut Sandwich Julie's Mentega Kacang 360g",
        name_ta: "ஜூலீஸ் வேர்க்கடலை வெண்ணெய் பிஸ்கட் 360கிராம்",
        category: 'Snacks',
        price_sen: 780,
        original_price_sen: 880,
        discount_percent: 11,
        stock_quantity: 40,
        unit: '360g pack',
        description: 'Golden crispy baked biscuits with rich, savory-sweet peanut butter filling.',
        description_ms: 'Biskut rangup berintikan mentega kacang yang pekat, berkrim dan lazat.',
        description_ta: 'சுவையான வேர்க்கடலை கிரீம் பிஸ்கட்.'
      },
      {
        name: 'Mister Potato Crisps Original 130g',
        name_ms: 'Kerepek Kentang Mister Potato Original 130g',
        name_ta: 'மிஸ்டர் பொட்டேட்டோ சிப்ஸ் 130கிராம்',
        category: 'Snacks',
        price_sen: 450,
        original_price_sen: 490,
        discount_percent: 8,
        stock_quantity: 50,
        unit: '130g canister',
        description: 'Crunchy potato crisps seasoned lightly with salt, 100% imported potatoes.',
        description_ms: 'Kerepek kentang rangup berperisa asli dalam tabung yang mudah dibawa.',
        description_ta: 'சுவையான மொறுமொறுப்பான உருளைக்கிழங்கு சிப்ஸ்.'
      },
      {
        name: 'Pagoda Menglembu Groundnuts 120g',
        name_ms: 'Kacang Menglembu Pagoda 120g',
        name_ta: 'பகோடா வறுத்த வேர்க்கடலை 120கிராம்',
        category: 'Snacks',
        price_sen: 380,
        original_price_sen: 420,
        discount_percent: 10,
        stock_quantity: 45,
        unit: '120g pack',
        description: 'Crispy roasted salted Menglembu groundnuts with shell, traditional recipe.',
        description_ms: 'Kacang tanah Menglembu panggang rangup berkulit resepi tradisional Ipoh.',
        description_ta: 'பாரம்பரிய சுவையான வறுத்த வேர்க்கடலை.'
      },
      {
        name: 'Keropok Ikan Lekor Terengganu Crispy 200g',
        name_ms: 'Keropok Ikan Crispy Terengganu 200g',
        name_ta: 'கெரோபோக் மீன் சிப்ஸ் 200கிராம்',
        category: 'Snacks',
        price_sen: 550,
        original_price_sen: 620,
        discount_percent: 11,
        stock_quantity: 30,
        unit: '200g pack',
        description: 'Crunchy Terengganu fish crackers loaded with real fish meat aroma.',
        description_ms: 'Keropok keping ikan Terengganu asli yang rangup dengan rasa ikan padu.',
        description_ta: 'சுவையான பாரம்பரிய மலேசிய மீன் சிப்ஸ்.'
      },

      // 8. Drinks (5 items)
      {
        name: 'Milo Serbuk Coklat Malt 1kg',
        name_ms: 'Milo Serbuk Coklat Malt 1kg',
        name_ta: 'மைலோ சாக்லேட் மால்ட் பவுடர் 1கிலோ',
        category: 'Drinks',
        price_sen: 1990,
        original_price_sen: 2250,
        discount_percent: 12,
        stock_quantity: 50,
        unit: '1kg bag',
        description: "Malaysia's favourite chocolate malt drink with Activ-Go nutrients and vitamins.",
        description_ms: 'Minuman coklat malt bertenaga kegemaran rakyat Malaysia dengan Activ-Go.',
        description_ta: 'மலேசியர்களின் விருப்பமான மைலோ சாக்லேட் மால்ட் பானம் 1கிலோ.'
      },
      {
        name: 'BOH Teh Tarik 3-in-1 Kurang Manis 19s x 27g',
        name_ms: 'Teh Tarik BOH 3-in-1 Kurang Manis 19s',
        name_ta: 'போ தே தாரிக் டீ 19 எண்ணிக்கை',
        category: 'Drinks',
        price_sen: 1450,
        original_price_sen: 1620,
        discount_percent: 11,
        stock_quantity: 40,
        unit: '19 sachets pack',
        description: 'Frothy and rich authentic Malaysian Teh Tarik with less sugar formula.',
        description_ms: 'Teh tarik asli Malaysia yang berbuih dan pekat dengan formula kurang manis.',
        description_ta: 'சுவையான பாரம்பரிய நுரை பொங்கும் மலேசிய தே தாரிக் டீ.'
      },
      {
        name: 'Kopi O Hang Tuah Tradisional 20s x 10g',
        name_ms: 'Kopi O Campuran Hang Tuah 20s',
        name_ta: 'ஹாங் துவா பாரம்பரிய கருப்பு காபி 20 எண்ணிக்கை',
        category: 'Drinks',
        price_sen: 620,
        original_price_sen: 690,
        discount_percent: 10,
        stock_quantity: 45,
        unit: '20 sachet box',
        description: 'Robust traditional Malaysian roasted dark coffee with rich cultural heritage.',
        description_ms: 'Kopi O kampung pekat dan wangi mengimbau nostalgia kedai kopi tradisi.',
        description_ta: 'பாரம்பரிய நறுமணமிக்க மலேசிய கருப்பு காபி.'
      },
      {
        name: "Yeo's Minuman Kacang Soya 1L",
        name_ms: "Susu Soya Yeo's 1L",
        name_ta: "யோஸ் சோயா பால் 1லிட்டர்",
        category: 'Drinks',
        price_sen: 330,
        original_price_sen: 380,
        discount_percent: 13,
        stock_quantity: 50,
        unit: '1L carton',
        description: 'Wholesome Canadian soy bean drink brewed fresh without preservatives.',
        description_ms: 'Minuman kacang soya asli Yeos yang enak diminum sejuk bila-bila masa.',
        description_ta: 'உடல்நலத்திற்கு உகந்த தூய சோயா பால்.'
      },
      {
        name: 'Ribena Blackcurrant Cordial 1L',
        name_ms: 'Kordial Blackcurrant Ribena 1L',
        name_ta: 'ரிபேனா கருப்பட்டி சாறு 1லிட்டர்',
        category: 'Drinks',
        price_sen: 1650,
        original_price_sen: 1890,
        discount_percent: 13,
        stock_quantity: 30,
        unit: '1L bottle',
        description: 'Pure New Zealand blackcurrant fruit juice cordial, 100% daily Vitamin C.',
        description_ms: 'Jus pekat buah blackcurrant New Zealand kaya Vitamin C untuk keceriaan sekeluarga.',
        description_ta: 'வைட்டமின் சி நிறைந்த புதிய கருப்பட்டி சாறு.'
      },

      // 9. Household (5 items)
      {
        name: 'Dynamo Power Gel Liquid Detergent 2.7kg',
        name_ms: 'Sabun Basuh Baju Cecair Dynamo 2.7kg',
        name_ta: 'டைனமோ துணி துவைக்கும் திரவம் 2.7கிலோ',
        category: 'Household',
        price_sen: 2690,
        original_price_sen: 3100,
        discount_percent: 13,
        stock_quantity: 35,
        unit: '2.7kg bottle',
        description: '2X better stain removal power for sparkling clean and fragrant laundry.',
        description_ms: 'Pembersih pakaian berkuasa tinggi menghilangkan kesan kotoran degil 2 kali lebih baik.',
        description_ta: 'துணிகளை பிரகாசமாகவும் நறுமணமாகவும் மாற்றும் சக்திவாய்ந்த துவைக்கும் திரவம்.'
      },
      {
        name: 'Sunlight Dishwashing Liquid Lemon 900ml',
        name_ms: 'Pencuci Pinggan Sunlight Lemon 900ml',
        name_ta: 'சன்லைட் பாத்திரம் கழுவும் திரவம் 900மில்லி',
        category: 'Household',
        price_sen: 690,
        original_price_sen: 780,
        discount_percent: 12,
        stock_quantity: 60,
        unit: '900ml bottle',
        description: 'Powered with 100 real lime extract for quick grease cutting on greasy dishes.',
        description_ms: 'Ekstrak 100 biji limau nipis sebenar menanggalkan minyak degil dengan pantas.',
        description_ta: 'எண்ணெய் பிசுக்கை நொடியில் நீக்கும் எலுமிச்சை பாத்திரம் கழுவும் திரவம்.'
      },
      {
        name: 'Premier Facial Tissue 2-Ply 200s x 4 boxes',
        name_ms: 'Tisu Muka Premier 2-Lapis 4 Kotak',
        name_ta: 'பிரீமியர் முக திசு காகிதம் 4 பெட்டிகள்',
        category: 'Household',
        price_sen: 1450,
        original_price_sen: 1650,
        discount_percent: 12,
        stock_quantity: 40,
        unit: 'Pack of 4 boxes',
        description: 'Soft and absorbent 100% virgin pulp 2-ply facial tissues.',
        description_ms: 'Tisu muka lembut dan tahan lasak 2 lapis daripada 100% pulpa dara tulen.',
        description_ta: 'மென்மையான உயர்தர முக திசு காகிதம் 4 பெட்டிகள்.'
      },
      {
        name: 'Dettol Antiseptic Disinfectant Liquid 500ml',
        name_ms: 'Cecair Antiseptik Pembasmi Kuman Dettol 500ml',
        name_ta: 'டெட்டால் கிருமி நாசினி திரவம் 500மில்லி',
        category: 'Household',
        price_sen: 1720,
        original_price_sen: 1950,
        discount_percent: 12,
        stock_quantity: 30,
        unit: '500ml bottle',
        description: 'Trusted family antiseptic liquid kills 99.9% of bacteria and germs.',
        description_ms: 'Cecair antiseptik pembasmi kuman terbukti melindungi keluarga daripada 99.9% bakteria.',
        description_ta: '99.9% கிருமிகளை அழிக்கும் குடும்பத்திற்கான பாதுகாப்பான கிருமி நாசினி திரவம்.'
      },
      {
        name: 'Clorox Regular Bleach 1L',
        name_ms: 'Peluntur Clorox Regular 1L',
        name_ta: 'குளோராக்ஸ் ப்ளீச் 1லிட்டர்',
        category: 'Household',
        price_sen: 480,
        original_price_sen: 540,
        discount_percent: 11,
        stock_quantity: 40,
        unit: '1L bottle',
        description: 'Disinfects, cleans and whitens fabrics and household surfaces.',
        description_ms: 'Peluntur dan pembasmi kuman serbaguna untuk pakaian putih dan lantai rumah.',
        description_ta: 'துணிகளை வெண்மையாக்கும் பல்துறை துப்புரவு திரவம்.'
      },

      // 10. Others (5 items)
      {
        name: 'CSR Gula Pasir Kasar Putih 1kg',
        name_ms: 'Gula Pasir Kasar CSR 1kg',
        name_ta: 'சி.எஸ்.ஆர் சர்க்கரை 1கிலோ',
        category: 'Others',
        price_sen: 285,
        original_price_sen: 310,
        discount_percent: 8,
        stock_quantity: 75,
        unit: '1kg pack',
        description: 'Pure refined granulated cane sugar, household staple for cooking and beverages.',
        description_ms: 'Gula tebu putih berkualiti tinggi dari CSR untuk minuman manis dan masakan harian.',
        description_ta: 'தூய கரும்பு சர்க்கரை 1கிலோ.'
      },
      {
        name: 'Garam Halus Beriodin Cap Udang 450g',
        name_ms: 'Garam Halus Beriodin Cap Udang 450g',
        name_ta: 'அயோடின் கலந்த சமையல் உப்பு 450கிராம்',
        category: 'Others',
        price_sen: 110,
        original_price_sen: 130,
        discount_percent: 15,
        stock_quantity: 80,
        unit: '450g pack',
        description: 'Pure iodized fine table salt for healthy seasoning and cooking.',
        description_ms: 'Garam halus beriodin bermutu tinggi untuk perasa masakan sekeluarga.',
        description_ta: 'சமையலுக்கு ஏற்ற அயோடின் கலந்த நைஸ் உப்பு.'
      },
      {
        name: 'Tepung Gandum Cap Sauh 1kg',
        name_ms: 'Tepung Gandum Cap Sauh 1kg',
        name_ta: 'சாவு நங்கூரம் கோதுமை மாவு 1கிலோ',
        category: 'Others',
        price_sen: 360,
        original_price_sen: 400,
        discount_percent: 10,
        stock_quantity: 65,
        unit: '1kg pack',
        description: 'Enriched all-purpose wheat flour, ideal for Roti Canai, cakes and fried fritters.',
        description_ms: 'Tepung gandum serbaguna berkualiti tinggi sesuai untuk roti canai, kek dan cucur.',
        description_ta: 'ரோட்டி மற்றும் பலகாரங்களுக்கு உகந்த கோதுமை மாவு 1கிலோ.'
      },
      {
        name: 'Kara Santan Kelapa Asli UHT 200ml',
        name_ms: 'Santan Kelapa Kotak Kara 200ml',
        name_ta: 'காரா தேங்காய் பால் 200மில்லி',
        category: 'Others',
        price_sen: 310,
        original_price_sen: 350,
        discount_percent: 11,
        stock_quantity: 90,
        unit: '200ml pack',
        description: 'Rich, thick 100% natural coconut milk extract, essential for Malaysian curries and desserts.',
        description_ms: 'Santan kelapa pekat asli Kara yang berlemak manis untuk gulai dan kuih tradisional.',
        description_ta: 'கறி மற்றும் இனிப்புகளுக்கு ஏற்ற அடர்த்தியான தேங்காய் பால்.'
      },
      {
        name: 'Lee Kum Kee Premium Oyster Sauce 510g',
        name_ms: 'Sos Tiram Premium Lee Kum Kee 510g',
        name_ta: 'லீ கும் கீ சிப்பி சாஸ் 510கிராம்',
        category: 'Others',
        price_sen: 1050,
        original_price_sen: 1190,
        discount_percent: 12,
        stock_quantity: 35,
        unit: '510g glass bottle',
        description: 'Rich savory oyster sauce made from finest oyster extracts, enhances vegetable stir-fries.',
        description_ms: 'Sos tiram premium yang pekat berperisa untuk sayur goreng dan masakan tumis.',
        description_ta: 'சுவையான சிப்பி சாஸ் 510கிராம்.'
      }
    ];

    console.log(`[Seed] Inserting ${products.length} products...`);
    db.transaction(tx => {
      for (const prod of products) {
        const imageUrl = getPlaceholderImage(prod.category, prod.name);
        const result = tx.run(
          `INSERT INTO products (
            name, name_ms, name_ta, category, price_sen, original_price_sen, discount_percent,
            stock_quantity, low_stock_threshold, unit, description, description_ms, description_ta,
            image_url, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 5, ?, ?, ?, ?, ?, 1)`,
          [
            prod.name,
            prod.name_ms,
            prod.name_ta,
            prod.category,
            prod.price_sen,
            prod.original_price_sen,
            prod.discount_percent,
            prod.stock_quantity,
            prod.unit,
            prod.description,
            prod.description_ms,
            prod.description_ta,
            imageUrl
          ]
        );

        tx.run(
          `INSERT INTO inventory_movements (product_id, change_qty, balance_qty, movement_type, reference_id, notes)
           VALUES (?, ?, ?, 'RESTOCK', NULL, 'Initial product stock seed')`,
          [result.lastInsertRowid, prod.stock_quantity, prod.stock_quantity]
        );
      }
    });

    console.log(`[Seed] Successfully seeded ${products.length} Malaysian grocery products across all 10 categories!`);
  }

  console.log('[Seed] Seeding completed successfully.');
}

if (require.main === module) {
  seed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}

module.exports = { seed };
