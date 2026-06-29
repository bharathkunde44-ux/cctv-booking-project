const express = require("express");
const adminAuth = require("../middleware/adminAuth");
const {
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  getDashboard,
  listBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  listServices,
  getService,
  updateService,
  deleteService,
  listCustomers,
  getCustomer,
  getNotifications,
  updateNotification,
  getReports,
  testOwnerEmail,
} = require("../controllers/adminController");

const router = express.Router();

router.post("/login", login);

router.use(adminAuth);

router.post("/logout", logout);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/profile/password", changePassword);
router.get("/dashboard", getDashboard);
router.post("/test-email", testOwnerEmail);

router.get("/bookings", listBookings);
router.get("/bookings/:id", getBooking);
router.put("/bookings/:id", updateBooking);
router.delete("/bookings/:id", deleteBooking);

router.get("/services", listServices);
router.get("/services/:id", getService);
router.put("/services/:id", updateService);
router.delete("/services/:id", deleteService);

router.get("/customers", listCustomers);
router.get("/customers/:id", getCustomer);

router.get("/reports", getReports);

router.get("/notifications", getNotifications);
router.put("/notifications/:id", updateNotification);

module.exports = router;
