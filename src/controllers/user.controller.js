
const { firestore } = require('../config/firebase');


exports.getUserProfile = async (req, res) => {
    try {
      // Get user ID from JWT token
      const userId = req.user.id; 
  
      const userDoc = await firestore.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
  
      const userData = userDoc.data();
      
      // Remove sensitive information
      const { password, ...userDataWithoutPassword } = userData;
  
      res.json({
        success: true,
        data: userDataWithoutPassword
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching user profile' 
      });
    }
  };