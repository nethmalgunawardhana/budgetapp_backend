const express = require('express');
const {
  getServicePosts,
  getServicePost,
  createServicePost,
  updateServicePost,
  deleteServicePost,
  toggleServiceStatus,
} = require('../controllers/servicePost.controller');
const { authenticateUser } = require('../middleware/auth.middleware');
const router = express.Router();

router.use(authenticateUser);
router.route('/').post(createServicePost);
router.route('/provider').get(getServicePosts);
router
  .route('/:id')
  .get(getServicePost)
  .put(updateServicePost)
  .delete(deleteServicePost);
router.route('/:id/status').patch(toggleServiceStatus);

module.exports = router;
