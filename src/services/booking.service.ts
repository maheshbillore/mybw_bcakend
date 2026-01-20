import Booking from "../models/booking.model.js";
import Customer from "../models/customer.model.js";
import Partner from "../models/partner.model.js";
import Service from "../models/service.model.js";
import { IBookingData } from "../shared/interface.js";
import { GenericResponse } from "../shared/type.js";
import mongoose from "mongoose";
import { io } from "../app.js";

export class BookingService {
    static async getAllBookings(
        currentPage: number,
        pageSize: number
    ): Promise<GenericResponse<any>> {
        try {
            const skip = (currentPage - 1) * pageSize;
            const [bookings, totalItems] = await Promise.all([
                await Booking.find()
                    .skip(skip)
                    .limit(pageSize)
                    .sort({ createdAt: -1 })
                    .populate([
                        {
                            path: "customer",
                            populate: {
                                path: "user",
                                select: "name email phone role isActive",
                            },
                        },
                        {
                            path: "partner",
                            populate: {
                                path: "user",
                                select: "name email phone role isActive",
                            },
                        },
                        {
                            path: "service",
                            select: "name description",
                        },
                    ]),
                Booking.countDocuments({}),
            ]);
            if (!bookings) {
                return {
                    success: false,
                    data: null,
                    message: "booking not found",
                };
            }

            const totalPages = Math.ceil(totalItems / pageSize);

            return {
                success: true,
                data: {
                    bookings,
                    pagination: {
                        currentPage,
                        pageSize,
                        totalPages,
                        totalItems,
                    },
                },
                message: "Booking data fetched successfully",
            };
        } catch (error: any) {
            console.error("Error fetching booking:", error);
            return {
                success: false,
                data: null,
                message: error?.response?.data?.message || error.message,
            };
        }
    }

    static async createBookingByCustomer(
        data: IBookingData
    ): Promise<GenericResponse<any>> {
        const session = await mongoose.startSession();
        try {
            session.startTransaction();

            const customer = await Customer.findOne({
                user: data.customer,
            }).session(session);
            if (!customer) {
                await session.abortTransaction();
                return {
                    success: false,
                    data: null,
                    message: "Customer not found",
                };
            }

            const service = await Service.findById(data.service).session(
                session
            );
            if (!service) {
                await session.abortTransaction();
                return {
                    success: false,
                    data: null,
                    message: "Service not found",
                };
            }

            if (new Date(data.timeSlot).getTime() <= Date.now()) {
                await session.abortTransaction();
                return {
                    success: false,
                    data: null,
                    message: "Time slot must be in the future",
                };
            }

            const booking = new Booking({
                customer: customer._id,
                service: data.service,
                timeSlot: data.timeSlot,
                location: data.location,
                totalAmount: data.totalAmount,
                status: "pending",
                paymentStatus: "pending",
                address: data.address,
                latitude: data.latitude,
                longitude: data.longitude,
                city: data.city,
                state: data.state,
                country: data.country,
                pincode: data.pincode,
            });

            await booking.save({ session });

            await Customer.findOneAndUpdate(
                { _id: customer._id },
                { $addToSet: { bookingHistory: booking._id } },
                { session }
            );

            await session.commitTransaction();
            session.endSession();

            const populatedBooking = await Booking.findById(booking._id)
                .populate({
                    path: "customer",
                    populate: { path: "user", select: "name email phone" },
                })
                .populate("service", "name description basePrice")
                .populate({
                    path: "partner",
                    populate: { path: "user", select: "name email phone" },
                });

            if (populatedBooking) {
                io.emit("newBookingCreated", populatedBooking);
            }
            return {
                success: true,
                data: populatedBooking,
                message: "New booking created successfully",
            };
        } catch (error: any) {
            await session.abortTransaction();
            session.endSession();
            console.error("Error creating booking:", error);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error?.message,
            };
        }
    }

    static async getBookingBetweenCustomerAndPartner(
        currentPage: number,
        pageSize: number,
        customerId: string,
        partnerId: string
    ): Promise<GenericResponse<any>> {
        try {
            const skip = (currentPage - 1) * pageSize;
            const query = {
                $or: [{ customer: customerId }, { partner: partnerId }],
            };

            const [bookings, totalItems] = await Promise.all([
                Booking.find(query)
                    .populate({ path: "customer", select: "name email phone" })
                    .populate({
                        path: "partner",
                        select: "name email phone",
                        model: "User",
                    })
                    .populate("service", "name description basePrice")
                    .skip(skip)
                    .limit(pageSize)
                    .exec(),
                Booking.countDocuments(query),
            ]);

            const totalPages = Math.ceil(totalItems / pageSize);

            return {
                success: true,
                data: {
                    bookings,
                    pagination: {
                        currentPage,
                        pageSize,
                        totalItems,
                        totalPages,
                    },
                },
                message: "Bookings fetched successfully",
            };
        } catch (error: any) {
            console.error("Error fetching booking:", error);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error?.message,
            };
        }
    }

    static async updateBooking(
        id: string,
        data: { paymentStatus?: string; status?: string }
    ): Promise<GenericResponse<any>> {
        try {
            const booking = await Booking.findOne({ _id: id });
            if (!booking) {
                return {
                    success: false,
                    data: null,
                    message: "Booking with this ID does not exists",
                };
            }

            const updatedBooking = await Booking.findByIdAndUpdate(
                id,
                { $set: data },
                { new: true }
            );

            if (!updatedBooking) {
                return {
                    success: false,
                    data: null,
                    message: "Failed to update booking",
                };
            }

            const populatedBooking = await Booking.findById(updatedBooking._id)
                .populate("customer", "name email phone")
                .populate("service", "name description basePrice");

            io.emit("bookingUpdated", populatedBooking);

            return {
                success: true,
                data: populatedBooking,
                message: "Booking updated successfully",
            };
        } catch (error: any) {
            console.error("Error while updating booking", error);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error?.message,
            };
        }
    }

    static async getAllBookingByCustomer(
        userId: string,
        id: string,
        currentPage: number,
        pageSize: number
    ): Promise<GenericResponse<any>> {
        try {
            const skip = (currentPage - 1) * pageSize;

            const customer = await Customer.findOne({ user: userId });
            if (!customer) {
                return {
                    success: false,
                    data: null,
                    message: "Customer not found with this id",
                };
            }
            const [bookings, totalItems] = await Promise.all([
                Booking.find({ customer: id })
                    .populate([
                        {
                            path: "customer",
                            select: "name email phone role isActive",
                        },
                        {
                            path: "partner",
                            select: "name, email",
                            populate: {
                                path: "user",
                                select: "name email",
                            },
                        },
                        {
                            path: "service",
                            select: "name",
                        },
                    ])
                    .skip(skip)
                    .limit(pageSize)
                    .lean(),
                Booking.countDocuments({ customer: id }),
            ]);

            const totalPages = Math.ceil(totalItems / pageSize);

            if (!bookings) {
                return {
                    success: false,
                    data: null,
                    message: "Booking not found with with this Customer ID",
                };
            }

            return {
                success: true,
                data: {
                    bookings,
                    pagination: {
                        currentPage,
                        pageSize,
                        totalItems,
                        totalPages,
                    },
                },
                message: "Booking fetched successfully",
            };
        } catch (error: any) {
            console.error(
                "Error while fetching all bookings by customer",
                error
            );
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error?.message,
            };
        }
    }

    static async openBookings(): Promise<GenericResponse<any>> {
        try {
            const bookings = await Booking.find({
                partner: null,
                status: "pending",
            })
                .populate("customer", "name email phone ")
                .populate("service", "name description");

            if (!bookings) {
                return {
                    success: false,
                    data: null,
                    message: "No open booking found",
                };
            }
            return {
                success: true,
                data: bookings,
                message: "Open booking fetched successfully",
            };
        } catch (error: any) {
            console.error("Error while fetching open booking", error.message);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error?.message,
            };
        }
    }

    static async partnerAcceptBooking(
        id: string,
        userId: string
    ): Promise<GenericResponse<any>> {
        const session = await mongoose.startSession();
        try {
            session.startTransaction();
            const partner = await Partner.findOne({ user: userId }).session(
                session
            );

            if (!partner) {
                await session.abortTransaction();
                return {
                    success: false,
                    data: null,
                    message: "Partner not found",
                };
            }

            const booking = await Booking.findOneAndUpdate(
                { _id: id, partner: null, status: "pending" },
                { partner: partner._id, status: "ongoing" },
                { new: true, session }
            );

            if (!booking) {
                await session.abortTransaction();
                return {
                    success: false,
                    message: "Already taken or not found",
                    data: null,
                };
            }

            // Update partner's bookingHistory
            await Partner.findOneAndUpdate(
                { user: userId },
                { $addToSet: { bookingHistory: booking._id } },
                { session }
            );

            // Update customer's bookingHistory
            await Customer.findOneAndUpdate(
                { _id: userId },
                { $addToSet: { bookingHistory: booking._id } },
                { session }
            );

            await session.commitTransaction();
            session.endSession();

            const populatedBooking = await Booking.findById(booking._id)
                .populate({
                    path: "customer",
                    populate: { path: "user", select: "name email phone" },
                })
                .populate({
                    path: "partner",
                    populate: { path: "user", select: "name email phone" },
                })
                .populate("service", "name description pricingTiers");

            if (populatedBooking) {
                io.emit("bookingAssigned", populatedBooking);
            }

            return {
                success: true,
                data: populatedBooking,
                message: "Booking confirmed.",
            };
        } catch (error: any) {
            await session.abortTransaction();
            session.endSession();
            console.error(
                "Error while accepting booking by partner's end",
                error.message
            );

            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error?.message,
            };
        }
    }

    static async createBookingByAdmin(
        data: IBookingData
    ): Promise<GenericResponse<any>> {
        const session = await mongoose.startSession();
        try {
            session.startTransaction();

            if (
                !data.customer ||
                !data.location ||
                !data.totalAmount ||
                !data.service ||
                !data.timeSlot ||
                data.latitude === undefined ||
                data.longitude === undefined
            ) {
                await session.abortTransaction();
                return {
                    success: false,
                    data: null,
                    message: "All fields are required...",
                };
            }

            const customer = await Customer.findOne({
                _id: data.customer,
            }).session(session);

            if (!customer) {
                await session.abortTransaction();
                return {
                    success: false,
                    data: null,
                    message: "Customer not found...",
                };
            }
            const service = await Service.findById(data.service);
            if (!service) {
                await session.abortTransaction();
                return {
                    success: false,
                    data: null,
                    message: "Service not found...",
                };
            }

            const booking = new Booking({
                customer: customer._id,
                location: data.location,
                totalAmount: data.totalAmount,
                service: data.service,
                status: "pending",
                timeSlot: data.timeSlot,
                latitude: data.latitude,
                longitude: data.longitude,
            });

            await booking.save({ session });
            await Customer.findOneAndUpdate(
                { _id: data.customer },
                { $addToSet: { bookingHistory: booking._id } },
                { session }
            );

            await session.commitTransaction();
            session.endSession();

            return {
                success: true,
                data: booking,
                message: "Booking created successfully",
            };
        } catch (error: any) {
            await session.abortTransaction();
            session.endSession();
            console.error("error during booking creation", error);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error?.message,
            };
        }
    }

    static async assignBooking(
        bookingId: string,
        partnerId: string
    ): Promise<GenericResponse<any>> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const booking = await Booking.findOne({ _id: bookingId }).session(
                session
            );

            if (!booking) {
                session.abortTransaction();
                return {
                    success: false,
                    data: null,
                    message: "Booking not found...",
                };
            }

            const partner = await Partner.findOne({ _id: partnerId }).session(
                session
            );

            if (!partner) {
                session.abortTransaction();
                return {
                    success: false,
                    data: null,
                    message: "Partner not found...",
                };
            }

            const updateBooking = await Booking.findOneAndUpdate(
                { _id: booking._id },
                { partner: partner._id },
                { new: true, session }
            );

            await Partner.findOneAndUpdate(
                { _id: partnerId },
                { $addToSet: { bookingHistory: booking._id } },
                { session }
            );

            session.commitTransaction();

            const populatedBooking = await Booking.findById(booking._id)
                .populate({
                    path: "customer",
                    populate: { path: "user", select: "name email phone" },
                })
                .populate({
                    path: "partner",
                    populate: { path: "user", select: "name email phone" },
                })
                .populate("service", "name description pricingTiers");

            if (populatedBooking) {
                io.emit("bookingAssignedByAdmin", populatedBooking);
            }

            return {
                success: true,
                data: updateBooking,
                message: "Booking modified successfully...",
            };
        } catch (error: any) {
            console.error("error during assign booking", error);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error?.message,
            };
        } finally {
            session.endSession();
        }
    }

    static async rescheduleBooking(data: {
        bookingId: string;
        timeSlot: Date;
    }): Promise<GenericResponse<any>> {
        const session = await mongoose.startSession();
        try {
            await session.startTransaction();

            const booking = await Booking.findOne({
                _id: data.bookingId,
            }).session(session);

            if (!booking) {
                await session.abortTransaction();
                return {
                    success: false,
                    data: null,
                    message: "Booking not found...",
                };
            }

            if (new Date(data.timeSlot).getTime() <= Date.now()) {
                await session.abortTransaction();
                return {
                    success: false,
                    data: null,
                    message: "Date and time must be in future",
                };
            }

            const updatedBooking = await Booking.findOneAndUpdate(
                { _id: data.bookingId },
                { $set: { timeSlot: data.timeSlot } },
                { new: true, session }
            );

            if (!updatedBooking) {
                await session.abortTransaction();
                return {
                    success: false,
                    data: null,
                    message: "Failed to update booking",
                };
            }

            await session.commitTransaction();
            return {
                success: true,
                data: updatedBooking,
                message: "Booking has been modified...",
            };
        } catch (error: any) {
            await session.abortTransaction();
            console.error("error during assign booking", error);
            return {
                success: false,
                data: null,
                message: error.response?.data?.message || error?.message,
            };
        } finally {
            await session.endSession();
        }
    }

    static async findBookingbyId(id: string): Promise<GenericResponse<any>> {
        try {
            const response = await Booking.findOne({ _id: id }).populate([
                {
                    path: "customer",
                },
                {
                    path: "service",
                },
                {
                    path: "partner",
                },
            ]);

            if (!response) {
                return {
                    success: false,
                    data: null,
                    message: "Booking not found...",
                };
            }
            return {
                success: true,
                data: response,
                message: "Booking fetched...",
            };
        } catch (error: any) {
            console.error("error during fetching a booking", error);
            return {
                success: false,
                data: null,
                message: error?.response?.data?.message || error?.message,
            };
        }
    }
}
