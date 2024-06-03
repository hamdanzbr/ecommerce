// productHelpers.js
var db = require('../config/connection');
var collection = require('../config/collections');
const { resolve, reject } = require('promise');
const { response } = require('express');
var objectId = require('mongodb').ObjectId;

module.exports = {
    addProduct: (product, callback) => {
        db.get().collection('products').insertOne(product, (err, result) => {
            if (err) {
                console.error('Error adding product:', err);
                callback(false); // Pass false to callback to indicate failure
            } else {
                // Log the inserted product ID
                console.log('Product added successfully:', result.insertedId);
                callback(result.insertedId); // Pass true to callback to indicate success
            }
        });
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray();
            resolve(products);
        });
    },
    deleteProduct: (proId) => {
        return db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: objectId(proId) });
    },
    getProductDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) }).then((product) => {
                resolve(product);
            });
        });
    },
    updateProduct: (proId, proDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(proId) }, {
                $set: {
                    productName: proDetails.productName,
                    category: proDetails.category,
                    price: proDetails.price,
                    description: proDetails.description
                }
            }).then((response) => {
                resolve(response);
            }).catch((err) => {
                reject(err);
            });
        });
    },

    getAllOrders: async () => {
        try {
            let orders = await db.get().collection(collection.ORDER_COLLECTION)
                .find()
                .sort({ tracking: 1, date: -1 }) // Sort by tracking in ascending order and date in descending order
                .toArray();
            return orders;
        } catch (error) {
            console.error('Error retrieving all orders:', error);
            throw error;
        }
    },
    
        
    

    updateOrderStatus: (orderId, status) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION)
              .updateOne({ _id: objectId(orderId) }, { $set: { status: status } })
              .then(response => resolve(response))
              .catch(error => reject(error));
        });
    },
    

    updateOrderTracking: (orderId) => {
        console.log('Updating order tracking for order ID:', orderId);
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({ _id: objectId(orderId) }, { $set: { tracking: 'shipped' } })
                .then(response => {
                    console.log('Order tracking updated successfully:', response);
                    resolve(response);
                })
                .catch(error => {
                    console.error('Error updating order tracking:', error);
                    reject(error);
                });
        });
    },
    
    
    
};
