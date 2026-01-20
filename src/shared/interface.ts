import { Types } from "mongoose";

export interface IBookingData {
    customer: string;
    partner?: string;
    service: string;
    timeSlot: Date;
    location: string;
    totalAmount: number;
    status?: "pending" | "ongoing" | "completed" | "cancelled";
    paymentStatus?: "pending" | "paid" | "failed" | "refunded";
    address: string;
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    country: string;
    pincode: number;
}

export interface IServiceData {
    name?: any;
    category: string;
    slug?: string;
    metaTitle?: string;
    metaDescripton?: string;
    metaKeyword?: string;
    customServiceName: string;
    subCategory: string;
    categorytype: string;
    categoryType: string;
    isCustomSubCategories: boolean;
    description?: string;
    isCertificate?: boolean;
    pricingTiers: {
        name: string;
        price: number;
    }[];
    surgePricing?: {
        enabled: boolean;
        surgeMultiplier: number;
        surgeHours: {
            start: string;
            end: string;
        }[];
    };
    partnerCommissionRate: number;
}

export interface ICategoryData {
    name: string;
    description: string;
    image: string;
    slug: string;
    createdBy: Types.ObjectId;
    updatedBy: Types.ObjectId;
    status?: "active" | "inactive";
}

export interface IComplaint {
    customerId: string;
    bookingId: string;
    complainText: string;
}

export interface IComplaintUpdate {
    status?: string;
    refundApproved?: boolean;
}

export interface ISubCategoryData {
    name: string;
    description: string;
    image: string;
    category: string;
    createdBy: Types.ObjectId;
    updatedBy: Types.ObjectId;
    status?: "active" | "inactive";
}

export interface IPartnerUpdate {
    name?: string;
    password?: string;
    email?: string;
    phone?: string;
    referralCode?: string;
    address?: string;
    dob: Date;
    latitude?: number;
    longitude?: number;
    pinCode: number;
    city?: string;
    state?: string;
    country?: string;
    pincode?: number;
    aadharFront?: string;
    aadharBack?: string;
    panFront?: string;
    panBack?: string;
    experienceCertificates?: string[];
    profile?: string;
    category?: string[];
    subCategory?: string[];
    categoryType?: string | string[];
    skills: string[];
}

export interface ISubscriptionPlanData {
    name: string;
    features: string[];
    price: number;
    duration: number;
    mrp: number;
    flat_discount: number;
    percentage_discount: number;
    pricingTiers: string;
    target: string;
    status: "active" | "inactive";
}

export interface IAddCategoryType {
    name: string;
    category: string;
    slug: string;
    status: "active" | "inactive";
}

export interface IReferralCode {
    subscriptionPlans: Types.ObjectId;
    referralFromPoint: number;
    referraltoPoint: number;
    status: string;
    pointToRupee: number;
}

export interface IncomingRoleData {
    id: string;
    name: string;
}

export interface IncomingPermissionData {
    id: string;
    name: string;
    permissionId: string;
    url: string;
    icon: string;
    order: number;
}

export interface IncomingRolePermission {
    id: string;
    permissionId: string[];
    roleId: string;
}

export interface IncomingBidChargeData {
    id: string;
    bid_count: number;
    bid_type: string;
    bid_charge: string;
    status: boolean;
}

export interface IncomingUserData {
    id: string;
    name: string;
    email: string;
    password: string;
    phone: string
    dob: string;
    picture: string;
    roleId: string;
    role: string;
    isActive: boolean;
}