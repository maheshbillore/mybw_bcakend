import { Request, Response } from "express";
import { AdminService } from "../services/admin.service.js";
import { IPartnerUpdate } from "../shared/interface.js";
import { PartnerService } from "../services/partner.service.js";
import Banner from "../models/banner.model.js";

export class AdminController {
  static async getAllUsers(req: Request, res: Response) {
    const result = await AdminService.getAllUsers();
    res.status(result.success ? 200 : 401).json(result);
  }

  static async updateCustomer(req: Request, res: Response) {
    const { id } = req.params;
    const result = await AdminService.updateUserInfo(id, req.body);
    res.status(result.success ? 200 : 404).json(result);
  }

  static async deactivateUser(req: Request, res: Response) {
    const { id } = req.params;
    const result = await AdminService.deactiveUser(id);
    res.status(result.success ? 200 : 404).json(result);
  }

  static async createComplaint(req: Request, res: Response) {
    const { customerId, bookingId, complainText } = req.body;

    if (!customerId || !bookingId || !complainText) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "All fields are required",
      });
    }

    if (complainText.trim().length < 10) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Complaint text must be at least 10 characters long",
      });
    }

    const result = await AdminService.createComplaint(req.body);
    res.status(result.success ? 201 : 400).json(result);
  }

  static async updateComplaint(req: Request, res: Response) {
    const { id } = req.params;
    const { status, refundApproved } = req.body;

    const result = await AdminService.updateComplaint(id, {
      status,
      refundApproved,
    });

    res.status(result.success ? 200 : 400).json(result);
  }

  static async updatePartnerDetails(req: Request, res: Response) {
    
    const { id } = req.params;

    // Validate ID
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      res.status(400).json({
        success: false,
        data: null,
        message: "Invalid partner ID",
      });
      return;
    }

   

    // Extract data from FormData
    const data: IPartnerUpdate = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      // Only set password if non-empty
      ...(req.body.password && req.body.password.trim().length > 0
        ? { password: req.body.password }
        : {}),
      dob: req.body.dob || undefined,
      address: req.body.address || undefined,
      city: req.body.city || undefined,
      state: req.body.state || undefined,
      country: req.body.country || undefined,
      pinCode: req.body.pinCode || undefined,
      latitude: req.body.latitude || undefined,
      longitude: req.body.longitude || undefined,
      category: req.body.category, // Can be string or string[]
      subCategory: req.body.subCategory, // Can be string or string[]
      categoryType: req.body.categoryType, // Can be string or string[]
      skills: req.body.skills, // Can be string or string[]
    };

    // Extract files from Multer
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;

    // Call the service to update the partner

   
    const result = await AdminService.updatePartner(id, data, files || {});

    // Send response
    res.status(result.success ? 200 : 400).json(result);
  }

  static async getTransactionList(req: Request, res: Response) {
    const adminId = req?.user?._id;
    const payload = req?.query;
    const result = await AdminService.getTransactionList(payload, adminId);
    res.status(result?.status).json(result);
  }

  static async banner(req: Request, res: Response) {
    const adminId = req?.user?._id;
    const payload = req?.body;
    const banner = req.file as Express.Multer.File;
    const files = { banner: [banner] };
    const result = await AdminService.banner(payload, files);
    res.status(result?.status).json(result);
  }

  static async updateBanner(req: Request, res: Response) {
    const { id } = req?.params;
    const payload = req?.body;
    const banner = req?.file as Express.Multer.File;
    const files = { banner: [banner] };
    const result = await AdminService.updateBanner(payload, files, id);
    res.status(result?.status).json(result);
  }

  static async updateBannerStatus(req: Request, res: Response) {
    const { id } = req?.params;
    const result = await AdminService.updateBannerStatus(id);
    res.status(result?.status).json(result);
  }

  static async addReferralCode(req: Request, res: Response) {
    const data = req?.body;
    const result = await AdminService.addReferralCode(data);
    res.status(result?.status).json(result);
  }

  static async logs(req: Request, res: Response) {
    const type = req?.params?.type;
    const result = await AdminService.logs(type);
    res.download(result?.data?.logPath, result?.data?.fileName, (err) => {
      if (err) {
        console.error("❌ Error downloading file:", err);
        res.status(500).json({ message: "Error downloading log file" });
      }
    });
  }

  static async dashboardMaster(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.dashboardMaster(payload, userId);
    res.status(result?.status).json(result);
  }

  static async dashboardPartner(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const role = req?.user?.role;
    const result = await AdminService.dashboardPartner(payload, {
      userId,
      role,
    });
    res.status(result?.status).json(result);
  }

  static async partnerProfileCreateUpdate(req: Request, res: Response) {
    try {
      const partnerId = req.body?.partnerId as string;
      const profile = req.file as Express.Multer.File;
      const files = { profile: [profile] };
      const result = await AdminService.profileCreateUpdate(
        files,
        partnerId,
        req
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Error create or update partner:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Error create or update partner",
      });
    }
  }

  static async partnerSkillsCreateUpdate(req: Request, res: Response) {
    const partnerId = req.body?.partnerId as string;
    if (!partnerId) {
      res.status(404).json({
        success: false,
        data: null,
        message: "Partner Id not found in Request object",
      });
    }
    const files = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };
    const result = await AdminService.skillsCreateUpdate(
      partnerId.toString(),
      files,
      req.body
    );
    res.status(result?.success ? 200 : 404).json(result);
  }

  static async partnerLocationCreateUpdate(req: Request, res: Response) {
    const partnerId = req.body?.partnerId;
    if (!partnerId) {
      res.status(404).json({
        success: false,
        data: null,
        message: "Partner Id not found in Request object",
      });
      return;
    }
    const result = await AdminService.locationCreateUpdate(
      partnerId.toString(),
      req.body
    );
    res.status(result?.success ? 200 : 404).json(result);
  }

  static async partnerDocumentCreateUpdate(req: Request, res: Response) {
    const partnerId = req.body?.partnerId as string;
    if (!partnerId) {
      res.status(404).json({
        success: false,
        data: null,
        message: "Partner Id not found in Request object",
      });
    }

    const files = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    const result = await AdminService.documentCreateUpdate(
      partnerId,
      files,
      req
    );
    res.status(result?.success ? 200 : 404).json(result);
  }

  static async vocationalBanner(req: Request, res: Response) {
    const adminId = req?.user?._id;
    const payload = req?.body;
    const banner = req.file as Express.Multer.File;
    const files = { banner: [banner] };
    const result = await AdminService.vocationalBanner(payload, files);
    res.status(result?.status).json(result);
  }

  static async getVocationalBanner(req: Request, res: Response) {
    const result = await AdminService.getVocationalBanner();
    res.status(result?.status).json(result);
  }

  static async dashboardPartnersSearch(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.dashboardPartnersSearch(payload, userId);
    res.status(result?.status).json(result);
  }

  static async planWiseCustomers(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.planWiseCustomers(payload, userId);
    res.status(result?.status).json(result);
  }

  static async planWiseCustomersSearch(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.planWiseCustomersSearch(payload, userId);
    res.status(result?.status).json(result);
  }

  static async planWisePartnerCount(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.planWisePartnerCount(payload, userId);
    res.status(result?.status).json(result);
  }

  static async planWisePartnerSearch(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.planWisePartnerSearch(payload, userId);
    res.status(result?.status).json(result);
  }

  static async referralCustomerCount(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.referralCustomerCount(payload, userId);
    res.status(result?.status).json(result);
  }

  static async dashboardAllJobStatusWise(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.dashboardAllJobStatusWise(
      payload,
      userId
    );
    res.status(result?.status).json(result);
  }

  static async dashboardAllJobSearch(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.dashboardAllJobSearch(payload, userId);
    res.status(result?.status).json(result);
  }

  static async dashboardSurgePricingWiseJobs(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.dashboardSurgePricingWiseJobs(
      payload,
      userId
    );
    res.status(result?.status).json(result);
  }

  static async dashboardSurgePricingWiseSearch(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.dashboardSurgePricingWiseSearch(
      payload,
      userId
    );
    res.status(result?.status).json(result);
  }

  static async dashboardEmergencyServiceWiseJobs(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.dashboardEmergencyServiceWiseJobs(
      payload,
      userId
    );
    res.status(result?.status).json(result);
  }

  static async dashboardEmergencyServiceWiseSearch(
    req: Request,
    res: Response
  ) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.dashboardEmergencyServiceWiseSearch(
      payload,
      userId
    );
    res.status(result?.status).json(result);
  }

  static async getJobsGroupedBySubscriptionPlan(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.getJobsGroupedBySubscriptionPlan(
      payload,
      userId
    );
    res.status(result?.status).json(result);
  }

  static async servicesWiseJobs(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.servicesWiseJobs(payload, userId);
    res.status(result?.status).json(result);
  }

  static async jobWiseCustomer(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.jobWiseCustomer(payload, userId);
    res.status(result?.status).json(result);
  }

  static async bookingWisePartners(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.bookingWisePartners(payload, userId);
    res.status(result?.status).json(result);
  }

  static async changePaymentGateway(req: Request, res: Response) {
    const payload = req?.query;
    const result = await AdminService.changePaymentGateway(payload);
    res.status(result?.status).json(result);
  }

  static async searchTransactionList(req: Request, res: Response) {
    const payload = req?.query;
    const userId = req?.user?._id;
    const result = await AdminService.searchTransactionList(payload, userId);
    res.status(result?.status).json(result);
  }

  static async getPaymentGateway(req: Request, res: Response) {
    const userId = req?.user?._id;
    const result = await AdminService.getPaymentGateway(userId);
    res.status(result?.status).json(result);
  }

  static async updatePaymentGateway(req: Request, res: Response) {
    const userId = req?.user?._id;
    const payload = req?.body;
    const result = await AdminService.updatePaymentGateway(payload, userId);
    res.status(result?.status).json(result);
  }

  static async fetchNsearchMaster(req:Request,res:Response){
    const userId = req?.user?._id;
    const payload = req?.query;
    const result = await AdminService.fetchNsearchMaster(payload,userId);
    res.status(result?.status).json(result);
  }

  static async redeemRate(req:Request,res:Response){
    const payload = req?.body;
    const userId = req?.user?._id;
    const result = await AdminService.redeemRate(payload,userId);
    res.status(result?.status).json(result);
  }

  static async getRedeemRate(req:Request,res:Response){
    const userId = req?.user?._id;
    const result = await AdminService.getRedeemRate(userId);
    res.status(result?.status).json(result);
  }
}
