const { firestore } = require('../config/firebase');
const asyncHandler = require('../utils/asyncHandler');  
const admin = require('firebase-admin');


// @desc    Get all service posts by the provider
// @route   GET /api/service-posts/provider
// @access  Private
exports.getServicePosts = asyncHandler(async (req, res) => {
    const snapshot = await firestore.collection('servicePosts')
      .where('provider', '==', req.serviceProvider.id)
      .get();  // Add this line
  
    const servicePosts = [];
    snapshot.forEach(doc => {
      servicePosts.push({
        id: doc.id,
        ...doc.data()
      });
    });
  
    res.status(200).json({
      success: true,
      count: servicePosts.length,
      data: servicePosts,
    });
  });
  //get all service posts
exports .getServicePosts = asyncHandler(async (req, res) => {
  const snapshot = await firestore.collection('servicePosts')
    .get();  // Add this line
 const servicePosts = [];
  snapshot.forEach(doc => {
    servicePosts.push({
      id: doc.id,
      ...doc.data()
    });
  });
  res.status(200).json({
    success: true,
    data: servicePosts,
  });
});


// @desc    Get single service post
// @route   GET /api/service-posts/:id
// @access  Private
exports.getServicePost = asyncHandler(async (req, res) => {
  const doc = await firestore.collection('servicePosts').doc(req.params.id).get();

  if (!doc.exists) {
    return res.status(404).json({
      success: false,
      error: 'Service post not found',
    });
  }

  const servicePost = {
    id: doc.id,
    ...doc.data()
  };

  // Make sure service provider is the owner
  if (servicePost.provider !== req.serviceProvider.id) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this service post',
    });
  }

  res.status(200).json({
    success: true,
    data: servicePost,
  });
});

// @desc    Create new service post
// @route   POST /api/service-posts
// @access  Private
exports.createServicePost = asyncHandler(async (req, res) => {
  const { title, description, price, category, location,contactno,username } = req.body;

  // Validate required fields
  if (!title || !description || !price || !category || !location || !contactno) {
    return res.status(400).json({
      success: false,
      error: 'Please provide all required fields',
    });
  }

  // Create service post in Firestore
  const servicePostRef = firestore.collection('servicePosts').doc();
  
  const servicePost = {
    title,
    username,
    description,
    price: Number(price),
    category,
    location,
    contactno,
    provider: req.serviceProvider.id,
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await servicePostRef.set(servicePost);

  // Get the created document with server timestamp
  const newDoc = await servicePostRef.get();
  
  res.status(201).json({
    success: true,
    data: {
      id: newDoc.id,
      ...newDoc.data()
    },
  });
});

// @desc    Update service post
// @route   PUT /api/service-posts/:id
// @access  Private
exports.updateServicePost = asyncHandler(async (req, res) => {
  // First check if post exists and belongs to provider
  const doc = await firestore.collection('servicePosts').doc(req.params.id).get();

  if (!doc.exists) {
    return res.status(404).json({
      success: false,
      error: 'Service post not found',
    });
  }

  const servicePost = doc.data();

  // Make sure service provider is the owner
  if (servicePost.provider !== req.serviceProvider.id) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to update this service post',
    });
  }

  // Create update object
  const { title, description, price, category, location } = req.body;
  const updateData = {};
  
  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (price) updateData.price = Number(price);
  if (category) updateData.category = category;
  if (location) updateData.location = location;

  
  // Always update the updatedAt field
  updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  // Update in Firestore
  await firestore.collection('servicePosts').doc(req.params.id).update(updateData);

  // Get updated document
  const updatedDoc = await firestore.collection('servicePosts').doc(req.params.id).get();
  
  res.status(200).json({
    success: true,
    data: {
      id: updatedDoc.id,
      ...updatedDoc.data()
    },
  });
});

// @desc    Delete service post
// @route   DELETE /api/service-posts/:id
// @access  Private
exports.deleteServicePost = asyncHandler(async (req, res) => {
  // First check if post exists and belongs to provider
  const doc = await firestore.collection('servicePosts').doc(req.params.id).get();

  if (!doc.exists) {
    return res.status(404).json({
      success: false,
      error: 'Service post not found',
    });
  }

  const servicePost = doc.data();

  // Make sure service provider is the owner
  if (servicePost.provider !== req.serviceProvider.id) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to delete this service post',
    });
  }

  // Delete from Firestore
  await firestore.collection('servicePosts').doc(req.params.id).delete();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Toggle service post status
// @route   PATCH /api/service-posts/:id/status
// @access  Private
exports.toggleServiceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !['active', 'inactive'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid status (active or inactive)',
    });
  }

  // First check if post exists and belongs to provider
  const doc = await firestore.collection('servicePosts').doc(req.params.id).get();

  if (!doc.exists) {
    return res.status(404).json({
      success: false,
      error: 'Service post not found',
    });
  }

  const servicePost = doc.data();

  // Make sure service provider is the owner
  if (servicePost.provider !== req.serviceProvider.id) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to update this service post',
    });
  }

  // Update status and updatedAt
  await firestore.collection('servicePosts').doc(req.params.id).update({
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Get updated document
  const updatedDoc = await firestore.collection('servicePosts').doc(req.params.id).get();
  
  res.status(200).json({
    success: true,
    data: {
      id: updatedDoc.id,
      ...updatedDoc.data()
    },
  });
});
