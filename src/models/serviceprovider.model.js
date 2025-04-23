const { firestore } = require('../config/firebase');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Assuming Firebase Admin is already initialized in your application

const serviceProvidersCollection = firestore.collection('serviceProviders');

class ServiceProviderModel {
  // Find service provider by email
  async findByEmail(email) {
    try {
      const snapshot = await serviceProvidersCollection
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw error;
    }
  }

  // Find service provider by ID
  async findById(id) {
    try {
      const doc = await serviceProvidersCollection.doc(id).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      throw error;
    }
  }

  // Create new service provider
  async create(data) {
    try {
      const { businessName, ownerName, email, phone, password, serviceType } = data;
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create new document with generated ID
      const providerId = uuidv4();
    
      
      const providerData = {
        businessName,
        ownerName,
        email,
        phone,
        hashedPassword,
        serviceType,
        status: 'approved',
      };
      
      // Create the document
      await serviceProvidersCollection.doc(providerId).set(providerData);
      
      // Return the created provider (without hashedPassword)
      const { hashedPassword: _, ...providerWithoutPassword } = providerData;
      return { id: providerId, ...providerWithoutPassword };
    } catch (error) {
      throw error;
    }
  }

  // Update service provider profile
  async updateProfile(id, updateData) {
    try {
      const providerRef = serviceProvidersCollection.doc(id);
      
      // Convert camelCase fields to match the stored fields
      const updates = {
        updatedAt: admin.firestore.Timestamp.now()
      };
      
      // Add fields to update
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined && value !== null) {
          updates[key] = value;
        }
      }
      
      // Update the document
      await providerRef.update(updates);
      
      // Fetch and return the updated document
      const updatedDoc = await providerRef.get();
      return { id, ...updatedDoc.data() };
    } catch (error) {
      throw error;
    }
  }

  // Update service provider status
  async updateStatus(id, status) {
    try {
      const providerRef = serviceProvidersCollection.doc(id);
      
      await providerRef.update({
        status,
        updatedAt: admin.firestore.Timestamp.now()
      });
      
      const updatedDoc = await providerRef.get();
      const data = updatedDoc.data();
      
      return {
        id,
        businessName: data.businessName,
        status: data.status
      };
    } catch (error) {
      throw error;
    }
  }

  // Compare password
  async comparePassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ServiceProviderModel();