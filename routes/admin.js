// admin.js
var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/productHelpers');
const adminHelpers = require('../helpers/adminHelpers');
const { verifyAdminLogin, redirectIfLoggedIn } = require('../middleware/auth');

// Store the previous URL in the session before the login
router.get('/login', redirectIfLoggedIn, (req, res) => {
  req.session.returnTo = req.get('Referer') || '/admin';
  res.render('admin/login', { isAdminLoginPage: true });
});

/* POST admin login */
router.post('/login', async (req, res) => {
  try {
    const response = await adminHelpers.doLogin(req.body);
    if (response.status) {
      req.session.admin = response.admin;
      req.session.admin.loggedIn = true;
      const redirectUrl = req.session.returnTo || '/admin';
      delete req.session.returnTo; // Clean up the session variable
      res.redirect(redirectUrl);
    } else {
      res.render('admin/login', { loginErr: 'Invalid email or password', isAdminLoginPage: true });
    }
  } catch (error) {
    console.error('Error during admin login:', error);
    res.render('admin/login', { loginErr: 'Something went wrong, please try again', isAdminLoginPage: true });
  }
});

/* Admin logout */
router.get('/logout', (req, res) => {
  req.session.admin = null;
  res.redirect('/admin/login');
});

/* GET admin home page */
router.get('/', verifyAdminLogin, function (req, res, next) {
  productHelpers.getAllProducts().then((products) => {
    res.render('admin/view-product', { admin: true, products });
  });
});

router.get('/add-product', verifyAdminLogin, function (req, res) {
  res.render('admin/add-product', { admin: true });
});

router.post('/add-product', verifyAdminLogin, (req, res) => {
  console.log(req.body);
  console.log(req.files); // Log the entire req.files object
  productHelpers.addProduct(req.body, (id) => {
    let image = req.files.image;
    console.log(id);
    image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
      if (!err) {
        res.render('admin/add-product');
      } else {
        console.log(err);
      }
    });
  });
  res.redirect('/admin');
});

router.get('/delete-product/:id', verifyAdminLogin, (req, res) => {
  let proId = req.params.id;
  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/admin/');
  }).catch((error) => {
    // Handle error
    console.error('Error deleting product:', error);
    res.redirect('/admin/');
  });
});

router.get('/edit-product/:id', verifyAdminLogin, async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id);
  console.log(product);
  res.render('admin/edit-product', { admin: true, product });
});

router.post('/edit-product/:id', verifyAdminLogin, (req, res) => {
  console.log(req.params.id);
  let id = req.params.id;
  
  // Check if an image file is provided
  if (req.files && req.files.image) {
    let image = req.files.image;
    image.mv('./public/product-images/' + id + '.jpg', (err) => {
      if (err) {
        console.error('Error while uploading image:', err);
        return res.redirect('/admin');
      }
    });
  }
  
  // Update the product details
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin');
  }).catch((err) => {
    console.error('Error while updating product:', err);
    res.redirect('/admin');
  });
});

router.get('/all-orders', verifyAdminLogin, async (req, res) => {
  try {
      let orders = await productHelpers.getAllOrders(); // Use the getAllOrders function from productHelpers
      res.render('admin/orders', { admin: true, orders });
  } catch (error) {
      console.error('Error fetching all orders:', error);
      res.render('admin/orders', { admin: true, orders: [], error: 'Failed to fetch orders' });
  }
});


router.post('/update-tracking/:id', async (req, res) => {
  try {
      const orderId = req.params.id;
      await productHelpers.updateOrderTracking(orderId);
      res.json({ success: true });
  } catch (error) {
      console.error('Error updating tracking status:', error);
      res.status(500).json({ success: false });
  }
});


router.get('/all-users', verifyAdminLogin, async (req, res) => {
  try {
    let users = await adminHelpers.getAllUsers(); // Use adminHelpers to fetch all users
    res.render('admin/all-users', { admin: true, users }); // Pass admin flag
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.render('error', { message: 'Error fetching all users' });
  }
});



module.exports = router;
