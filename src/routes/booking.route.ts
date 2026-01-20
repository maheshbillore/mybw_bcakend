import express, { RequestHandler } from "express";
import { authMiddleware, authorize } from "../middlewares/auth.middleware.js";
import { BookingController } from "../controllers/booking.controller.js";

const router = express.Router();

router.get(
    "/",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    BookingController.getAllBookings
);

router.post(
    "/getbooking",
    authMiddleware as RequestHandler,
    authorize("admin", "customer", "partner") as RequestHandler,
    BookingController.bookingBetweenCustomerAndPartner as RequestHandler
);

router.post(
    "/createBookingByCustomer",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    BookingController.createBookingByCustomer as RequestHandler
);

router.get(
    "/open",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    BookingController.listOpenBookings as RequestHandler
);

router.patch(
    "/:id/accept",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    BookingController.partnerAccept as RequestHandler
);

router.get(
    "/allbooking/customer/:id",
    authMiddleware as RequestHandler,
    authorize("admin", "customer") as RequestHandler,
    BookingController.getAllBookingsByCustomer as RequestHandler
);

router.post(
    "/createbooking",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    BookingController.bookingByAdmin as RequestHandler
);

router.put(
    "/assign",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    BookingController.assignBookingByAdmin as RequestHandler
);

router.put(
    "/reschedule",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    BookingController.rescheduleBooking as RequestHandler
);

router.get(
    "/:id",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    BookingController.getABooking as RequestHandler
);

export default router;
