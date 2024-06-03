// helpers/adminHelpers.js
var db = require('../config/connection');
var collection = require('../config/collections');
const bcrypt = require('bcrypt');

module.exports = {
  addAdmin: async (adminData) => {
    try {
      adminData.Password = await bcrypt.hash(adminData.Password, 10); // Hash the password
      const result = await db.get().collection(collection.ADMIN_COLLECTION).insertOne(adminData);
      console.log('Admin added successfully:', result.insertedId);
      return result.insertedId;
    } catch (error) {
      console.error('Error inserting admin:', error);
      throw error; // Throw the error if insertion fails
    }
  },

  doLogin: async (adminData) => {
    try {
      const admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ Email: adminData.Email });
      if (admin) {
        const status = await bcrypt.compare(adminData.Password, admin.Password);
        if (status) {
          return { status: true, admin: admin };
        } else {
          return { status: false };
        }
      } else {
        return { status: false };
      }
    } catch (error) {
      console.error('Error during admin login:', error);
      throw error;
    }
  },

  getAllUsers: () => {
    return new Promise(async (resolve, reject) => {
        try {
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray();
            resolve(users);
        } catch (error) {
            console.error('Error fetching all users:', error);
            reject(error);
        }
    });
},

  


};

// Temporary code to add admin
// (async () => {
//     const adminData = {
//         Email: 'admin@gmail.com', // Replace with the desired admin email
//         Password: 'admin' // Replace with the desired admin password
//     };

//     try {
//         await db.connect(); // Ensure the database connection is established
//         const adminId = await module.exports.addAdmin(adminData);
//         console.log('Admin inserted with ID:', adminId);
//     } catch (error) {
//         console.error('Failed to add admin:', error);
//     } finally {
//         process.exit(); // Exit the process after the script is run
//     }
// })();