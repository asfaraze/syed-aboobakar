const constants = require('../config/constants');
const db = require('../config/db');
const AuditLogger = require('../utils/auditLogger');
const NotificationService = require('../utils/notifications');

class ProductsController {
  /**
   * Get all products with filters, search, sorting and pagination
   */
  static getAll(req, res) {
    try {
      const {
        category,
        search,
        minPrice, // in RM or sen
        maxPrice,
        inStock,
        discountOnly,
        sort = 'newest',
        page = 1,
        limit = 24
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 24));
      const offset = (pageNum - 1) * limitNum;

      const conditions = ['is_active = 1'];
      const params = [];

      // Category filter
      if (category && category !== 'All') {
        conditions.push('category = ?');
        params.push(category);
      }

      // Search query (English, Malay, Tamil, and Description)
      if (search && search.trim() !== '') {
        const q = `%${search.trim()}%`;
        conditions.push('(name LIKE ? OR name_ms LIKE ? OR name_ta LIKE ? OR description LIKE ? OR category LIKE ?)');
        params.push(q, q, q, q, q);
      }

      // Price filters (convert RM input to sen if string contains decimal or small number)
      if (minPrice !== undefined && minPrice !== '') {
        const minSen = Math.round(parseFloat(minPrice) * 100);
        conditions.push('price_sen >= ?');
        params.push(minSen);
      }
      if (maxPrice !== undefined && maxPrice !== '') {
        const maxSen = Math.round(parseFloat(maxPrice) * 100);
        conditions.push('price_sen <= ?');
        params.push(maxSen);
      }

      // In-stock filter
      if (inStock === 'true' || inStock === '1') {
        conditions.push('stock_quantity > 0');
      }

      // Discount-only filter
      if (discountOnly === 'true' || discountOnly === '1') {
        conditions.push('discount_percent > 0');
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Sorting
      let orderBy = 'id DESC';
      switch (sort) {
        case 'alpha':
        case 'name_asc':
          orderBy = 'name ASC';
          break;
        case 'price_asc':
          orderBy = 'price_sen ASC';
          break;
        case 'price_desc':
          orderBy = 'price_sen DESC';
          break;
        case 'discount':
        case 'discount_desc':
          orderBy = 'discount_percent DESC';
          break;
        case 'newest':
        default:
          orderBy = 'id DESC';
          break;
      }

      // Total count query
      const countRow = db.get(`SELECT COUNT(*) as total FROM products ${whereClause}`, params);
      const total = countRow ? countRow.total : 0;

      // Products query
      const querySql = `
        SELECT * FROM products 
        ${whereClause} 
        ORDER BY ${orderBy} 
        LIMIT ? OFFSET ?
      `;
      const products = db.query(querySql, [...params, limitNum, offset]);

      return res.json({
        products,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (err) {
      console.error('Products error:', err);
      return res.status(500).json({ error: 'Failed to retrieve products' });
    }
  }

  /**
   * Search suggestions for live search dropdown
   */
  static getSuggestions(req, res) {
    try {
      const { q } = req.query;
      if (!q || q.trim().length < 2) {
        return res.json({ suggestions: [] });
      }

      const searchPattern = `%${q.trim()}%`;
      const suggestions = db.query(
        `SELECT id, name, name_ms, name_ta, category, price_sen, image_url, unit 
         FROM products 
         WHERE is_active = 1 AND (name LIKE ? OR name_ms LIKE ? OR category LIKE ?)
         LIMIT 8`,
        [searchPattern, searchPattern, searchPattern]
      );

      return res.json({ suggestions });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve suggestions' });
    }
  }

  /**
   * Get single product by ID with related products
   */
  static getById(req, res) {
    try {
      const { id } = req.params;
      const product = db.get('SELECT * FROM products WHERE id = ? AND is_active = 1', [id]);

      if (!product) {
        return res.status(404).json({ error: 'Product not found or unavailable' });
      }

      // "You May Also Like" in the same category
      const related = db.query(
        'SELECT * FROM products WHERE category = ? AND id != ? AND is_active = 1 LIMIT 4',
        [product.category, product.id]
      );

      return res.json({ product, related });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve product details' });
    }
  }

  /**
   * Admin: Add new product
   */
  static create(req, res) {
    try {
      const {
        name,
        name_ms,
        name_ta,
        category,
        price_sen,
        original_price_sen,
        discount_percent = 0,
        stock_quantity = 0,
        low_stock_threshold = 5,
        unit = '1 unit',
        description,
        description_ms,
        description_ta,
        image_url
      } = req.body;

      if (!name || !category || price_sen === undefined) {
        return res.status(400).json({ error: 'Product name, category, and price are required.' });
      }

      if (!constants.CATEGORIES.includes(category)) {
        return res.status(400).json({ error: `Category must be one of: ${constants.CATEGORIES.join(', ')}` });
      }

      const sen = Math.max(0, parseInt(price_sen, 10));
      const origSen = original_price_sen ? Math.max(0, parseInt(original_price_sen, 10)) : null;
      const stock = Math.max(0, parseInt(stock_quantity, 10));
      const lowStock = Math.max(1, parseInt(low_stock_threshold, 10) || 5);
      const discount = Math.max(0, Math.min(100, parseInt(discount_percent, 10) || 0));

      const result = db.run(
        `INSERT INTO products (
          name, name_ms, name_ta, category, price_sen, original_price_sen, discount_percent,
          stock_quantity, low_stock_threshold, unit, description, description_ms, description_ta,
          image_url, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          name.trim(),
          name_ms ? name_ms.trim() : null,
          name_ta ? name_ta.trim() : null,
          category,
          sen,
          origSen,
          discount,
          stock,
          lowStock,
          unit.trim(),
          description ? description.trim() : null,
          description_ms ? description_ms.trim() : null,
          description_ta ? description_ta.trim() : null,
          image_url || '/placeholder-grocery.png'
        ]
      );

      const newId = result.lastInsertRowid;

      // Record initial inventory movement
      db.run(
        `INSERT INTO inventory_movements (product_id, change_qty, balance_qty, movement_type, reference_id, notes)
         VALUES (?, ?, ?, 'RESTOCK', NULL, 'Initial stock creation')`,
        [newId, stock, stock]
      );

      AuditLogger.log({
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role,
        action: 'PRODUCT_CREATE',
        details: { productId: newId, name, price_sen: sen, stock },
        ipAddress: req.ip
      });

      const newProduct = db.get('SELECT * FROM products WHERE id = ?', [newId]);
      return res.status(201).json({ message: 'Product created successfully', product: newProduct });
    } catch (err) {
      console.error('Create product error:', err);
      return res.status(500).json({ error: 'Failed to create product' });
    }
  }

  /**
   * Admin: Update existing product
   */
  static update(req, res) {
    try {
      const { id } = req.params;
      const product = db.get('SELECT * FROM products WHERE id = ?', [id]);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const {
        name = product.name,
        name_ms = product.name_ms,
        name_ta = product.name_ta,
        category = product.category,
        price_sen = product.price_sen,
        original_price_sen = product.original_price_sen,
        discount_percent = product.discount_percent,
        stock_quantity = product.stock_quantity,
        low_stock_threshold = product.low_stock_threshold,
        unit = product.unit,
        description = product.description,
        description_ms = product.description_ms,
        description_ta = product.description_ta,
        image_url = product.image_url,
        is_active = product.is_active
      } = req.body;

      const sen = Math.max(0, parseInt(price_sen, 10));
      const origSen = original_price_sen ? Math.max(0, parseInt(original_price_sen, 10)) : null;
      const newStock = Math.max(0, parseInt(stock_quantity, 10));
      const discount = Math.max(0, Math.min(100, parseInt(discount_percent, 10) || 0));

      // Check if stock changed directly
      const stockDiff = newStock - product.stock_quantity;
      if (stockDiff !== 0) {
        db.run(
          `INSERT INTO inventory_movements (product_id, change_qty, balance_qty, movement_type, reference_id, notes)
           VALUES (?, ?, ?, 'MANUAL_ADJUSTMENT', NULL, 'Product edit update')`,
          [id, stockDiff, newStock]
        );
      }

      db.run(
        `UPDATE products SET
          name = ?, name_ms = ?, name_ta = ?, category = ?, price_sen = ?, original_price_sen = ?,
          discount_percent = ?, stock_quantity = ?, low_stock_threshold = ?, unit = ?,
          description = ?, description_ms = ?, description_ta = ?, image_url = ?, is_active = ?,
          updated_at = datetime('now')
         WHERE id = ?`,
        [
          name, name_ms, name_ta, category, sen, origSen, discount,
          newStock, low_stock_threshold, unit, description, description_ms, description_ta,
          image_url, is_active, id
        ]
      );

      AuditLogger.log({
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role,
        action: 'PRODUCT_UPDATE',
        details: { productId: id, name, price_sen: sen, stock: newStock },
        ipAddress: req.ip
      });

      const updated = db.get('SELECT * FROM products WHERE id = ?', [id]);
      return res.json({ message: 'Product updated successfully', product: updated });
    } catch (err) {
      console.error('Update product error:', err);
      return res.status(500).json({ error: 'Failed to update product' });
    }
  }

  /**
   * Admin: Delete product (soft delete by setting is_active = 0)
   */
  static delete(req, res) {
    try {
      const { id } = req.params;
      const product = db.get('SELECT * FROM products WHERE id = ?', [id]);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      db.run('UPDATE products SET is_active = 0 WHERE id = ?', [id]);

      AuditLogger.log({
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role,
        action: 'PRODUCT_DELETE',
        details: { productId: id, name: product.name },
        ipAddress: req.ip
      });

      return res.json({ message: 'Product removed successfully' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete product' });
    }
  }

  /**
   * Admin: Stock Adjustment (+/- with reason)
   */
  static adjustStock(req, res) {
    try {
      const { id } = req.params;
      const { adjustment, reason } = req.body;

      const changeQty = parseInt(adjustment, 10);
      if (isNaN(changeQty) || changeQty === 0) {
        return res.status(400).json({ error: 'Adjustment quantity must be a non-zero integer' });
      }

      const product = db.get('SELECT * FROM products WHERE id = ?', [id]);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const newBalance = product.stock_quantity + changeQty;
      if (newBalance < 0) {
        return res.status(400).json({
          error: `Cannot reduce stock below 0. Current stock is ${product.stock_quantity}, reduction requested was ${Math.abs(changeQty)}.`
        });
      }

      db.transaction(tx => {
        tx.run('UPDATE products SET stock_quantity = ? WHERE id = ?', [newBalance, id]);
        tx.run(
          `INSERT INTO inventory_movements (product_id, change_qty, balance_qty, movement_type, reference_id, notes)
           VALUES (?, ?, ?, 'MANUAL_ADJUSTMENT', NULL, ?)`,
          [id, changeQty, newBalance, reason || 'Manual stock adjustment']
        );
      });

      // Low stock alert check
      if (newBalance <= product.low_stock_threshold) {
        NotificationService.notify({
          targetRole: 'seller',
          title: 'Low Stock Alert',
          message: `Product "${product.name}" is low on stock (${newBalance} left).`,
          type: 'low_stock'
        });
      }

      AuditLogger.log({
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role,
        action: 'STOCK_ADJUSTMENT',
        details: { productId: id, name: product.name, changeQty, newBalance, reason },
        ipAddress: req.ip
      });

      return res.json({ message: 'Stock updated', newBalance });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to adjust stock' });
    }
  }

  /**
   * Admin: Bulk CSV Import with row-by-row validation & error reporting
   */
  static bulkImportCSV(req, res) {
    try {
      const { csvData } = req.body;
      if (!csvData || typeof csvData !== 'string') {
        return res.status(400).json({ error: 'Valid CSV text content is required' });
      }

      const lines = csvData.trim().split(/\r?\n/);
      if (lines.length < 2) {
        return res.status(400).json({ error: 'CSV file is empty or missing data rows' });
      }

      // Expected headers:
      // name,name_ms,name_ta,category,price_rm,stock,unit,description,image_url
      const headerLine = lines[0].toLowerCase();
      const rows = lines.slice(1);

      let importedCount = 0;
      const errors = [];

      db.transaction(tx => {
        rows.forEach((row, index) => {
          const rowNumber = index + 2;
          if (!row.trim()) return;

          // Simple CSV line splitter that handles quotes
          const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
          const fields = [];
          let match;
          while ((match = regex.exec(row)) !== null) {
            fields.push(match[1] !== undefined ? match[1] : match[2]);
          }

          const [name, name_ms, name_ta, category, price_rm, stock, unit, description, image_url] = fields;

          if (!name || !name.trim()) {
            errors.push({ row: rowNumber, error: 'Product name is required' });
            return;
          }

          if (!category || !constants.CATEGORIES.includes(category.trim())) {
            errors.push({
              row: rowNumber,
              error: `Invalid category "${category}". Must be one of: ${constants.CATEGORIES.join(', ')}`
            });
            return;
          }

          const priceFloat = parseFloat(price_rm);
          if (isNaN(priceFloat) || priceFloat < 0) {
            errors.push({ row: rowNumber, error: `Invalid price "${price_rm}"` });
            return;
          }

          const stockInt = parseInt(stock, 10);
          if (isNaN(stockInt) || stockInt < 0) {
            errors.push({ row: rowNumber, error: `Invalid stock quantity "${stock}"` });
            return;
          }

          const price_sen = Math.round(priceFloat * 100);

          const result = tx.run(
            `INSERT INTO products (
              name, name_ms, name_ta, category, price_sen, stock_quantity, unit, description, image_url, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              name.trim(),
              name_ms ? name_ms.trim() : null,
              name_ta ? name_ta.trim() : null,
              category.trim(),
              price_sen,
              stockInt,
              unit ? unit.trim() : '1 unit',
              description ? description.trim() : null,
              image_url ? image_url.trim() : '/placeholder-grocery.png'
            ]
          );

          tx.run(
            `INSERT INTO inventory_movements (product_id, change_qty, balance_qty, movement_type, reference_id, notes)
             VALUES (?, ?, ?, 'IMPORT', NULL, 'Bulk CSV import')`,
            [result.lastInsertRowid, stockInt, stockInt]
          );

          importedCount++;
        });
      });

      AuditLogger.log({
        userId: req.user.id,
        userName: req.user.name,
        role: req.user.role,
        action: 'PRODUCT_CSV_IMPORT',
        details: { importedCount, errorCount: errors.length },
        ipAddress: req.ip
      });

      return res.json({
        message: `Successfully imported ${importedCount} product(s)`,
        importedCount,
        errors
      });
    } catch (err) {
      console.error('CSV import error:', err);
      return res.status(500).json({ error: 'Failed to process CSV file' });
    }
  }

  /**
   * Download CSV Template
   */
  static getCSVTemplate(req, res) {
    const csvHeader = 'name,name_ms,name_ta,category,price_rm,stock,unit,description,image_url\n';
    const sampleRow = '"Jasmine Super Special Tempatan 10kg","Beras Jasmine Super Special 10kg","ஜாஸ்மின் அரிசி 10கிலோ","Rice & Grains",39.90,50,"10kg","High quality Malaysian local fragrant rice","/placeholder-grocery.png"\n';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="syed_aboobakar_products_template.csv"');
    return res.send(csvHeader + sampleRow);
  }
}

module.exports = ProductsController;
