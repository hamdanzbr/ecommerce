// user-helper.js
var db = require('../config/connection');
var collection = require('../config/collections');
const bcrypt = require('bcrypt');
const { resolve, reject } = require('promise');
const { response } = require('express');
var objectId = require('mongodb').ObjectId;
const Razorpay = require('razorpay');
var instance=new Razorpay({
    key_id:'rzp_test_2LlJCVrSkpyFNy',
    key_secret:'0bQoIL1Iw9gsgBzQie5uWtHL',
});

module.exports = {
    doSignup: async (userData) => {
        try {
            userData.Password = await bcrypt.hash(userData.Password, 10);
            const result = await db.get().collection(collection.USER_COLLECTION).insertOne(userData);
            console.log('User added successfully:', result.insertedId);
            return result.insertedId;
        } catch (error) {
            console.error('Error inserting user:', error);
            throw error; // Throw the error if insertion fails
        }
    },

    doLogin: async (userData) => {
        try {
            const user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email });
    
            if (user) {
                const status = await bcrypt.compare(userData.Password, user.Password);
                if (status) {
                    // Update lastLogin field with current timestamp
                    await db.get().collection(collection.USER_COLLECTION).updateOne(
                        { _id: user._id },
                        { $set: { lastLogin: new Date() } }
                    );
                    console.log('login success');
                    return { status: true, user: user };
                } else {
                    console.log('login failed');
                    return { status: false };
                }
            } else {
                console.log('login failed');
                return { status: false };
            }
        } catch (error) {
            console.error('Error during login:', error);
            throw error;
        }
    },
    


    addToCart: (proId, userId) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            try {
                let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
                if (userCart) {
                    let proExistIndex = userCart.products.findIndex(product => product.item.equals(proObj.item));
                    if (proExistIndex !== -1) {
                        // If the product already exists in the cart, update its quantity
                        db.get().collection(collection.CART_COLLECTION).updateOne(
                            { user: objectId(userId), 'products.item': proObj.item },
                            { $inc: { 'products.$.quantity': 1 } }
                        ).then(() => {
                            resolve();
                        });
                    } else {
                        // If the product doesn't exist in the cart, add it
                        db.get().collection(collection.CART_COLLECTION).updateOne(
                            { user: objectId(userId) },
                            { $push: { products: proObj } }
                        ).then(() => {
                            resolve();
                        });
                    }
                } else {
                    // If the user doesn't have a cart, create a new one with the product
                    let cartObj = {
                        user: objectId(userId),
                        products: [proObj]
                    }
                    db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then(() => {
                        resolve();
                    });
                }
            } catch (error) {
                console.error('Error adding to cart:', error);
                reject(error);
            }
        });
    },
    

    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) });
                let totalPrice = 0;
    
                if (cart && cart.products.length > 0) {
                    let productIds = cart.products.map(product => product.item);
                    let products = await db.get().collection(collection.PRODUCT_COLLECTION).find({ _id: { $in: productIds } }).toArray();
    
                    let cartItems = cart.products.map(cartItem => {
                        let product = products.find(p => p._id.equals(cartItem.item));
                        totalPrice += product.price * cartItem.quantity;
                        return { ...cartItem, product: product };
                    });
    
                    resolve({ cartItems, totalPrice });
                } else {
                    resolve({ cartItems: [], totalPrice });
                }
            } catch (error) {
                console.error('Error retrieving cart items:', error);
                reject(error);
            }
        });
    },
    
      
    

    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity: (userId, data) => {
        return new Promise(async (resolve, reject) => {
            try {
                let { productId, action } = data;
                console.log('Received data:', data); // Log received data
                let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) });
    
                // Find the index of the product in the cart
                let productIndex = cart.products.findIndex(product => product.item.equals(objectId(productId)));
                console.log('Product Index:', productIndex); // Log product index
    
                // Increment or decrement the quantity of the product if found in the cart
                if (productIndex !== -1) {
                    if (action === 'increment') {
                        // Increment the quantity by 1
                        cart.products[productIndex].quantity += 1;
                    } else if (action === 'decrement') {
                        // Decrement the quantity by 1 (if needed)
                        if (cart.products[productIndex].quantity > 1) {
                            cart.products[productIndex].quantity -= 1;
                        }
                    }
                }
    
                // Update the cart in the database
                await db.get().collection(collection.CART_COLLECTION).updateOne(
                    { user: objectId(userId) },
                    { $set: { products: cart.products } }
                );
    
                // Send the updated quantity in the response
                resolve({ status: true, quantity: cart.products[productIndex].quantity });
            } catch (error) {
                reject(error);
            }
        });
    },

    removeCartItem: (userId, productId) => {
        return new Promise(async (resolve, reject) => {
            try {
                await db.get().collection(collection.CART_COLLECTION).updateOne(
                    { user: objectId(userId) },
                    { $pull: { products: { item: objectId(productId) } } }
                );
                resolve();
            } catch (error) {
                console.error('Error removing item from cart:', error);
                reject(error);
            }
        });
    },

    getTotalAmount: async (userId) => {
        try {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) });
            let total = 0;
    
            if (cart && cart.products.length > 0) {
                // Retrieve product details from the products collection
                let productIds = cart.products.map(product => product.item);
                let products = await db.get().collection(collection.PRODUCT_COLLECTION).find({ _id: { $in: productIds } }).toArray();
    
                // Calculate total price by multiplying product price with quantity
                cart.products.forEach(cartItem => {
                    let product = products.find(p => p._id.equals(cartItem.item));
                    total += product.price * cartItem.quantity;
                });
            }
    
            return total;
        } catch (error) {
            console.error('Error getting total amount:', error);
            throw error;
        }
    },
    

    placeOrder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            let status = order.paymentMethod === 'cod' ? 'placed' : 'pending';
            let orderObj = {
                deliveryDetails: {
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode
                },
                userId: objectId(order.userId),
                paymentMethod: order.paymentMethod,
                products: products,
                totalAmount: total,
                status: status,
                date: new Date(),
                tracking: 'pending' // Ensure tracking is set to 'pending' initially
            };
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(order.userId) }); // Clear cart after placing order
                resolve(response.insertedId);
            }).catch((error) => {
                console.error('Error placing order:', error);
                reject(error);
            });
        });
    },
    
    

    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) });
                resolve(cart.products); // Corrected: Resolve cart.products instead of cart.product
            } catch (error) {
                console.error('Error retrieving cart products:', error);
                reject(error);
            }
        });
    },

    getOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: objectId(userId) }).toArray();
                resolve(orders);
            } catch (error) {
                console.error('Error retrieving orders:', error);
                reject(error);
            }
        });
    },
    
    
    

getOrderDetails: async (orderId) => {
    try {
      let order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(orderId) });
      let products = await Promise.all(order.products.map(async (product) => {
        let productDetails = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: product.item });
        return {
          ...product,
          productDetails: productDetails
        };
      }));
      order.products = products;
      return order;
    } catch (error) {
      console.error('Error retrieving order details:', error);
      throw error;
    }
  },
  
  generateRazorpay:(orderId,total)=>{
    console.log(orderId);
    return new Promise((resolve,reject)=>{
       var options={
        amount:total*100,
        currency:'INR',
        receipt:""+orderId
       };
       instance.orders.create(options,function(err,order){
        if(err){
            console.log(err);
        }else{
        console.log("New Order",order);
        resolve(order)
        }
       })
    })
  },
  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
        const crypto = require('crypto');
        let hmac = crypto.createHmac('sha256', '0bQoIL1Iw9gsgBzQie5uWtHL');
        hmac.update(details.payment.razorpay_order_id + '|' + details.payment.razorpay_payment_id);
        hmac = hmac.digest('hex');
        if (hmac === details.payment.razorpay_signature) {
            resolve();
        } else {
            reject(new Error('Invalid signature'));
        }
    });
},

changePaymentStatus: (orderId) => {
    return new Promise((resolve, reject) => {
        db.get().collection(collection.ORDER_COLLECTION).updateOne(
            { _id: objectId(orderId) },
            {
                $set: {
                    status: 'placed'
                }
            }
        ).then(() => {
            resolve();
        }).catch((err) => {
            reject(err);
        });
    });
},

updateLastLogout: async (userId) => {
    try {
        await db.get().collection(collection.USER_COLLECTION).updateOne(
            { _id: objectId(userId) },
            { $set: { lastLogout: new Date() } }
        );
        console.log('Last logout time updated successfully');
    } catch (error) {
        console.error('Error updating last logout time:', error);
        throw error;
    }
},


    
};

