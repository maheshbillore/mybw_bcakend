import { Request, Response } from "express";
import { BookingService } from "../services/booking.service.js";

export class BookingController {
    static async getAllBookings(req: Request, res: Response) {
        const { currentPage = 1, pageSize = 10 } = req.query;
        const result = await BookingService.getAllBookings(
            Number(currentPage),
            Number(pageSize)
        );
        res.status(result.success ? 201 : 404).json(result);
    }

    static async createBookingByCustomer(req: Request, res: Response) {
        const customerId = req.user?.id;

        if (!customerId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized, user not found",
            });
        }

        const bookingData = {
            ...req.body,
            customer: customerId,
        };

        const result = await BookingService.createBookingByCustomer(
            bookingData
        );
        res.status(result.success ? 201 : 400).json(result);
    }

    static async listOpenBookings(req: Request, res: Response) {
        const result = await BookingService.openBookings();
        res.status(result.success ? 200 : 404).json(result);
    }

    static async partnerAccept(req: Request, res: Response) {
        const { id } = req.params;
        const partnerId = req.user?.id;

        const result = await BookingService.partnerAcceptBooking(id, partnerId);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async bookingBetweenCustomerAndPartner(req: Request, res: Response) {
        const { currentPage = 1, pageSize = 10 } = req.query;
        const { customerId, partnerId } = req.body;
        const result = await BookingService.getBookingBetweenCustomerAndPartner(
            Number(currentPage),
            Number(pageSize),
            customerId,
            partnerId
        );
        res.status(result.success ? 200 : 404).json(result);
    }

    static async updateBooking(req: Request, res: Response) {
        const { id } = req.params;
        const { paymentStatus, status } = req.body;
        const result = await BookingService.updateBooking(id, {
            paymentStatus,
            status,
        });
        res.status(result.success ? 200 : 404).json(result);
    }

    static async getAllBookingsByCustomer(req: Request, res: Response) {
        const { currentPage = 1, pageSize = 10 } = req.query;
        const userId = req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized, user not found",
            });
        }

        const result = await BookingService.getAllBookingByCustomer(
            userId,
            id,
            Number(currentPage),
            Number(pageSize)
        );
        res.status(result.success ? 200 : 404).json(result);
    }

    static async bookingByAdmin(req: Request, res: Response) {
        if (!req.body.customer) {
            return res.status(400).json({
                success: false,
                message:
                    "Customer ID is required for booking creation by admin",
            });
        }
        const result = await BookingService.createBookingByAdmin(req.body);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async assignBookingByAdmin(req: Request, res: Response) {
        const { bookingId, partnerId } = req.body;
        const result = await BookingService.assignBooking(bookingId, partnerId);
        res.status(result.success ? 200 : 404).json(result);
    }

    static async rescheduleBooking(req: Request, res: Response) {
        const { bookingId, timeSlot } = req.body;
        const result = await BookingService.rescheduleBooking({
            bookingId,
            timeSlot,
        });
        res.status(result.success ? 200 : 404).json(result);
    }

    static async getABooking(req: Request, res: Response) {
        const { id } = req.params;
        const result = await BookingService.findBookingbyId(id);
        res.status(result.success ? 200 : 404).json(result);
    }
}
