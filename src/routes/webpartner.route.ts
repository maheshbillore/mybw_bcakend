import express, { RequestHandler } from "express";
import { authMiddleware, authorize } from "../middlewares/auth.middleware.js";
import { WebPartnerController } from "../controllers/webpartner.controller.js";
import { upload, uploadAny, uploadSingle } from "../config/multer.config.js";
import multer from "multer";
import { auth } from "google-auth-library";

const router = express.Router();

router.get(
    "/getPartners",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    WebPartnerController.getPartners
);

router.post(
    "/upload-docs",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    (req, res, next) => {
        upload(req, res, (err: any) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({
                    success: false,
                    message: `Upload error: ${err.message}`,
                });
            } else if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message,
                });
            }
            next();
        });
    },
    WebPartnerController.uploadDocs as RequestHandler
);

router.put(
    "/updateSkills/partnerId/:partnerId/skillId/:skillId",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    WebPartnerController.updatePartnersSkill as RequestHandler
);

router.get(
    "/getPartner/:id",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    WebPartnerController.getPartner as RequestHandler
);


router.post("/signUpByNumber",
    WebPartnerController.signUpByNumber as RequestHandler
)

// router.post("/otpVerification",
//     WebPartnerController.otpVerification as RequestHandler
// )
//
// 
// ============================== contact us form

router.post("/contact", WebPartnerController.submitContactForm as RequestHandler)



router.post("/validatePhone",
    WebPartnerController.validatePhone as RequestHandler
);

router.post("/validateEmail",
    WebPartnerController.validateEmail as RequestHandler
);

//===================== web ==================

router.post('/webotpVerification', WebPartnerController.webotpVerification as RequestHandler);

router.post("/profileUpdate",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    uploadSingle.single('profile') as RequestHandler,
    WebPartnerController.profileUpdate as RequestHandler
)

router.post("/workLocationUpdate",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    WebPartnerController.workLocationUpdate as RequestHandler
)

router.post("/update-today-working-Status",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    WebPartnerController.updateOnlineStatus as RequestHandler
)

router.post("/updateLiveLocation",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    WebPartnerController.updateLiveLocation as RequestHandler
)

router.post("/partnerSkills",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    (req, res, next) => {
        uploadAny(req, res, (err: any) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({
                    success: false,
                    message: `Upload error: ${err.message}`,
                });
            } else if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message,
                });
            }
            next();
        });
    },
    WebPartnerController.partnerSkills as RequestHandler
)

router.get("/getPartnerSkills",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    WebPartnerController.getPartnerSkills as RequestHandler
)

router.get("/matchingJobs",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    WebPartnerController.matchingJobs as RequestHandler
)

router.get("/getServices",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    WebPartnerController.getServices as RequestHandler
)

router.post("/getServicesByCategory",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    WebPartnerController.getServicesByCategory as RequestHandler
)

router.post("/uploadPartnerDocuments",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    (req, res, next) => {
        upload(req, res, (err: any) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({
                    success: false,
                    message: `Upload error: ${err.message}`,
                });
            } else if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message,
                });
            }
            next();
        });
    },
    WebPartnerController.uploadPartnerDocuments as RequestHandler
)

router.post("/userVerifyWithFirebase",
    WebPartnerController.verifyUser as RequestHandler
)

router.post("/login",
    WebPartnerController.login as RequestHandler
)

router.post("/partnerSignup",
    WebPartnerController.partnerSignup as RequestHandler
)

router.get("/get-subscription-plans",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    WebPartnerController.getSubscriptionPlans as RequestHandler
)

router.get("/get-years-experience",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    WebPartnerController.getYearsExperience as RequestHandler
)

router.get(
    "/get-pending-partners",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    WebPartnerController.getPendingPartners
);

router.post(
    "/partner-kyc-status",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    WebPartnerController.partnerKycStatus,
);

router.post("/partner-google-auth",
    WebPartnerController.googleVerification as RequestHandler,
)

router.get("/get-kyc-faild-partners",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    WebPartnerController.getKycFaildPartner

)

router.get("/get-profile",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    WebPartnerController.getProfile
)

router.get("/waiting-for-approval",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    WebPartnerController.waitingForApproval
)
router.get("/get-incoming-requests",
    authMiddleware as RequestHandler,
    authorize("admin") as RequestHandler,
    WebPartnerController.incomingRequests
)

router.post("/add-subscription-plan",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    WebPartnerController.addSubscriptionPlans
)

router.get("/booked-customers",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    WebPartnerController.bookedCustomers
)

router.post("/subscription-without-code",
    authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    WebPartnerController.subscriptionWithoutCode
)
 
router.post("/web-partner-subscription-pay-now",
    authMiddleware as RequestHandler,
    authorize("admin","partner") as RequestHandler,
    WebPartnerController.partnerWebSubscriptionPayNow
)

router.post("/web-partner-subscription-payment-status",
     authMiddleware as RequestHandler,
    authorize("admin", "partner") as RequestHandler,
    WebPartnerController.fetchSubscriptionPaymentstatus
)



export default router;
