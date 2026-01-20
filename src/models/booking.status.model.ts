import mongoose from "mongoose";
import { Types } from "mongoose";


interface ILocation {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
}

export interface IBookingStatus {
    bookingId: Types.ObjectId
    jobId: Types.ObjectId
    latitude: number;
    longitude: number;
    location: ILocation
    status: string
}



const BookingStatusSchema = new mongoose.Schema<IBookingStatus>({
    bookingId: mongoose.Schema.Types.ObjectId,
    jobId: mongoose.Schema.Types.ObjectId,
    status: String,
    latitude: {
        type: Number, 
        default:null
    },
    longitude: {
        type: Number,
        default:null
    },
    location: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
}, {
    timestamps: true,
});

const BookingStatus = mongoose.model<IBookingStatus>("BookingStatus", BookingStatusSchema)
export default BookingStatus;