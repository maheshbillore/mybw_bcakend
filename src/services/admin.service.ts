import Complaint from "../models/complaint.model.js";
import User from "../models/user.model.js";
import Roles from "../models/roles.model.js";
import {
  IComplaint,
  IComplaintUpdate,
  IPartnerUpdate,
} from "../shared/interface.js";
import { GenericResponse, GenericResponseCode } from "../shared/type.js";
import Booking from "../models/booking.model.js";
import Partner from "../models/partner.model.js";
import Customer from "../models/customer.model.js";
import mongoose from "mongoose";
import Category from "../models/category.model.js";
import SubCategory from "../models/sub.category.model.js";
import {
  checkIsValidPhoneNumber,
  createResponse,
  createResponseStatus,
  getProfile,
  isValidAadhaar,
  isValidPan,
  removeCountryCode,
  removeOldFile,
  updateProfileCompletion,
} from "../utils/helper.js";
import Transaction from "../models/transaction.model.js";
import Banner from "../models/banner.model.js";

import fs from "fs";
import path from "path";
import Setting from "../models/setting.model.js";
import Categorytype from "../models/categorytype.model.js";
import Service from "../models/service.model.js";
import subscriptionPlansModel from "../models/subscriptionPlans.model.js";
import CouponCode from "../models/coupon.code.model.js";
import logger from "../utils/logger.js";
import { allStatusArray, dashboardallJob, dashboardallJobSearch, getJobsGroupedBySubscriptionPlan, getMasterPagination, searchTransactionList } from "../utils/comman.js";
import { result } from "lodash";

export class AdminService {
  static async getAllUsers(): Promise<GenericResponse<any>> {
    try {
      const users = await User.find({
        role: { $in: ["customer", "partner"] },
      })
        .select("-password")
        .exec();

      return {
        success: true,
        data: users,
        message: "All users fetched successfully",
      };
    } catch (error: any) {
      console.error("Error fetching all users:", error);
      return {
        success: false,
        data: null,
        message: error.message,
      };
    }
  }

  static async updateUserInfo(
    id: string,
    userFields: any = {},
    extraData: any = {}
  ): Promise<GenericResponse<any>> {
    try {
      userFields = userFields || {};
      extraData = extraData || {};

      let updatedUser = null;
      if (Object.keys(userFields).length > 0) {
        const roleDoc = await Roles.findById(userFields.roleId).select("name");
        userFields.role = roleDoc?.name;

        updatedUser = await User.findByIdAndUpdate(
          id,
          { $set: userFields },
          { new: true, select: "-password" }
        );
      } else {
        updatedUser = await User.findById(id).select("-password");
      }

      if (!updatedUser) {
        return {
          success: false,
          data: null,
          message: "User not found",
        };
      }

      // Use the role from the updated user
      if (
        updatedUser.role === "customer" &&
        Object.keys(extraData).length > 0
      ) {
        await Customer.findOneAndUpdate(
          { user: id },
          { $set: extraData },
          { new: true }
        );
      }
      if (updatedUser.role === "partner" && Object.keys(extraData).length > 0) {
        await Partner.findOneAndUpdate(
          { user: id },
          { $set: extraData },
          { new: true }
        );
      }

      return {
        success: true,
        data: updatedUser,
        message: "User information updated successfully",
      };
    } catch (error: any) {
      console.error("Error updating user:", error);
      return {
        success: false,
        data: null,
        message: error?.response?.data?.message || error?.message,
      };
    }
  }

  static async deactiveUser(id: string): Promise<GenericResponse<any>> {
    try {
      const user = await User.findById(id);
      if (!user) {
        return {
          success: false,
          data: null,
          message: "User not found",
        };
      }

      user.isActive = false;
      await user.save();

      return {
        success: true,
        data: user,
        message: "User deactivated successfully",
      };
    } catch (error: any) {
      console.error("Error deactivating user:", error);
      return {
        success: false,
        data: null,
        message: error.message,
      };
    }
  }

  static async createComplaint(
    data: IComplaint
  ): Promise<GenericResponse<any>> {
    try {
      const findCustomer = await User.findOne({
        _id: data.customerId,
      });

      const findBooking = await Booking.findOne({
        _id: data.bookingId,
      });

      if (!findCustomer) {
        return {
          success: false,
          data: null,
          message: "Customer not found",
        };
      }

      if (!findBooking) {
        return {
          success: false,
          data: null,
          message: "Booking not found",
        };
      }

      const complaintData = {
        customer: findCustomer._id,
        booking: findBooking._id,
        complainText: data.complainText,
      };

      const response = await Complaint.create(complaintData);
      return {
        success: true,
        data: response,
        message: "Complaint created successfully",
      };
    } catch (error: any) {
      console.error("Error creating complaint:", error);
      return {
        success: false,
        data: null,
        message: error.message,
      };
    }
  }

  static async updateComplaint(
    id: string,
    data: IComplaintUpdate
  ): Promise<GenericResponse<any>> {
    try {
      const updateData: any = {};
      if (data.status) {
        updateData.status = data.status;
        if (data.status === "resolved") {
          updateData.resolvedAt = new Date();
        }
      }
      if (data.refundApproved !== undefined) {
        updateData.refundApproved = data.refundApproved;
      }

      const response = await Complaint.findByIdAndUpdate(id, updateData, {
        new: true,
      });
      return {
        success: true,
        data: response,
        message: "Complaint updated successfully",
      };
    } catch (error: any) {
      console.error("Error while updating Complaint", error.message);
      return {
        success: false,
        data: null,
        message: error.message,
      };
    }
  }

  static async updatePartner(
    id: string,
    data: IPartnerUpdate,
    files: { [fieldname: string]: Express.Multer.File[] }
  ): Promise<GenericResponse<any>> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // Validate partner exists
      const partner = await Partner.findById(id).session(session);
      if (!partner) {
        await session.abortTransaction();
        session.endSession();
        return {
          success: false,
          data: null,
          message: "Partner not found",
        };
      }

      // Validate user exists
      const user = await User.findById(partner.user).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return {
          success: false,
          data: null,
          message: "Associated user not found",
        };
      }

      // Validate required fields
      if (!data.name || !data.email || !data.phone) {
        await session.abortTransaction();
        session.endSession();
        return {
          success: false,
          data: null,
          message: "Name, email, and phone are required",
        };
      }

      // Validate date of birth if provided
      if (data.dob) {
        const dobDate = new Date(data.dob);
        if (dobDate.getTime() > Date.now()) {
          await session.abortTransaction();
          session.endSession();
          return {
            success: false,
            data: null,
            message: "Date of birth cannot be in the future",
          };
        }
        if (dobDate.getTime() < new Date("1960-01-01").getTime()) {
          await session.abortTransaction();
          session.endSession();
          return {
            success: false,
            data: null,
            message: "Date of birth cannot be before 1960",
          };
        }
        const age = new Date().getFullYear() - dobDate.getFullYear();
        if (age < 18) {
          await session.abortTransaction();
          session.endSession();
          return {
            success: false,
            data: null,
            message: "User must be at least 18 years old",
          };
        }
      }

      // Process and validate categories
      const categoryArray = Array.isArray(data.category)
        ? data.category
        : data.category
          ? [data.category]
          : [];
      if (categoryArray.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return {
          success: false,
          data: null,
          message: "At least one category is required",
        };
      }

      // Convert category strings to ObjectId
      const categoryObjectIds = categoryArray.map(
        (catId) => new mongoose.Types.ObjectId(catId)
      );
      for (const catId of categoryObjectIds) {
        if (!mongoose.Types.ObjectId.isValid(catId)) {
          await session.abortTransaction();
          session.endSession();
          return {
            success: false,
            data: null,
            message: `Invalid category ID: ${catId}`,
          };
        }
        const categoryExists = await Category.findById(catId).session(session);
        if (!categoryExists) {
          await session.abortTransaction();
          session.endSession();
          return {
            success: false,
            data: null,
            message: `Category not found: ${catId}`,
          };
        }
      }

      // Process and validate subcategories
      const subCategoryArray = Array.isArray(data.subCategory)
        ? data.subCategory
        : data.subCategory
          ? [data.subCategory]
          : [];
      if (subCategoryArray.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return {
          success: false,
          data: null,
          message: "At least one subcategory is required",
        };
      }

      // Convert subcategory strings to ObjectId
      const subCategoryObjectIds = subCategoryArray.map(
        (subCatId) => new mongoose.Types.ObjectId(subCatId)
      );
      const subCategoryDocs = await SubCategory.find({
        _id: { $in: subCategoryObjectIds },
      }).session(session);
      if (subCategoryDocs.length !== subCategoryObjectIds.length) {
        await session.abortTransaction();
        session.endSession();
        return {
          success: false,
          data: null,
          message: "One or more subcategories not found",
        };
      }

      // Process and validate category types
      const categoryTypeArray = Array.isArray(data.categoryType)
        ? data.categoryType
        : data.categoryType
          ? [data.categoryType]
          : [];
      if (categoryTypeArray.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return {
          success: false,
          data: null,
          message: "At least one category type is required",
        };
      }

      // Process and validate skills
      const skillsArray = Array.isArray(data.skills)
        ? data.skills
        : data.skills
          ? [data.skills]
          : [];
      if (skillsArray.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return {
          success: false,
          data: null,
          message: "At least one skill (subcategory name) is required",
        };
      }

      const validSubCategoryNames = (subCategoryDocs || []).map(
        (doc) => doc.name
      );
      for (const skill of skillsArray) {
        if (!validSubCategoryNames.includes(skill)) {
          await session.abortTransaction();
          session.endSession();
          return {
            success: false,
            data: null,
            message: `Invalid skill (subcategory name): ${skill}`,
          };
        }
      }

      // Process file uploads
      const updatedFiles: any = {};
      if (files.aadharFront?.[0]) {
        updatedFiles.aadharFront = files.aadharFront[0].filename;
      }
      if (files.aadharBack?.[0]) {
        updatedFiles.aadharBack = files.aadharBack[0].filename;
      }
      if (files.panFront?.[0]) {
        updatedFiles.panFront = files.panFront[0].filename;
      }
      if (files.panBack?.[0]) {
        updatedFiles.panBack = files.panBack[0].filename;
      }
      if (
        files.experienceCertificates &&
        files.experienceCertificates.length > 0
      ) {
        updatedFiles.experienceCertificates = files.experienceCertificates.map(
          (file) => file.filename
        );
      }

      // Update user document
      user.name = data.name;
      user.email = data.email;
      user.phone = data.phone;
      if (data.password && data.password.trim().length > 0) {
        user.password = data.password;
      }
      if (files.picture?.[0]) {
        user.picture = files.picture[0].filename;
      }
      await user.save({ session });

      // Update partner document
      partner.profile = files.picture?.[0]?.filename ?? partner.profile;
      partner.category = categoryObjectIds;

      partner.skills = skillsArray.map(
        (skill) => new mongoose.Types.ObjectId(skill)
      ) as any;
      partner.address = data.address ?? partner.address;
      partner.latitude = data.latitude
        ? Number(data.latitude)
        : partner.latitude;
      partner.longitude = data.longitude
        ? Number(data.longitude)
        : partner.longitude;
      partner.city = data.city ?? partner.city;
      partner.state = data.state ?? partner.state;
      partner.country = data.country ?? partner.country;
      partner.pincode = data.pinCode ? Number(data.pinCode) : partner.pincode;
      partner.aadharFront = updatedFiles.aadharFront ?? partner.aadharFront;
      partner.aadharBack = updatedFiles.aadharBack ?? partner.aadharBack;
      partner.panFront = updatedFiles.panFront ?? partner.panFront;
      partner.panBack = updatedFiles.panBack ?? partner.panBack;
      partner.experienceCertificates =
        updatedFiles.experienceCertificates ?? partner.experienceCertificates;

      await partner.save({ session });

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: "partner",
            picture: user.picture,
          },
          partner,
        },
        message: "Partner updated successfully",
      };
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error updating partner:", {
        message: error.message,
        stack: error.stack,
        data,
        files: Object.keys(files || {}),
      });
      return {
        success: false,
        data: null,
        message: error.message || "Failed to update partner",
      };
    }
  }

  static async getTransactionList(payload: any, adminId: any): Promise<GenericResponseCode<any>> {
    try {

      let { startDate, endDate } = payload;
      const fromDate = new Date(startDate || "2025-01-15");
      const toDate = new Date(endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      const query: any = { createdAt: { $gte: fromDate, $lte: toDate }, adminId: { $ne: null } };

      const result = await Transaction.aggregate([
        // 1️⃣ Sort first so latest records come on top
        {
          $sort: { createdAt: -1 } // or { _id: -1 }
        },

        { $match: query },

        // 2️⃣ Select only required fields
        {
          $project: {
            _id: 1,
            paymentMethod: 1,
            transactionId: 1,
            paymentStatus: 1,
            paymentBy: 1,
            paymentFor: 1,
            invoiceNo: 1,
            merchantOrderId: 1,
            particular: 1,
            amount: 1,
            paymentGateway: 1,
            transactionType: 1,
            transactionDate: 1,
            createdAt: 1,
            updatedAt: 1,
          }
        },

        // 2️⃣ Group by paymentStatus
        {
          $group: {
            _id: "$paymentStatus",
            totalRecords: { $sum: 1 },
            transactions: {
              $push: "$$ROOT"
            }
          }
        },

        // 3️⃣ Slice top 10 records for each status
        {
          $project: {
            _id: 0,
            paymentStatus: "$_id",
            totalRecords: 1,
            transactions: { $slice: ["$transactions", 10] }
          }
        }
      ]);
      return createResponseStatus(200, { result }, "transaction fatch successfully");
    } catch (error: any) {
      return createResponseStatus(
        500,
        null,
        error.message || "Error when fetching transaction list"
      );
    }
  }

  static async banner(
    payload: any,
    file: any
  ): Promise<GenericResponseCode<any>> {
    try {
      if (!payload?.title && !payload?.description && !file?.banner?.[0]) {
        return createResponseStatus(
          200,
          null,
          "Please provide at least one — title, description, or banner is required."
        );
      }

      const { title, description, bannerType } = payload;

      const checkBanner = await Banner.findOne({ title, bannerType });
      if (checkBanner && (checkBanner?.title != null))
        return createResponseStatus(
          409,
          null,
          "Banner title already exists. Please upload a different one"
        );

      const insertData = {
        title,
        description,
        status: "active",
        bannerType,
        banner: file?.banner[0] ? file?.banner[0]?.filename : null,
      };

      const response = await Banner.create(insertData);
      return createResponseStatus(
        200,
        { result: response },
        "Banner upload successfully done"
      );
    } catch (error: any) {
      return createResponseStatus(
        500,
        null,
        error.message || "Error when upload banner"
      );
    }
  }

  static async updateBanner(
    payload: any,
    file: any,
    bannerId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      const checkBanner = await Banner.findById({ _id: bannerId });
      if (!checkBanner)
        return createResponseStatus(200, null, "Banner Id is not found");
      const bannerImg = file.banner[0]
        ? file.banner[0]?.filename
        : checkBanner?.banner;

      if (file.banner[0] && checkBanner.banner) {
        const oldPath = path.join("uploads/banner", checkBanner.banner);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const result = await Banner.findByIdAndUpdate(
        new mongoose.Types.ObjectId(bannerId),
        {
          title: payload?.title,
          description: payload?.description,
          bannerType: payload?.bannerType,
          banner: bannerImg,
        },
        { new: true }
      );
      return createResponseStatus(
        200,
        { result },
        "banner update successfully done"
      );
    } catch (error: any) {
      return createResponseStatus(
        500,
        null,
        error.message || "Error when updating bannner"
      );
    }
  }

  static async updateBannerStatus(
    bannerId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      const checkBanner = await Banner.findOne({ _id: bannerId }).select(
        "status"
      );
      if (!checkBanner)
        return createResponseStatus(400, null, "banner id not found");

      const response = await Banner.findByIdAndUpdate(
        bannerId,
        { status: checkBanner?.status == "active" ? "deactive" : "active" },
        { new: true }
      );

      return createResponseStatus(
        200,
        { banner: response },
        "banner status update successfully done"
      );
    } catch (error: any) {
      return createResponseStatus(
        500,
        null,
        error.message || "Error when banner status change"
      );
    }
  }

  static async addReferralCode(data: any): Promise<GenericResponseCode<any>> {
    try {
      const { referrerPoints, refereePoints, target, pointToRupee } = data;
      const referralObj = {
        referrerPoints,
        target,
        refereePoints,
        pointToRupee,
        type: "referral"
      };
      // Update if exists, otherwise insert new (upsert)
      const result = await Setting.findOneAndUpdate(
        { type: "referral", target }, // Find by condition
        { $set: referralObj }, // Update fields
        { new: true, upsert: true } // Create if not exists
      );

      return createResponseStatus(
        200,
        { result },
        "Referral details added or updated successfully"
      );
    } catch (error: any) {
      return createResponseStatus(
        500,
        null,
        error.message || "Error when adding or updating referral details"
      );
    }
  }

  static async logs(type: any): Promise<GenericResponseCode<any>> {
    try {
      let fileName = `${type}.log`; // default log file
      if (["app", "error"].includes(type)) {
        fileName = `${type}.log`;
      }
      const logPath = path.join(process.cwd(), "logs", fileName);
      return createResponseStatus(200, { fileName, logPath }, "");
    } catch (error: any) {
      return createResponseStatus(
        500,
        null,
        error.message || "Error when fetching logs file"
      );
    }
  }

  static async dashboardMaster(
    payload: any,
    userId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      let { startDate, endDate } = payload;
      const fromDate = new Date(startDate || "2025-01-15");
      const toDate = new Date(endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      const matchStage = { createdAt: { $gte: fromDate, $lte: toDate } };
      const result = await Category.aggregate([
        { $match: matchStage },
        { $count: "count" },
        { $addFields: { collection: "Category" } },
        {
          $unionWith: {
            coll: "categorytypes",
            pipeline: [
              { $match: matchStage },
              { $count: "count" },
              { $addFields: { collection: "Categorytype" } },
            ],
          },
        },
        {
          $unionWith: {
            coll: "services",
            pipeline: [
              { $match: matchStage },
              { $count: "count" },
              { $addFields: { collection: "Service" } },
            ],
          },
        },
        {
          $unionWith: {
            coll: "partners",
            pipeline: [
              { $match: matchStage },
              { $count: "count" },
              { $addFields: { collection: "Partner" } },
            ],
          },
        },
        {
          $unionWith: {
            coll: "customers",
            pipeline: [
              { $match: matchStage },
              { $count: "count" },
              { $addFields: { collection: "Customer" } },
            ],
          },
        },
        {
          $unionWith: {
            coll: "subscriptionplans",
            pipeline: [
              { $match: { ...matchStage, target: "partner" } },
              { $count: "count" },
              { $addFields: { collection: "partnerSubscriptionplans" } },
            ],
          },
        },
        {
          $unionWith: {
            coll: "subscriptionplans",
            pipeline: [
              { $match: { ...matchStage, target: "customer" } },
              { $count: "count" },
              { $addFields: { collection: "customerSubscriptionplans" } },
            ],
          },
        },
        {
          $unionWith: {
            coll: "couponcodes",
            pipeline: [
              { $match: { ...matchStage, target: "partner" } },
              { $count: "count" },
              { $addFields: { collection: "partnerCouponCode" } },
            ],
          },
        },
        {
          $unionWith: {
            coll: "couponcodes",
            pipeline: [
              { $match: { ...matchStage, target: "customer" } },
              { $count: "count" },
              { $addFields: { collection: "customerCouponCode" } },
            ],
          },
        },
      ]);

      const expectedCollections = [
        "Category",
        "Categorytype",
        "Service",
        "Partner",
        "partnerSubscriptionplans",
        "customerSubscriptionplans",
        "partnerCouponCode",
        "customerCouponCode",
        "Customer"
      ];

      const formatted = expectedCollections.map(name => {
        const found = result.find(r => r.collection === name);
        return {
          name,
          count: found ? found.count : 0
        };
      });

      return createResponseStatus(
        200,
        { allCounts: formatted },
        "Dashboard Master count successfully"
      );
    } catch (error: any) {
      logger.error(`${error.message} Error when fetching master count`);
      return createResponseStatus(
        500,
        null,
        error.message || "Error when fetching master count"
      );
    }
  }

  static async dashboardPartner(
    payload: any,
    user: any
  ): Promise<GenericResponseCode<any>> {
    try {
      let { startDate, endDate } = payload;
      const fromDate = new Date(startDate || "2025-01-15");
      const toDate = new Date(endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      const query = { createdAt: { $gte: fromDate, $lte: toDate } };

      const partnerStatusCounts = await Partner.aggregate([
        { $match: query },

        // ---- POPULATE USER ----
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" }, // single user
        // ---- GROUP ----
        { $sort: { _id: -1 } },
        {
          $group: {
            _id: {
              kycStatus: "$kycStatus",
              waitingForApproval: "$waitingForApproval",
            },
            count: { $sum: 1 },

            records: {
              $push: {
                _id: "$_id",
                // populated user fields
                user: {
                  _id: "$user._id",
                  name: { $ifNull: ["$user.name", null] },
                  email: { $ifNull: ["$user.email", null] },
                  phone: { $ifNull: ["$user.phone", null] },
                },

                address: "$address",
                kycStatus: "$kycStatus",
                profile: "$profile",
                dob: "$dob",
                city: "$city",
                state: "$state",
                country: "$country",
                pincode: "$pincode",
                serviceAreaDistance: "$serviceAreaDistance",
                isSuspended: "$isSuspended",
                profileCompletion: "$profileCompletion",
                totalExperience: "$totalExperience",
                referredBy: "$referredBy",
                referralCode: "$referralCode",
                referralPoints: "$referralPoints",
                isSubscriptionPlaneActive: "$isSubscriptionPlaneActive",
                activeSubscriptionPlan: "$activeSubscriptionPlan",
                waitingForApproval: "$waitingForApproval",
                subscriptionExpiresAt: "$subscriptionExpiresAt",
                total_income: "$total_income",
                wallet_amount: "$wallet_amount",
                createdAt: "$createdAt",
                updatedAt: "$updatedAt",
                jobs_completed: "$jobs_completed",
                total_review: "$total_review",
              },
            },
          },
        },

        // ---- SLICE 10 RECORDS ----
        {
          $project: {
            _id: 1,
            count: 1,
            records: { $slice: ["$records", 10] },
          },
        },
      ]);

      // Initialize counters
      let incomming = {
        page: 1,
        limit: 10,
        totalPages: 1,
        total: 0,
        base_url: ``,
        list: [],
      };
      let kycFailed = {
        page: 1,
        limit: 10,
        totalPages: 1,
        total: 0,
        base_url: ``,
        list: [],
      };
      let approval_pending = {
        page: 1,
        limit: 10,
        totalPages: 1,
        total: 0,
        base_url: ``,
        list: [],
      };
      let all_partner = {
        page: 1,
        limit: 10,
        totalPages: 1,
        total: 0,
        base_url: ``,
        list: [],
      };

      // Map the aggregation result
      partnerStatusCounts.forEach((item) => {
        const { kycStatus, waitingForApproval } = item._id;
        if (kycStatus === "pending" && waitingForApproval === false)
          incomming = {
            page: 1,
            limit: 10,
            totalPages: Math.ceil(item.count / 10),
            total: item.count,
            base_url: `${process.env.BASE_URL}/uploads/profile/`,
            list: item.records,
          };
        if (kycStatus === "rejected" && waitingForApproval === false)
          kycFailed = {
            page: 1,
            limit: 10,
            totalPages: Math.ceil(item.count / 10),
            total: item.count,
            base_url: `${process.env.BASE_URL}/uploads/profile/`,
            list: item.records,
          };
        if (kycStatus === "pending" && waitingForApproval === true)
          approval_pending = {
            page: 1,
            limit: 10,
            totalPages: Math.ceil(item.count / 10),
            total: item.count,
            base_url: `${process.env.BASE_URL}/uploads/profile/`,
            list: item.records,
          };
        if (kycStatus === "approved" && waitingForApproval === false)
          all_partner = {
            page: 1,
            limit: 10,
            totalPages: Math.ceil(item.count / 10),
            total: item.count,
            base_url: `${process.env.BASE_URL}/uploads/profile/`,
            list: item.records,
          };
      });
      const allCounts = { incomming, kycFailed, approval_pending, all_partner };
      return createResponseStatus(
        200,
        { allCounts },
        "status wise partner count successfully done"
      );
    } catch (error: any) {
      logger.error(`${error.message} Error when fetching partner count`);
      return createResponseStatus(
        500,
        null,
        error.message || "Error when fetching partner count"
      );
    }
  }

  static async profileCreateUpdate(
    files: { [fieldname: string]: Express.Multer.File[] },
    partnerId: string,
    req: any
  ) {
    try {
      const {
        name,
        phone,
        dob,
        email,
        languageCode,
        role,
        roleId,
        createdBy,
        updatedBy,
        latitude,
        longitude,
        address,
        city,
        state,
        country,
        pincode,
        serviceAreaDistance,
      } = (req.body as any) || {};

      // Validate required fields
      if (!name || !phone || !dob || !email) {
        return createResponse(
          false,
          null,
          "Please fill out all required fields (name, phone, dob, email)"
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return createResponse(false, null, "Invalid email format");
      }

      // Validate phone number
      const checkPhoneValid = await checkIsValidPhoneNumber(phone);
      if (!checkPhoneValid) {
        return createResponse(
          false,
          null,
          "Invalid phone number, please check and try again"
        );
      }

      // Validate date of birth
      const dobDate = new Date(dob);
      if (isNaN(dobDate.getTime())) {
        return createResponse(false, null, "Invalid date of birth format");
      }

      // Check if partner is at least 18 years old
      const today = new Date();
      const age = today.getFullYear() - dobDate.getFullYear();
      const monthDiff = today.getMonth() - dobDate.getMonth();
      if (age < 18 || (age === 18 && monthDiff < 0)) {
        return createResponse(
          false,
          null,
          "Partner must be at least 18 years old"
        );
      }

      // Check if partner exists (determines create vs update)
      const existsPartner = await Partner.findOne({ _id: partnerId });
      const isUpdate = !!existsPartner;

      // Get user ID for duplicate checks
      let userId = null;
      if (isUpdate && existsPartner) {
        userId = existsPartner.user;
      }

      // For updates, exclude current user from duplicate checks
      const excludeCondition =
        isUpdate && userId ? { _id: { $ne: userId } } : {};

      // Check email uniqueness
      const checkEmailExist = await User.findOne({
        email: email.toLowerCase().trim(),
        ...excludeCondition,
      });
      if (checkEmailExist) {
        return createResponse(
          false,
          null,
          "Email is already in use by another user"
        );
      }

      // Check phone uniqueness
      const checkPhoneExist = await User.findOne({
        phone: phone,
        ...excludeCondition,
      });
      if (checkPhoneExist) {
        return createResponse(
          false,
          null,
          "Phone number is already in use by another user"
        );
      }

      let user: any;
      let partner: any;

      if (isUpdate) {
        // UPDATE FLOW
        if (!existsPartner) {
          return createResponse(false, null, "Partner profile not found");
        }

        // Get the existing user
        const existsUser = await User.findOne({ _id: existsPartner.user });
        if (!existsUser) {
          return createResponse(false, null, "User not found for this partner");
        }

        // Handle profile image update
        let newProfileFilename = existsPartner.profile;
        if (files?.profile && files.profile[0]) {
          // Delete old profile if exists
          if (existsPartner.profile) {
            const oldProfilePath = path.join(
              "uploads/profile/",
              path.basename(existsPartner.profile)
            );
            if (fs.existsSync(oldProfilePath)) {
              try {
                fs.unlinkSync(oldProfilePath);
              } catch (err) {
                logger.warn(`Failed to delete old profile image: ${err}`);
              }
            }
          }
          newProfileFilename = files.profile[0].filename;
        }

        // Update user information
        user = await User.findOneAndUpdate(
          { _id: existsPartner.user },
          {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            dob: dob,
            phone,
            ...(role && { role }),
            ...(roleId && { roleId }),
            ...(updatedBy && { updatedBy }),
            updatedAt: new Date(),
          },
          { new: true, runValidators: true }
        );

        if (!user) {
          return createResponse(
            false,
            null,
            "Failed to update user information"
          );
        }

        // Prepare partner update data
        const partnerUpdateData: any = {
          dob: dobDate,
          languageCode: languageCode || existsPartner.languageCode || "en_US",
          profile: newProfileFilename,
          profilePendingScreens:
            existsPartner.profilePendingScreens === 1
              ? 2
              : existsPartner.profilePendingScreens,
          ...(updatedBy && { updatedBy }),
          updatedAt: new Date(),
        };

        // Update address fields if provided
        if (address) partnerUpdateData.address = address.trim();
        if (city) partnerUpdateData.city = city.trim();
        if (state) partnerUpdateData.state = state.trim();
        if (country) partnerUpdateData.country = country.trim();
        if (pincode) partnerUpdateData.pincode = parseInt(pincode);
        if (serviceAreaDistance)
          partnerUpdateData.serviceAreaDistance = parseInt(serviceAreaDistance);

        // Update latitude/longitude if provided
        if (latitude && longitude) {
          const lat = parseFloat(latitude);
          const lng = parseFloat(longitude);

          // Validate coordinates
          if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            partnerUpdateData.latitude = lat;
            partnerUpdateData.longitude = lng;
            partnerUpdateData.location = {
              type: "Point",
              coordinates: [lng, lat],
            };
          } else {
            return createResponse(
              false,
              null,
              "Invalid latitude or longitude values"
            );
          }
        }

        // Set referral code if not already set
        if (
          user?.phone &&
          (!existsPartner.referralCode || existsPartner.referralCode === "")
        ) {
          partnerUpdateData.referralCode = await removeCountryCode(user.phone);
        }

        // Update partner
        partner = await Partner.findOneAndUpdate(
          { _id: partnerId },
          partnerUpdateData,
          { new: true, runValidators: true }
        );

        if (!partner) {
          return createResponse(
            false,
            null,
            "Failed to update partner profile"
          );
        }

        // Update profile completion
        await updateProfileCompletion(partner._id);
      } else {
        // CREATE FLOW

        // Validate required fields for creation
        if (!role || !roleId || !createdBy) {
          return createResponse(
            false,
            null,
            "Role, roleId, and createdBy are required for creating a new partner"
          );
        }

        // Validate coordinates if provided
        if (latitude && longitude) {
          const lat = parseFloat(latitude);
          const lng = parseFloat(longitude);

          if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return createResponse(
              false,
              null,
              "Invalid latitude or longitude values"
            );
          }
        }

        // Generate a new user ID (or use partnerId if that's your convention)
        const newUserId = partnerId; // Assuming partnerId is provided for new creation too

        // Create new user
        user = await User.create({
          _id: newUserId,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          dob: dobDate,
          phone,
          role,
          roleId,
          createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Generate referral code
        const referralCode = await removeCountryCode(phone);

        // Prepare partner data
        const partnerData: any = {
          user: user._id,
          dob: dobDate,
          languageCode: languageCode || "en_US",
          profile:
            files?.profile && files.profile[0]
              ? files.profile[0].filename
              : null,
          referralCode: referralCode,
          profilePendingScreens: 1,
          latitude: latitude ? parseFloat(latitude) : 0,
          longitude: longitude ? parseFloat(longitude) : 0,
          location: {
            type: "Point",
            coordinates: [
              longitude ? parseFloat(longitude) : 0,
              latitude ? parseFloat(latitude) : 0,
            ],
          },
          createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Add optional fields
        if (address) partnerData.address = address.trim();
        if (city) partnerData.city = city.trim();
        if (state) partnerData.state = state.trim();
        if (country) partnerData.country = country.trim();
        if (pincode) partnerData.pincode = parseInt(pincode);
        if (serviceAreaDistance)
          partnerData.serviceAreaDistance = parseInt(serviceAreaDistance);

        // Create partner profile
        partner = await Partner.create(partnerData);

        // Update profile completion
        await updateProfileCompletion(partner._id);
      }

      // Fetch complete profile
      const userAndPartnerProfile = await getProfile(partner?.user);

      return createResponse(
        true,
        {
          user: userAndPartnerProfile?.user,
          partner: userAndPartnerProfile?.partner,
        },
        isUpdate
          ? "Partner profile updated successfully!"
          : "Partner profile created successfully!"
      );
    } catch (error: any) {
      logger.error(
        `Error when creating or updating partner profile: ${error?.message}`,
        {
          stack: error?.stack,
          partnerId,
        }
      );

      // Handle specific MongoDB errors
      if (error?.code === 11000) {
        return createResponse(
          false,
          null,
          "Duplicate entry detected. Please check phone or email."
        );
      }

      return createResponse(
        false,
        null,
        error?.message || "Error during profile operation"
      );
    }
  }

  static async skillsCreateUpdate(
    partnerId: string,
    files: { [fieldname: string]: Express.Multer.File[] },
    payload: any
  ) {
    try {
      if (!partnerId) {
        return createResponse(false, null, "User not found");
      }

      const partner = await Partner.findOne({ _id: Object(partnerId) });

      if (!payload?.skills) {
        return {
          success: false,
          data: null,
          message: "skills are required",
        };
      }

      let PSkills = [];
      if (!Array.isArray(payload.skills)) {
        PSkills.push(payload.skills);
      } else {
        PSkills = payload.skills;
      }

      const skills = PSkills.map((id: any) => new mongoose.Types.ObjectId(id));

      const subcategoriesByCategory = await Service.find({
        _id: { $in: skills },
      }).select("category categorytype name");

      let categories = subcategoriesByCategory.map((subcategory: any) =>
        subcategory.category.toString()
      );
      categories = [...new Set(categories)];
      let subcategories = subcategoriesByCategory.map((subcategory: any) =>
        subcategory._id.toString()
      );
      subcategories = [...new Set(subcategories)];
      let typeOfCategory = subcategoriesByCategory.map((subcategory: any) =>
        subcategory.categorytype.toString()
      );
      typeOfCategory = [...new Set(typeOfCategory)];

      let subcategoriesNames = subcategoriesByCategory.map(
        (subcategory: any) => subcategory
      );

      const yearOfExprence = payload.yearOfExprence || [];

      interface SkillExperience {
        serviceId: any;
        skill: string;
        yearOfExprence: number;
        experienceCertificates: string;
      }

      const skillsWithYearOfExprence: SkillExperience[] = [];

      subcategoriesNames.forEach((item: any) => {
        const serviceId = item?._id?.toString?.();

        const experienceYear =
          yearOfExprence?.[serviceId] ??
          partner?.skills?.find(
            (s: any) => s.serviceId?.toString() === serviceId
          )?.yearOfExprence ??
          0;

        let experienceCertificate =
          files?.experienceCertificates?.[serviceId]?.filename ??
          partner?.skills?.find(
            (s: any) => s.serviceId?.toString() === serviceId
          )?.experienceCertificates ??
          "";

        // Optional: If `files` is an array (like from multer), process it accordingly
        if (Array.isArray(files)) {
          files.forEach((file: any) => {
            if (file?.fieldname?.includes(serviceId)) {
              experienceCertificate = file.filename;
            }
          });
        }

        skillsWithYearOfExprence.push({
          serviceId: item?._id?.toString(),
          skill: item?.name,
          yearOfExprence: experienceYear,
          experienceCertificates: experienceCertificate,
        });
      });

      if (partner) {
        partner.category =
          categories.map(
            (category: any) => new mongoose.Types.ObjectId(category.toString())
          ) || [];
        partner.services =
          subcategories.map(
            (subcategory: any) =>
              new mongoose.Types.ObjectId(subcategory.toString())
          ) || [];
        partner.skills = (skillsWithYearOfExprence as any) || [];
        partner.categoryType = typeOfCategory || [];
        if (
          partner.profilePendingScreens < 5 &&
          partner.profilePendingScreens !== 0
        ) {
          partner.profilePendingScreens = 5; // 5 mean pending for update work location
        }
        partner.totalExperience = Math.max(
          ...skillsWithYearOfExprence.map((item) => Number(item.yearOfExprence))
        );

        partner.updatedBy = payload.updatedBy;

        await partner.save();
      }

      if (partner) {
        await updateProfileCompletion(partner._id);
      }

      const userAndPartnerProfile = await getProfile(partner?.user?._id?.toString() as string);

      return {
        success: true,
        data: {
          user: userAndPartnerProfile?.user,
          partner: userAndPartnerProfile?.partner,
        },
        message: "Partner skills updated successfully",
      };
    } catch (error: any) {
      logger.error(`${error?.message} Error When update Partner skills`);
      return {
        success: false,
        data: null,
        message:
          error?.message || "Error during updating partner provide services",
      };
    }
  }

  static async locationCreateUpdate(partnerId: string, payload: any) {
    try {
      if (!partnerId) {
        return createResponse(false, null, "User not found");
      }

      if (
        !payload.address ||
        !payload.city ||
        !payload.state ||
        !payload.pincode ||
        !payload.country ||
        !payload.latitude ||
        !payload.longitude ||
        !payload.serviceAreaDistance
      ) {
        return {
          success: false,
          data: null,
          message: "Please fill out all fields",
        };
      }

      const partner = await Partner.findOne({ _id: partnerId });
      if (partner) {
        partner.address = payload.address;
        partner.city = payload.city;
        partner.state = payload.state;
        partner.pincode = payload.pincode;
        partner.country = payload.country;
        partner.latitude = payload.latitude;
        partner.longitude = payload.longitude;
        partner.location = {
          type: "Point",
          coordinates: [payload.longitude, payload.latitude], // [longitude, latitude]
        };
        partner.serviceAreaDistance = payload.serviceAreaDistance;
        if (partner.profilePendingScreens === 5) {
          partner.profilePendingScreens = 6; // 6 mean pending for upload documents
        }
        partner.updatedBy = payload.updatedBy;

        await partner.save();
      }

      if (partner) {
        await updateProfileCompletion(partner?._id);
      }

      const userAndPartnerProfile = await getProfile(partner?.user?._id?.toString() as string);

      return {
        success: true,
        data: {
          user: userAndPartnerProfile?.user,
          partner: userAndPartnerProfile?.partner,
        },
        message: "Work location updated successfully",
      };
    } catch (error: any) {
      logger.error(`${error?.message} Error when update location`);
      return {
        success: false,
        data: null,
        message: error?.message || "Error during update location",
      };
    }
  }

  static async documentCreateUpdate(
    partnerId: string,
    files: { [fieldname: string]: Express.Multer.File[] },
    req: any
  ) {
    try {
      const { aadharNo, panNo, isAadharCard, isPanCard, updatedBy } =
        (req.body as any) || {};

      if (!partnerId) {
        return createResponse(false, null, "User not found");
      }

      const session = await mongoose.startSession();
      const oldImages = [];
      const newImages = [];
      session.startTransaction();
      const partner = await Partner.findOne({ _id: Object(partnerId) });

      if (aadharNo && isAadharCard) {
        const isDuplicate = await Partner.findOne({
          aadharNo: aadharNo,
          _id: { $ne: partner?._id }, // Exclude current partner (being edited)
        });

        if (isDuplicate) {
          return {
            success: false,
            data: null,
            message: "Aadhar number already exists.",
          };
        }
      }

      if (panNo && isPanCard) {
        const isDuplicate = await Partner.findOne({
          panNo: panNo,
          _id: { $ne: partner?._id }, // Exclude current partner (being edited)
        });
        if (isDuplicate) {
          return {
            success: false,
            data: null,
            message: "Pan number already exists.",
          };
        }
      }

      if (!partner) {
        return {
          success: false,
          data: null,
          message: "Partner not found",
        };
      }

      if (isAadharCard === "true") {
        partner.aadharNo =
          aadharNo !== "undefined" ? aadharNo : partner.aadharNo;
      }
      if (isPanCard === "true") {
        partner.panNo = panNo !== "undefined" ? panNo : partner.panNo;
      }

      if (files?.aadharFront?.[0]) {
        oldImages.push(`uploads/partner-docs/${partner.aadharFront}`);
        partner.aadharFront = files.aadharFront[0].filename;
        newImages.push(`uploads/partner-docs/${files.aadharFront[0].filename}`);
      }
      if (files?.aadharBack?.[0]) {
        oldImages.push(`uploads/partner-docs/${partner.aadharBack}`);
        partner.aadharBack = files.aadharBack[0].filename;
        newImages.push(`uploads/partner-docs/${files.aadharBack[0].filename}`);
      }

      if (files?.panFront?.[0]) {
        oldImages.push(`uploads/partner-docs/${partner.panFront}`);
        partner.panFront = files.panFront[0].filename;
        newImages.push(`uploads/partner-docs/${files.panFront[0].filename}`);
      }
      if (files?.panBack?.[0]) {
        oldImages.push(`uploads/partner-docs/${partner.panBack}`);
        partner.panBack = files.panBack[0].filename;
        newImages.push(`uploads/partner-docs/${files.panBack[0].filename}`);
      }

      const experienceCertificates: string[] = [];
      if (files?.experienceCertificates?.length > 0) {
        files.experienceCertificates.forEach((file: any) => {
          experienceCertificates.push(file.filename);
          newImages.push(`uploads/partner-docs/${file.filename}`);
        });

        partner.experienceCertificates.forEach((certificate: string) => {
          oldImages.push(`uploads/partner-docs/${certificate}`);
        });

        partner.experienceCertificates = experienceCertificates;
      }

      if (isAadharCard === "true") {
        if (!isValidAadhaar(aadharNo as string)) {
          newImages.forEach(async (image) => {
            await removeOldFile(image as string);
          });
          return {
            success: false,
            data: null,
            message: "Please upload valid Aadhar Details",
          };
        }

        if (
          (files?.aadharFront?.[0] && !files?.aadharBack?.[0]) ||
          (!files?.aadharFront?.[0] && files?.aadharBack?.[0])
        ) {
          newImages.forEach(async (image) => {
            await removeOldFile(image as string);
          });
          return {
            success: false,
            data: null,
            message: "Please upload both Aadhar front and back",
          }; //
        }
      }

      if (isPanCard === "true") {
        if (!isValidPan(panNo as string)) {
          newImages.forEach(async (image) => {
            await removeOldFile(image as string);
          });
          return {
            success: false,
            data: null,
            message: "Please upload valid Pan number",
          };
        }
        if (
          (files?.panFront?.[0] && !files?.panBack?.[0]) ||
          (!files?.panFront?.[0] && files?.panBack?.[0])
        ) {
          newImages.forEach(async (image) => {
            await removeOldFile(image as string);
          });
          return {
            success: false,
            data: null,
            message: "Please upload both Pan front and back",
          };
        }
      }
      partner.profilePendingScreens = 0; // 0 mean profile is complete

      if (partner.kycStatus == "rejected") {
        partner.kycStatus = "pending";
      }
      partner.updatedBy = updatedBy;

      await partner.save();
      await session.commitTransaction();
      oldImages.forEach(async (image) => {
        await removeOldFile(image as string);
      });
      session.endSession();

      await updateProfileCompletion(partner._id);

      const userAndPartnerProfile = await getProfile(partner?.user?._id?.toString() as string);
      return {
        success: true,
        data: {
          user: userAndPartnerProfile?.user,
          partner: userAndPartnerProfile?.partner,
        },
        message: "Partner documents uploaded successfully",
      };
    } catch (error: any) {
      logger.error(`${error?.message} Error when upload partner documents`);
      return {
        success: false,
        data: null,
        message: error?.message || "Error during uploading partner documents",
      };
    }
  }

  static async vocationalBanner(
    payload: any,
    file: any
  ): Promise<GenericResponseCode<any>> {
    try {
      if (!payload?.title && !payload?.description && !file?.banner?.[0]) {
        return createResponseStatus(
          200,
          null,
          "Please provide at least one — title, description, or banner is required."
        );
      }

      const { title, description, bannerType } = payload;

      const checkBanner = await Banner.findOne({ title, bannerType });
      if (checkBanner && (checkBanner?.title != null))
        return createResponseStatus(
          409,
          null,
          "Banner title already exists. Please upload a different one"
        );
      let validityDate = new Date(payload?.validity);
      const insertData = {
        title,
        description,
        status: "active",
        bannerType,
        vocationalBanner: true,
        validity: validityDate,
        banner: file?.banner[0] ? file?.banner[0]?.filename : null,
      };

      const response = await Banner.create(insertData);
      return createResponseStatus(
        200,
        { result: response },
        "Banner upload successfully done"
      );
    } catch (error: any) {
      logger.error(`${error.message} Error when upload banner`);
      return createResponseStatus(
        500,
        null,
        error.message || "Error when upload banner"
      );
    }
  }

  static async getVocationalBanner(): Promise<GenericResponseCode<any>> {
    try {
      const result = await Banner.find({
        bannerType: "customer",
        vocationalBanner: true,
      });
      return createResponseStatus(
        200,
        { result },
        "fetch transaction list successfully"
      );
    } catch (error: any) {
      logger.error(
        `${error.message} Error when fetching vocational banner list`
      );
      return createResponseStatus(
        500,
        null,
        error.message || "Error when fetching vocational banner list"
      );
    }
  }

  static async dashboardPartnersSearch(
    payload: any,
    userId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      let { startDate, endDate, status, searchText, limit, page } = payload;
      searchText = typeof searchText === "string" ? searchText.trim() : "";
      const searchRegex = searchText ? new RegExp(searchText, "i") : /.*/; // match all if empty

      const fromDate = new Date(startDate || "2025-01-15");
      const toDate = new Date(endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      const query: any = { createdAt: { $gte: fromDate, $lte: toDate } };
      if (status === "incoming") {
        query.kycStatus = "pending";
        query.waitingForApproval = false;
      } else if (status === "kyc_failed") {
        query.kycStatus = "rejected";
        query.waitingForApproval = false;
      } else if (status === "pending_approval") {
        query.kycStatus = "pending";
        query.waitingForApproval = true;
      } else if (status === "all_partners") {
        query.kycStatus = "approved";
        query.waitingForApproval = false;
      }

      if (searchText != "") {
        query.$or = [
          { address: { $regex: searchText, $options: "i" } },
          { city: { $regex: searchText, $options: "i" } },
          { state: { $regex: searchText, $options: "i" } },
          { country: { $regex: searchText, $options: "i" } },
          { pincode: { $regex: searchText, $options: "i" } },
          { "user.name": { $regex: searchText, $options: "i" } },
          { "user.email": { $regex: searchText, $options: "i" } },
          { "user.phone": { $regex: searchText, $options: "i" } },
        ];
      }

      page = Number(page) || 1;
      limit = Number(limit) || 10;
      const skip = (page - 1) * limit;
      const result = await Partner.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" }, // single user
        // ---- GROUP ----
        { $match: query },
        {
          $project: {
            _id: 1,
            // populated user fields
            user: {
              _id: "$user._id",
              name: { $ifNull: ["$user.name", null] },
              email: { $ifNull: ["$user.email", null] },
              phone: { $ifNull: ["$user.phone", null] },
            },
            address: 1,
            kycStatus: 1,
            profile: 1,
            dob: 1,
            city: 1,
            state: 1,
            country: 1,
            pincode: 1,
            serviceAreaDistance: 1,
            isSuspended: 1,
            profileCompletion: 1,
            totalExperience: 1,
            referredBy: 1,
            referralCode: 1,
            referralPoints: 1,
            isSubscriptionPlaneActive: 1,
            activeSubscriptionPlan: 1,
            waitingForApproval: 1,
            subscriptionExpiresAt: 1,
            total_income: 1,
            wallet_amount: 1,
            createdAt: 1,
            updatedAt: 1,
            jobs_completed: 1,
            total_review: 1,
          },
        },
        { $sort: { _id: -1 } },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            totalCount: [{ $count: "count" }],
          },
        },
      ]);

      const data = result[0].data;
      const totalCount = result[0].totalCount[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return createResponseStatus(
        200,
        {
          page,
          limit,
          totalPages,
          base_url: `${process.env.BASE_URL}/uploads/profile/`,
          total: totalCount,
          list: data,
        },
        "partner search successfully"
      );
    } catch (error: any) {
      logger.error(`${error.message} Error when search partner`);
      return createResponseStatus(
        500,
        null,
        error.message || "Error when search partner"
      );
    }
  }

  static async planWiseCustomers(
    payload: any,
    userId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      const { startDate, endDate } = payload;
      const fromDate = new Date(startDate || "2025-01-15");
      const toDate = new Date(endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      let query: any = { createdAt: { $gte: fromDate, $lte: toDate } };
      query["userData.role"] = "customer";

      const result = await Customer.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userData",
          },
        },
        { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },

        { $match: query },

        {
          $lookup: {
            from: "usersubscriptions",
            localField: "activeSubscriptionPlan",
            foreignField: "_id",
            as: "userSubscription",
          },
        },
        {
          $unwind: {
            path: "$userSubscription",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: "subscriptionplans",
            localField: "userSubscription.subscriptionPlans",
            foreignField: "_id",
            as: "plan",
          },
        },
        { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },

        {
          $group: {
            _id: "$plan.name", // group by plan name
            totalCustomers: { $sum: 1 },
            customersAll: {
              $push: {
                _id: "$_id",
                // USER INFO
                user: {
                  _id: "$userData._id",
                  name: { $ifNull: ["$userData.name", null] },
                  email: { $ifNull: ["$userData.email", null] },
                  phone: { $ifNull: ["$userData.phone", null] },
                },
                address: "$address",
                city: "$city",
                country: "$country",
                isGuest: "$isGuest",
                isSubscriptionPlaneActive: "$isSubscriptionPlaneActive",
                activeSubscriptionPlan: "$activeSubscriptionPlan",
                languageCode: "$languageCode",
                pincode: "$pincode",
                referralCode: "$referralCode",
                referralPoints: "$referralPoints",
                referredBy: "$referredBy",
                state: "$state",
                subscriptionExpiresAt: "$subscriptionExpiresAt",
                wallet_amount: "$wallet_amount",
                profile: "$profile",
                createdAt: "$createdAt",
                updatedAt: "$updatedAt",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            planName: "$_id",
            totalCustomers: 1,
            customers: {
              $slice: [
                {
                  $sortArray: {
                    input: "$customersAll",
                    sortBy: { createdAt: -1 },
                  },
                },
                10,
              ],
            },
          },
        },
      ]);
      let subscriptionPlanList: any = await subscriptionPlansModel
        .find({ target: "customer", status: "active" })
        .select("name")
        .lean();
      subscriptionPlanList.push({ name: "No Active Plan" });
      let filters = subscriptionPlanList.reduce((acc: any, item: any) => {
        acc[item.name] = item.name;
        return acc;
      }, {});

      let resultArray: any = [];
      result.forEach((item) => {
        resultArray.push({
          planName: item?.planName || "No Active Plan",
          filters,
          page: 1,
          limit: 10,
          totalPages: Math.ceil(item.totalCustomers / 10),
          total: item.totalCustomers,
          base_url: `${process.env.BASE_URL}/uploads/profile/`,
          list: item.customers,
        });
      });

      return createResponseStatus(
        200,
        { planWiseCustomers: resultArray },
        "plan wise cutomer fatch successfully"
      );
    } catch (error: any) {
      logger.error(`${error.message} Error when fetching plan wise customer`);
      return createResponseStatus(
        500,
        null,
        error.message || "Error when fetching plan wise customer"
      );
    }
  }

  static async planWiseCustomersSearch(
    payload: any,
    userId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      let { startDate, endDate, plan, searchText, limit, page } = payload;
      searchText = typeof searchText === "string" ? searchText.trim() : "";
      const searchRegex = searchText ? new RegExp(searchText, "i") : /.*/; // match all if empty
      const fromDate = new Date(startDate || "2025-01-15");
      const toDate = new Date(endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      const query: any = { createdAt: { $gte: fromDate, $lte: toDate } };
      if (plan === "No Active Plan") {
        query.$or = [
          { isSubscriptionPlaneActive: false }, // boolean false
          { isSubscriptionPlaneActive: "false" }, // string false
          { isSubscriptionPlaneActive: null }, // null
          { isSubscriptionPlaneActive: { $exists: false } }, // missing field
        ];
      } else {
        let checkPlaneName = await subscriptionPlansModel
          .findOne({ name: plan })
          .select("name");
        if (checkPlaneName) {
          query["plan.name"] = plan;
        }
      }

      if (searchText != "") {
        query.$or = [
          { address: { $regex: searchText, $options: "i" } },
          { city: { $regex: searchText, $options: "i" } },
          { state: { $regex: searchText, $options: "i" } },
          { country: { $regex: searchText, $options: "i" } },
          { pincode: { $regex: searchText, $options: "i" } },
          { referralCode: { $regex: searchText, $options: "i" } },
          { "user.name": { $regex: searchText, $options: "i" } },
          { "user.email": { $regex: searchText, $options: "i" } },
          { "user.phone": { $regex: searchText, $options: "i" } },
        ];
      }
      query["userData.role"] = "customer";
      page = Number(page) || 1;
      limit = Number(limit) || 10;
      const skip = (page - 1) * limit;

      const result = await Customer.aggregate([
        /** USER lookup */
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userData",
          },
        },
        { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },

        /** USER SUBSCRIPTION lookup */
        {
          $lookup: {
            from: "usersubscriptions",
            localField: "activeSubscriptionPlan",
            foreignField: "_id",
            as: "userSubscription",
          },
        },
        {
          $unwind: {
            path: "$userSubscription",
            preserveNullAndEmptyArrays: true,
          },
        },

        /** PLAN lookup */
        {
          $lookup: {
            from: "subscriptionplans",
            localField: "userSubscription.subscriptionPlans",
            foreignField: "_id",
            as: "plan",
          },
        },
        { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },

        /** Apply filters */
        { $match: query },
        /** Pre-project for correct counting */
        {
          $project: {
            _id: 1,
            planName: "$plan.name",
            user: {
              _id: "$userData._id",
              name: { $ifNull: ["$userData.name", null] },
              email: { $ifNull: ["$userData.email", null] },
              phone: { $ifNull: ["$userData.phone", null] },
            },
            address: 1,
            city: 1,
            country: 1,
            isGuest: 1,
            isSubscriptionPlaneActive: 1,
            languageCode: 1,
            pincode: 1,
            referralCode: 1,
            referralPoints: 1,
            referredBy: 1,
            state: 1,
            subscriptionExpiresAt: 1,
            wallet_amount: 1,
            profile: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },

        /** PAGINATION — correct way */
        {
          $facet: {
            totalCount: [{ $count: "count" }], // total without pagination
            data: [
              { $sort: { createdAt: -1 } }, // sort inside data pipeline
              { $skip: skip },
              { $limit: limit },
            ],
          },
        },
      ]);

      const data = result[0].data;
      const totalCount = result[0].totalCount[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return createResponseStatus(
        200,
        {
          page,
          limit,
          totalPages,
          base_url: `${process.env.BASE_URL}/uploads/profile/`,
          total: totalCount,
          list: data,
        },
        "partner search successfully"
      );
    } catch (error: any) {
      logger.error(`${error.message} Error when customer sarch plan wise`);
      return createResponseStatus(
        500,
        null,
        error.message || "Error when customer sarch plan wise"
      );
    }
  }

  static async planWisePartnerCount(
    payload: any,
    userId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      const { startDate, endDate } = payload;
      const fromDate = new Date(startDate || "2025-01-15");
      const toDate = new Date(endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      let query: any = { createdAt: { $gte: fromDate, $lte: toDate } };
      query["userData.role"] = "partner";

      const result = await Partner.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userData",
          },
        },
        { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },

        { $match: query },

        {
          $lookup: {
            from: "usersubscriptions",
            localField: "activeSubscriptionPlan",
            foreignField: "_id",
            as: "userSubscription",
          },
        },
        {
          $unwind: {
            path: "$userSubscription",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: "subscriptionplans",
            localField: "userSubscription.subscriptionPlans",
            foreignField: "_id",
            as: "plan",
          },
        },
        { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },

        {
          $group: {
            _id: "$plan.name", // group by plan name
            totalCustomers: { $sum: 1 },
            partnerAll: {
              $push: {
                _id: "$_id",
                // USER INFO
                user: {
                  _id: "$userData._id",
                  name: { $ifNull: ["$userData.name", null] },
                  email: { $ifNull: ["$userData.email", null] },
                  phone: { $ifNull: ["$userData.phone", null] },
                },
                address: "$address",
                city: "$city",
                country: "$country",
                isGuest: "$isGuest",
                isSubscriptionPlaneActive: "$isSubscriptionPlaneActive",
                languageCode: "$languageCode",
                pincode: "$pincode",
                referralCode: "$referralCode",
                referralPoints: "$referralPoints",
                referredBy: "$referredBy",
                state: "$state",
                subscriptionExpiresAt: "$subscriptionExpiresAt",
                wallet_amount: "$wallet_amount",
                profile: "$profile",
                createdAt: "$createdAt",
                updatedAt: "$updatedAt",
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            planName: "$_id",
            totalCustomers: 1,
            customers: {
              $slice: [
                {
                  $sortArray: {
                    input: "$partnerAll",
                    sortBy: { createdAt: -1 },
                  },
                },
                10,
              ],
            },
          },
        },
      ]);
      let subscriptionPlanList: any = await subscriptionPlansModel
        .find({ target: "partner", status: "active" })
        .select("name")
        .lean();
      subscriptionPlanList.push({ name: "No Active Plan" });
      let filters = subscriptionPlanList.reduce((acc: any, item: any) => {
        acc[item.name] = item.name;
        return acc;
      }, {});

      let resultArray: any = [];
      result.forEach((item) => {
        resultArray.push({
          planName: item?.planName || "No Active Plan",
          filters,
          page: 1,
          limit: 10,
          totalPages: Math.ceil(item.totalCustomers / 10),
          total: item.totalCustomers,
          base_url: `${process.env.BASE_URL}/uploads/profile/`,
          list: item.customers,
        });
      });

      return createResponseStatus(
        200,
        { result: resultArray },
        "Partner count plan wise successfully"
      );
    } catch (error: any) {
      logger.error(`${error.message} || Error when count plan wise partner`);
      return createResponseStatus(
        500,
        null,
        error.message || "Error when count plan wise partner"
      );
    }
  }

  static async planWisePartnerSearch(
    payload: any,
    userId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      let { startDate, endDate, plan, searchText, limit, page } = payload;
      searchText = typeof searchText === "string" ? searchText.trim() : "";
      const searchRegex = searchText ? new RegExp(searchText, "i") : /.*/; // match all if empty
      const fromDate = new Date(startDate || "2025-01-15");
      const toDate = new Date(endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      const query: any = { createdAt: { $gte: fromDate, $lte: toDate } };
      if (plan === "No Active Plan") {
        query.$or = [
          { isSubscriptionPlaneActive: false }, // boolean false
          { isSubscriptionPlaneActive: "false" }, // string false
          { isSubscriptionPlaneActive: null }, // null
          { isSubscriptionPlaneActive: { $exists: false } }, // missing field
        ];
      } else {
        let checkPlaneName = await subscriptionPlansModel
          .findOne({ name: plan })
          .select("name");
        if (checkPlaneName) {
          query["plan.name"] = plan;
        }
      }
      query["userData.role"] = "partner";
      if (searchText != "") {
        query.$or = [
          { address: { $regex: searchText, $options: "i" } },
          { city: { $regex: searchText, $options: "i" } },
          { state: { $regex: searchText, $options: "i" } },
          { country: { $regex: searchText, $options: "i" } },
          { pincode: { $regex: searchText, $options: "i" } },
          { referralCode: { $regex: searchText, $options: "i" } },
          { "userData.name": { $regex: searchText, $options: "i" } },
          { "userData.email": { $regex: searchText, $options: "i" } },
          { "userData.phone": { $regex: searchText, $options: "i" } },
        ];
      }

      page = Number(page) || 1;
      limit = Number(limit) || 10;
      const skip = (page - 1) * limit;


      const result = await Partner.aggregate([
        /** USER lookup */
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userData",
          },
        },
        { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },

        /** USER SUBSCRIPTION lookup */
        {
          $lookup: {
            from: "usersubscriptions",
            localField: "activeSubscriptionPlan",
            foreignField: "_id",
            as: "userSubscription",
          },
        },
        {
          $unwind: {
            path: "$userSubscription",
            preserveNullAndEmptyArrays: true,
          },
        },

        /** PLAN lookup */
        {
          $lookup: {
            from: "subscriptionplans",
            localField: "userSubscription.subscriptionPlans",
            foreignField: "_id",
            as: "plan",
          },
        },
        { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },

        /** Apply filters */
        { $match: query },
        /** Pre-project for correct counting */
        {
          $project: {
            _id: 1,
            planName: "$plan.name",
            user: {
              _id: "$userData._id",
              name: { $ifNull: ["$userData.name", null] },
              email: { $ifNull: ["$userData.email", null] },
              phone: { $ifNull: ["$userData.phone", null] },
            },
            address: 1,
            city: 1,
            country: 1,
            isGuest: 1,
            isSubscriptionPlaneActive: 1,
            languageCode: 1,
            pincode: 1,
            referralCode: 1,
            referralPoints: 1,
            referredBy: 1,
            state: 1,
            subscriptionExpiresAt: 1,
            wallet_amount: 1,
            profile: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },

        /** PAGINATION — correct way */
        {
          $facet: {
            totalCount: [{ $count: "count" }], // total without pagination
            data: [
              { $sort: { createdAt: -1 } }, // sort inside data pipeline
              { $skip: skip },
              { $limit: limit },
            ],
          },
        },
      ]);

      const data = result[0].data;
      const totalCount = result[0].totalCount[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return createResponseStatus(
        200,
        {
          page,
          limit,
          totalPages,
          base_url: `${process.env.BASE_URL}/uploads/profile/`,
          total: totalCount,
          list: data,
        },
        "partner search successfully"
      );
    } catch (error: any) {
      logger.error(`${error.message} Error when customer sarch plan wise`);
      return createResponseStatus(
        500,
        null,
        error.message || "Error when customer sarch plan wise"
      );
    }
  }

  static async referralCustomerCount(
    payload: any,
    userId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      let { startDate, endDate, plan, searchText, limit, page } = payload;
      searchText = typeof searchText === "string" ? searchText.trim() : "";
      const searchRegex = searchText ? new RegExp(searchText, "i") : /.*/; // match all if empty
      const fromDate = new Date(startDate || "2025-01-15");
      const toDate = new Date(endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      const query: any = {
        createdAt: { $gte: fromDate, $lte: toDate },
        referredBy: { $nin: [null, ""] },
      };

      if (searchText != "") {
        query.$or = [
          { address: { $regex: searchText, $options: "i" } },
          { city: { $regex: searchText, $options: "i" } },
          { state: { $regex: searchText, $options: "i" } },
          { country: { $regex: searchText, $options: "i" } },
          { pincode: { $regex: searchText, $options: "i" } },
          { referralCode: { $regex: searchText, $options: "i" } },
          { "user.name": { $regex: searchText, $options: "i" } },
          { "user.email": { $regex: searchText, $options: "i" } },
          { "user.phone": { $regex: searchText, $options: "i" } },
        ];
      }

      page = Number(page) || 1;
      limit = Number(limit) || 10;
      const skip = (page - 1) * limit;

      const result = await Customer.aggregate([
        /** USER lookup */
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userData",
          },
        },
        { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },

        /** USER SUBSCRIPTION lookup */
        {
          $lookup: {
            from: "usersubscriptions",
            localField: "activeSubscriptionPlan",
            foreignField: "_id",
            as: "userSubscription",
          },
        },
        {
          $unwind: {
            path: "$userSubscription",
            preserveNullAndEmptyArrays: true,
          },
        },

        /** PLAN lookup */
        {
          $lookup: {
            from: "subscriptionplans",
            localField: "userSubscription.subscriptionPlans",
            foreignField: "_id",
            as: "plan",
          },
        },
        { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },

        /** Apply filters */
        { $match: query },
        /** Pre-project for correct counting */
        {
          $project: {
            _id: 1,
            planName: "$plan.name",
            user: {
              _id: "$userData._id",
              name: { $ifNull: ["$userData.name", null] },
              email: { $ifNull: ["$userData.email", null] },
              phone: { $ifNull: ["$userData.phone", null] },
            },
            address: 1,
            city: 1,
            country: 1,
            isGuest: 1,
            isSubscriptionPlaneActive: 1,
            languageCode: 1,
            pincode: 1,
            referralCode: 1,
            referralPoints: 1,
            referredBy: 1,
            state: 1,
            subscriptionExpiresAt: 1,
            wallet_amount: 1,
            profile: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },

        /** PAGINATION — correct way */
        {
          $facet: {
            totalCount: [{ $count: "count" }], // total without pagination
            data: [
              { $sort: { createdAt: -1 } }, // sort inside data pipeline
              { $skip: skip },
              { $limit: limit },
            ],
          },
        },
      ]);

      const data = result[0].data;
      const totalCount = result[0].totalCount[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return createResponseStatus(
        200,
        {
          page,
          limit,
          totalPages,
          base_url: `${process.env.BASE_URL}/uploads/profile/`,
          total: totalCount,
          list: data,
        },
        "partner search successfully"
      );
    } catch (error: any) {
      logger.error(`${error.message} Error when customer sarch plan wise`);
      return createResponseStatus(
        500,
        null,
        error.message || "Error when customer sarch plan wise"
      );
    }
  }

  static async dashboardAllJobStatusWise(
    payload: any,
    userId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      const fromDate = new Date(payload.startDate || "2025-01-15");
      const toDate = new Date(payload.endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      const query: any = { createdAt: { $gte: fromDate, $lte: toDate } };
      const filterAllJobs = await dashboardallJob(query, payload);
      return createResponseStatus(
        200,
        { filterAllJobs },
        "All Pending job fetch successfully"
      );
    } catch (error: any) {
      logger.error(`${error.message} Error when fetching Pening jobs`);
      return createResponseStatus(
        500,
        null,
        error.message || "Error when fetching Pening jobs"
      );
    }
  }

  static async dashboardAllJobSearch(
    payload: any,
    userId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      const { status } = payload;
      const fromDate = new Date(payload.startDate || "2025-01-15");
      const toDate = new Date(payload.endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      const query: any = { createdAt: { $gte: fromDate, $lte: toDate } };

      const allstatus = await allStatusArray();
      if (allstatus.includes(status)) {
        query.status = status;
      }

      const obj = await dashboardallJobSearch(query, payload);
      return createResponseStatus(200, { list: obj }, "Job search successfuly");
    } catch (error: any) {
      logger.error(`${error.message} Error when filter all job `);
      return createResponseStatus(
        500,
        null,
        error.message || "Error when filter all job "
      );
    }
  }

  static async dashboardSurgePricingWiseJobs(
    payload: any,
    userId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      const fromDate = new Date(payload.startDate || "2025-01-15");
      const toDate = new Date(payload.endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      const query: any = {
        createdAt: { $gte: fromDate, $lte: toDate },
        inSurgePrice: true,
      };
      const filterAllJobs = await dashboardallJob(query, payload);
      return createResponseStatus(
        200,
        { filterAllJobs },
        "All Pending job fetch successfully"
      );
    } catch (error: any) {
      logger.error(
        `${error.message} Error when fetching surge pricing wise job count`
      );
      return createResponseStatus(
        500,
        null,
        error.message || "Error when fetching surge pricing wise job count"
      );
    }
  }

  static async dashboardSurgePricingWiseSearch(
    payload: any,
    userId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      const fromDate = new Date(payload.startDate || "2025-01-15");
      const toDate = new Date(payload.endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      const query: any = {
        createdAt: { $gte: fromDate, $lte: toDate },
        inSurgePrice: true,
      };
      const allstatus = await allStatusArray();
      if (allstatus.includes(payload?.status)) {
        query.status = payload?.status;
      }

      const obj = await dashboardallJobSearch(query, payload);
      return createResponseStatus(200, { list: obj }, "Job search successfuly");
    } catch (error: any) {
      logger.error(
        `${error.message} Error when fetching surge pricing wise job`
      );
      return createResponseStatus(
        500,
        null,
        error.message || "Error when fetching surge pricing wise job"
      );
    }
  }

  static async dashboardEmergencyServiceWiseJobs(
    payload: any,
    userId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      const fromDate = new Date(payload.startDate || "2025-01-15");
      const toDate = new Date(payload.endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      const query: any = {
        createdAt: { $gte: fromDate, $lte: toDate },
        isEmergencyService: true,
      };
      const filterAllJobs = await dashboardallJob(query, payload);
      return createResponseStatus(
        200,
        { filterAllJobs },
        "All Pending job fetch successfully"
      );
    } catch (error: any) {
      logger.error(`${error.message} Error when fetching Pening jobs`);
      return createResponseStatus(
        500,
        null,
        error.message || "Error when fetching Pening jobs"
      );
    }
  }

  static async dashboardEmergencyServiceWiseSearch(
    payload: any,
    userId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      const fromDate = new Date(payload.startDate || "2025-01-15");
      const toDate = new Date(payload.endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      const query: any = {
        createdAt: { $gte: fromDate, $lte: toDate },
        isEmergencyService: true,
      };
      const obj = await dashboardallJobSearch(query, payload);
      return createResponseStatus(200, { list: obj }, "Job search successfuly");
    } catch (error: any) {
      logger.error(`${error.message} Error when fetching all job search`);
      return createResponseStatus(
        500,
        null,
        error.message || "Error when fetching all job search "
      );
    }
  }

  static async getJobsGroupedBySubscriptionPlan(
    payload: any,
    userId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      const fromDate = new Date(payload.startDate || "2025-01-15");
      const toDate = new Date(payload.endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      const query: any = { createdAt: { $gte: fromDate, $lte: toDate } };
      const result = await getJobsGroupedBySubscriptionPlan(query, {
        limit: 10,
        page: 1,
      });
      return createResponseStatus(
        200,
        { result },
        "get job subscription plan wise successfully"
      );
    } catch (error: any) {
      logger.error(
        `${error.message} Error when fetching job subscription plan wise`
      );
      return createResponseStatus(
        500,
        null,
        error.message || "Error when fetching job subscription plan wise"
      );
    }
  }

  static async servicesWiseJobs(
    payload: any,
    userId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      let { searchText, sortedByJobCount } = payload;
      searchText = typeof searchText === "string" ? searchText.trim() : "";
      const searchRegex = searchText ? new RegExp(searchText, "i") : /.*/; // match all if empty

      const fromDate = new Date(payload.startDate || "2025-01-15");
      const toDate = new Date(payload.endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      const query: any = {};

      const page = Number(payload.page) || 1;
      const limit = Number(payload.limit) || 10;
      const skip = (page - 1) * limit;

      if (searchText != "") {
        query.$or = [
          { name: { $regex: searchText, $options: "i" } },
          { description: { $regex: searchText, $options: "i" } },
          { metaTitle: { $regex: searchText, $options: "i" } },
          { metaDescripton: { $regex: searchText, $options: "i" } },
          { metaKeyword: { $regex: searchText, $options: "i" } },
          { "category.name": { $regex: searchText, $options: "i" } },
          { "category.description": { $regex: searchText, $options: "i" } },
          { "subcategory.name": { $regex: searchText, $options: "i" } },
          { "subcategory.description": { $regex: searchText, $options: "i" } },
        ];
      }

      const result = await Service.aggregate([
        {
          $lookup: {
            from: "jobs",
            localField: "_id",
            foreignField: "serviceId",
            as: "jobs",
          },
        },
        {
          $lookup: {
            from: "categorytypes",
            localField: "categorytype",
            foreignField: "_id",
            as: "subcategory",
          },
        },
        { $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },

        {
          $addFields: {
            filteredJobs: {
              $filter: {
                input: "$jobs",
                as: "job",
                cond: {
                  $and: [
                    { $gte: ["$$job.createdAt", fromDate] },
                    { $lte: ["$$job.createdAt", toDate] },
                  ],
                },
              },
            },
          },
        },

        {
          $addFields: {
            total_jobs: { $size: "$filteredJobs" },
          },
        },

        { $match: query },
        {
          $project: {
            _id: 1,
            name: 1,
            total_jobs: 1,
            description: 1,
            "category.name": 1,
            "category.description": 1,
            "category.image": 1,
            "subcategory.name": 1,
            "subcategory.description": {
              $ifNull: ["$subcategory.description", null],
            },
            "subcategory.image": 1,
            image: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },

        {
          $facet: {
            totalCount: [{ $count: "count" }], // total without pagination
            data: [
              {
                $sort: {
                  total_jobs: sortedByJobCount === "Ascending" ? 1 : -1,
                },
              }, // sort inside data pipeline
              { $skip: skip },
              { $limit: limit },
            ],
          },
        },
      ]);

      const filterResult = result[0]?.data?.map((service: any) => {
        let image = service?.image
          ? `${process.env.BASE_URL}/uploads/servicesImage/${service?.image}`
          : null;

        return {
          ...service,
          image,
        };
      });

      const data = result[0].data;
      const totalCount = result[0].totalCount[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      let obj = {
        page,
        limit,
        totalPages,
        total: totalCount,
        list: filterResult,
      };

      return createResponseStatus(
        200,
        { services: obj },
        "fetch job service wise"
      );
    } catch (error: any) {
      logger.error(`${error.message} Error when fetching job service wise`);
      return createResponseStatus(
        500,
        null,
        error.message || "Error when fetching job service wise"
      );
    }
  }

  static async jobWiseCustomer(
    payload: any,
    userId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      let { searchText, sortedByJobCount } = payload;
      searchText = typeof searchText === "string" ? searchText.trim() : "";
      const searchRegex = searchText ? new RegExp(searchText, "i") : /.*/; // match all if empty

      const fromDate = new Date(payload.startDate || "2025-01-15");
      const toDate = new Date(payload.endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      const query: any = { "user.role": "customer" };

      const page = Number(payload.page) || 1;
      const limit = Number(payload.limit) || 10;
      const skip = (page - 1) * limit;

      if (searchText != "") {
        query.$or = [
          { "user.name": { $regex: searchText, $options: "i" } },
          { "user.email": { $regex: searchText, $options: "i" } },
          { "user.phoe": { $regex: searchText, $options: "i" } },
          { address: { $regex: searchText, $options: "i" } },
          { city: { $regex: searchText, $options: "i" } },
          { state: { $regex: searchText, $options: "i" } },
          { country: { $regex: searchText, $options: "i" } },
          { pincode: { $regex: searchText, $options: "i" } },
          { referralCode: { $regex: searchText, $options: "i" } },
        ];
      }

      const result = await Customer.aggregate([
        {
          $lookup: {
            from: "jobs",
            localField: "user",
            foreignField: "customerId",
            as: "job",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

        { $match: query },
        {
          $addFields: {
            filteredJobs: {
              $filter: {
                input: "$job",
                as: "job",
                cond: {
                  $and: [
                    { $gte: ["$$job.createdAt", fromDate] },
                    { $lte: ["$$job.createdAt", toDate] },
                  ],
                },
              },
            },
          },
        },
        { $addFields: { total_job: { $size: "$filteredJobs" } } },
        {
          $project: {
            "user._id": 1,
            "user.name": {
              $ifNull: ["$user.name", null],
            },
            "user.email": {
              $ifNull: ["$user.email", null],
            },
            "user.phone": {
              $ifNull: ["$user.phone", null],
            },
            "user.isActive": 1,
            total_job: 1,
            profile: {
              $ifNull: ["$profile", null],
            },
            referralCode: {
              $ifNull: ["$referralCode", null],
            },
            referralPoints: {
              $ifNull: ["$referralPoints", 0],
            },
            languageCode: {
              $ifNull: ["$languageCode", null],
            },
          },
        },
        {
          $facet: {
            totalCount: [{ $count: "count" }],
            data: [
              {
                $sort: { total_job: sortedByJobCount === "Ascending" ? 1 : -1 },
              },
              { $skip: skip },
              { $limit: limit },
            ],
          },
        },
      ]);

      const data = result[0].data;
      const totalCount = result[0].totalCount[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      const filterResult = result[0].data.map((customer: any) => {
        customer.profile = customer?.profile
          ? `${process.env.BASE_URL}/uploads/profile/${customer.profile}`
          : null;
        let customer_basic = customer?.user;
        delete customer.user;
        delete customer._id;
        return {
          ...customer_basic,
          ...customer,
        };
      });
      let obj = {
        page,
        limit,
        totalPages,
        total: totalCount,
        list: filterResult,
      };

      return createResponseStatus(
        200,
        { result: obj },
        "Customers retrieved based on job count"
      );
    } catch (error: any) {
      logger.error(`${error.message} Error when retrieved customer job wise`);
      return createResponseStatus(
        500,
        null,
        error.message || "Error when retrieved customer job wise"
      );
    }
  }

  static async bookingWisePartners(
    payload: any,
    userId: any
  ): Promise<GenericResponseCode<any>> {
    try {
      let { searchText, sortedByJobCount } = payload;
      searchText = typeof searchText === "string" ? searchText.trim() : "";
      const searchRegex = searchText ? new RegExp(searchText, "i") : /.*/; // match all if empty

      const fromDate = new Date(payload.startDate || "2025-01-15");
      const toDate = new Date(payload.endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      const query: any = { "user.role": "partner" };

      const page = Number(payload.page) || 1;
      const limit = Number(payload.limit) || 10;
      const skip = (page - 1) * limit;

      if (searchText != "") {
        query.$or = [
          { "user.name": { $regex: searchText, $options: "i" } },
          { "user.email": { $regex: searchText, $options: "i" } },
          { "user.phoe": { $regex: searchText, $options: "i" } },
          { address: { $regex: searchText, $options: "i" } },
          { city: { $regex: searchText, $options: "i" } },
          { state: { $regex: searchText, $options: "i" } },
          { country: { $regex: searchText, $options: "i" } },
          { pincode: { $regex: searchText, $options: "i" } },
          { referralCode: { $regex: searchText, $options: "i" } },
          { kycStatus: { $regex: searchText, $options: "i" } },
          { serviceAreaDistance: { $regex: searchText, $options: "i" } },
        ];
      }

      const result = await Partner.aggregate([
        {
          $lookup: {
            from: "bookings",
            localField: "user",
            foreignField: "partnerId",
            as: "booking",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

        { $match: query },
        {
          $addFields: {
            filteredJobs: {
              $filter: {
                input: "$booking",
                as: "booking",
                cond: {
                  $and: [
                    { $gte: ["$$booking.createdAt", fromDate] },
                    { $lte: ["$$booking.createdAt", toDate] },
                  ],
                },
              },
            },
          },
        },
        { $addFields: { total_job: { $size: "$filteredJobs" } } },
        {
          $project: {
            "user._id": 1,
            "user.name": {
              $ifNull: ["$user.name", null],
            },
            "user.email": {
              $ifNull: ["$user.email", null],
            },
            "user.phone": {
              $ifNull: ["$user.phone", null],
            },
            "user.isActive": 1,
            profile: {
              $ifNull: ["$profile", null],
            },
            referralCode: {
              $ifNull: ["$referralCode", null],
            },
            referralPoints: {
              $ifNull: ["$referralPoints", 0],
            },
            languageCode: {
              $ifNull: ["$languageCode", null],
            },
            total_job: 1,
          },
        },
        {
          $facet: {
            totalCount: [{ $count: "count" }],
            data: [
              {
                $sort: { total_job: sortedByJobCount === "Ascending" ? 1 : -1 },
              },
              { $skip: skip },
              { $limit: limit },
            ],
          },
        },
      ]);

      const data = result[0].data;
      const totalCount = result[0].totalCount[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      const filterResult = result[0].data.map((partner: any) => {
        partner.profile = partner?.profile
          ? `${process.env.BASE_URL}/uploads/profile/${partner.profile}`
          : null;
        let partner_basic = partner?.user;
        delete partner.user;
        delete partner._id;
        return {
          ...partner_basic,
          ...partner,
        };
      });
      let obj = {
        page,
        limit,
        totalPages,
        total: totalCount,
        list: filterResult,
      };
      return createResponseStatus(
        200,
        { result: obj },
        "Partners retrieved based on Booking count"
      );
    } catch (error: any) {
      logger.error(
        `${error.message} Error when retrieved partners based on booking count`
      );
      return createResponseStatus(
        500,
        null,
        error.message || "Error when retrieved partners based on booking count"
      );
    }
  }

  static async changePaymentGateway(payload: any): Promise<GenericResponseCode<any>> {
    try {
      const { type } = payload;
      if (!type)
        return createResponseStatus(500, null, "Gateway type is required");

      const res = await Setting.findOneAndUpdate(
        { type: "gateway" },
        { $set: { paymentGateway: type } },
        { upsert: true, new: true }
      )
      return createResponseStatus(200, { res }, "Payment gateway change successfully");
    } catch (error: any) {
      logger.error(`${error.message} Error when change payment gatway`);
      return createResponseStatus(500, null, error?.message || "Error when change payment gatway");
    }
  }



  static async searchTransactionList(payload: any, userId: any): Promise<GenericResponseCode<any>> {
    try {
      const { searchText } = payload;
      const fromDate = new Date(payload.startDate || "2025-01-15");
      const toDate = new Date(payload.endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      let query: any = {
        createdAt: { $gte: fromDate, $lte: toDate }, adminId: { $ne: null }
      };
      if ((payload.paymentStatus != "all") && (payload.paymentStatus != undefined)) {
        query.paymentStatus = payload.paymentStatus
      }

      if (["PHONEPE", "RAZORPAY"].includes(payload?.payment_gateway)) {
        query.paymentGateway = payload?.payment_gateway;
      }

      if ((searchText != "") && (searchText != undefined)) {
        query.$or = [
          { paymentMethod: { $regex: searchText, $options: "i" } },
          { transactionId: { $regex: searchText, $options: "i" } },
          { paymentStatus: { $regex: searchText, $options: "i" } },
          { invoiceNo: { $regex: searchText, $options: "i" } },
          { merchantOrderId: { $regex: searchText, $options: "i" } },
          { amount: { $regex: searchText, $options: "i" } },
          { paymentGateway: { $regex: searchText, $options: "i" } },
          // { "user.name": { $regex: searchText, $options: "i" } },
          // { "user.email": { $regex: searchText, $options: "i" } },
          // { "user.phone": { $regex: searchText, $options: "i" } },
        ];
      }

      const filterAllJobs = await searchTransactionList(query, payload);
      return createResponseStatus(
        200,
        { result: filterAllJobs },
        "transaction fetch successfully"
      );
    } catch (error: any) {
      logger.error(`${error.message} Error when fetching transaction list`);
      return createResponseStatus(
        500,
        null,
        error.message || "Error when fetching transaction list"
      );
    }
  }

  static async getPaymentGateway(userId: any): Promise<GenericResponseCode<any>> {
    try {
      const result = await Setting.find({ type: "gateway" });
      return createResponseStatus(200, { result }, "fetch all gateway successfully");
    } catch (error: any) {
      logger.error(`${error.message} Error when fetching gateway list`);
      return createResponseStatus(500, null, error.message || "Error when fetching gateway list")
    }
  }

  static async updatePaymentGateway(payload: any, userId: any): Promise<GenericResponseCode<any>> {
    try {

      const { paymentGateway, mode } = payload;

      let insertObj: any = {
        status: "inactive"
      }

      if (((payload?.isActive) === true) || ((payload?.liveIsActive) === true)) {
        await Setting.updateMany(
          { type: "gateway" },
          {
            $set: insertObj
          }
        )
      }


      if ((paymentGateway == "RAZORPAY") && (mode == "TEST")) {
        insertObj = {
          ...insertObj,
          razorpay_key_id: payload?.testKeyId,
          razorpay_key_secret: payload?.testKeySecret,
          status: payload?.isActive == true ? "active" : "inactive"
        }
      } else if ((paymentGateway == "RAZORPAY") && (mode == "LIVE")) {
        insertObj = {
          ...insertObj,
          razorpay_key_id: payload?.liveKeyId,
          razorpay_key_secret: payload?.liveKeySecret,
          status: payload?.liveIsActive == true ? "active" : "inactive"
        }
      }

      if ((paymentGateway == "PHONEPE") && (mode == "TEST")) {
        insertObj = {
          ...insertObj,
          client_id: payload?.client_id,
          client_secret: payload?.client_secret,
          merchant_user_id: payload?.merchantId,
          base_url: payload?.baseUrl,
          status: payload?.isActive == true ? "active" : "inactive",
        }
      } else if ((paymentGateway == "PHONEPE") && (mode == "LIVE")) {
        insertObj = {
          ...insertObj,
          client_id: payload?.liveClient_id,
          client_secret: payload?.liveClient_secret,
          merchant_user_id: payload?.liveMerchantId,
          base_url: payload?.liveBaseUrl,
          status: payload?.liveIsActive == true ? "active" : "inactive",
        }
      }

      const res = await Setting.findOneAndUpdate(
        { type: "gateway", mode, paymentGateway },
        {
          $set: insertObj
        },
        { upsert: true, new: true }
      )
      const result = await Setting.find({ type: "gateway" });
      return createResponseStatus(200, { result }, "gateway update successfully");
    } catch (error: any) {
      logger.error(`${error.message} Error when update gateway`);
      return createResponseStatus(500, null, error.message || "Error when update gateway")
    }
  }

  static async fetchNsearchMaster(payload: any, userId: any): Promise<GenericResponseCode<any>> {
    try {
      const { startDate, endDate, status, searchText, limit, page, schema } = payload;
      const fromDate = new Date(payload.startDate || "2025-01-15");
      const toDate = new Date(payload.endDate || Date.now());
      toDate.setHours(23, 59, 59, 999);
      let query: any = {
        createdAt: { $gte: fromDate, $lte: toDate }, adminId: { $ne: null }
      };
      const result = await getMasterPagination(query, payload);
      return createResponseStatus(200, { payload, userId }, "fetch record successfully");
    } catch (error: any) {
      logger.error(`${error.message} Error when fetching masters record`);
      return createResponseStatus(500, null, error.message || "Error when fetching master record");
    }
  }

  static async redeemRate(payload: any, userId: any): Promise<GenericResponseCode<any>> {
    try {
      await Setting.updateMany(
        { type: "redeem_rate" },
        {
          $set: { status: "inactive" }
        }
      );
      const res = await Setting.findOneAndUpdate(
        { type: "redeem_rate", redeem_rate: payload?.redeem_rate },
        { $set: { redeem_rate: payload?.redeem_rate, status: "active" } },
        { upsert: true, new: true }
      )
      return createResponseStatus(200, { res }, "Redeem Rate add/update successfully");
    } catch (error: any) {
      return createResponseStatus(500, null, error.message || "Error when add redeem rate");
    }
  }

  static async getRedeemRate(userId: any): Promise<GenericResponseCode<any>> {
    try {
      const res = await Setting.findOne({ type: "redeem_rate", status: "active" });

      return createResponseStatus(200, { result: res }, "Redeem Rate fetch successfully");
    } catch (error: any) {
      return createResponseStatus(500, null, error.message || "Error when fetch redeem rate");
    }
  }

}
