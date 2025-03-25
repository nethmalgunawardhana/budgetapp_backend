const { firestore } = require('../config/firebase');
const bcrypt = require('bcryptjs');

class UserModel {
  constructor() {
    this.collection = firestore.collection('users');
  }

  async findByEmail(email) {
    const snapshot = await this.collection.where('email', '==', email).limit(1).get();
    return snapshot.empty ? null : { 
      id: snapshot.docs[0].id, 
      ...snapshot.docs[0].data() 
    };
  }

  async create(userData) {
    // Hash password before storing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const userPayload = {
      name: userData.name,
      email: userData.email,
      hashedPassword,
      role: userData.role || 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await this.collection.add(userPayload);
    return { id: docRef.id, ...userPayload };
  }

  async comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async findById(userId) {
    const doc = await this.collection.doc(userId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }
}

module.exports = new UserModel();