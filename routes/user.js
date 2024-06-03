// user.js
var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/productHelpers');
const userHelpers = require('../helpers/user-helpers');
const { formatDate } = require('../helpers/dateHelpers');

const verifyLogin = (req, res, next) => {
  if (req.session.user && req.session.user.loggedIn) {
      next();
  } else {
      res.redirect('/login');
  }
};

/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user;
  let cartCount = 0;

  if (user) {
    cartCount = await userHelpers.getCartCount(user._id);
  }

  productHelpers.getAllProducts().then((products) => {
    res.render('user/view-product', { products, user, cartCount, isCartPage: false });
  });
});

router.get('/login', (req, res) => {
  // Store the previous URL in the session
  req.session.returnTo = req.get('Referer') || '/';

  if (req.session.user) {
    res.redirect('/');
  } else {
    res.render('user/login', { 'loginErr': req.session.userLoginErr,isUserLoginpage:true});
    req.session.userLoginErr = false;
  }
});

router.get('/signup', (req, res) => {
  res.render('user/signup');
});

router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    console.log(response); // This should log the response data to the console
    console.log(req.body);
    req.session.user = response;
    req.session.user.loggedIn = true;
    res.redirect('/login'); // Redirect to login page after signup
  });
});

router.post('/login', async (req, res) => {
  try {
    let response = await userHelpers.doLogin(req.body);
    if (response.status) {
      req.session.user = response.user; // Store user object in session
      req.session.user.loggedIn = true;
      req.session.userId = response.user._id; // Also set userId in session
      res.redirect(req.session.returnTo || '/');
    } else {
      req.session.userLoginErr = 'Invalid Email or Password';
      res.redirect('/login');
    }
  } catch (error) {
    console.error('Error during login:', error);
    req.session.userLoginErr = 'Something went wrong. Please try again.';
    res.redirect('/login');
  }
});


router.get('/logout', async (req, res) => {
  if (req.session.user) {
    await userHelpers.updateLastLogout(req.session.user._id);
    req.session.user = null;
  }
  res.redirect('/login');
});


router.get('/cart', verifyLogin, async (req, res) => {
  let { cartItems, totalPrice } = await userHelpers.getCartProducts(req.session.user._id);
  res.render('user/cart', { products: cartItems, totalPrice, user: req.session.user, isCartPage: true });
});

router.get('/add-to-cart/:id', (req, res) => {
  console.log('api call');
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true }); // Send JSON response indicating success
  });
});

router.get('/cart-count', verifyLogin, async (req, res) => {
  try {
    let cartCount = await userHelpers.getCartCount(req.session.user._id);
    res.json({ cartCount });
  } catch (error) {
    console.error('Error fetching cart count:', error);
    res.json({ cartCount: 0 });
  }
});

router.post('/change-product-quantity', verifyLogin, async (req, res) => {
  try {
    let response = await userHelpers.changeProductQuantity(req.session.user._id, req.body);
    res.json({ status: true, quantity: response.quantity }); // Include updated quantity
  } catch (error) {
    console.error('Error changing product quantity:', error);
    res.json({ status: false, message: 'Error changing product quantity' });
  }
});

router.post('/remove-item', verifyLogin, async (req, res) => {
  try {
    let productId = req.body.productId;
    await userHelpers.removeCartItem(req.session.user._id, productId);
    res.json({ status: true }); // Send JSON response indicating success
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.json({ status: false, message: 'Error removing item from cart' });
  }
});

router.get('/place-order', verifyLogin, async (req, res) => {
  try {
    let { totalPrice } = await userHelpers.getCartProducts(req.session.user._id); // Get total price
    res.render('user/place-order', { totalPrice, user: req.session.user }); // Pass total price and user data to the place order page
  } catch (error) {
    console.error('Error getting total price:', error);
    res.render('error', { message: 'Error getting total price' });
  }
});

router.post('/place-order', async (req, res) => {
  try {
      const { address, pincode, mobile, userId, paymentMethod } = req.body;

      // Validate payment method
      if (!paymentMethod) {
          return res.status(400).json({ error: "Payment method is required" });
      }

      // Retrieve cart products and total amount
      let products = await userHelpers.getCartProductList(userId);
      let total = await userHelpers.getTotalAmount(userId);

      // Place the order
      let orderId = await userHelpers.placeOrder({ userId, address, pincode, mobile, paymentMethod }, products, total);

      if (paymentMethod === 'cod') {
          res.json({ codSuccess: true });
      } else {
          // Generate Razorpay order
          let order = await userHelpers.generateRazorpay(orderId, total);
          res.json(order);
      }
  } catch (error) {
      console.error('Error placing order:', error);
      res.status(500).send('Internal Server Error');
  }
});

router.get('/order-success', (req, res) => {
  res.render('user/order-success', { user: req.session.user });
});

router.get('/orders', verifyLogin, async (req, res) => {
  try {
      let userId = req.session.user._id; // Get the logged-in user's ID from the session
      let orders = await userHelpers.getOrders(userId); // Fetch orders for this user
      res.render('user/orders', { orders, user: req.session.user }); // Pass user information
  } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).send('Internal Server Error');
  }
});


router.get('/view-order-products/:orderId', async (req, res) => {
  try {
    let orderId = req.params.orderId;
    let order = await userHelpers.getOrderDetails(orderId);
    res.render('user/view-order-products', { order });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.render('error', { message: 'Error fetching order details' });
  }
});

router.post('/verify-payment', (req, res) => {
  const crypto = require('crypto');
  const { payment, order } = req.body;

  let hmac = crypto.createHmac('sha256', '0bQoIL1Iw9gsgBzQie5uWtHL');
  hmac.update(payment.razorpay_order_id + '|' + payment.razorpay_payment_id);
  hmac = hmac.digest('hex');

  if (hmac === payment.razorpay_signature) {
    userHelpers.changePaymentStatus(order.receipt).then(() => {
      res.json({ status: true });
    }).catch((err) => {
      console.error('Error updating payment status:', err);
      res.json({ status: false, errMsg: 'Error updating payment status' });
    });
  } else {
    res.json({ status: false, errMsg: 'Payment verification failed' });
  }
});

module.exports = router;
