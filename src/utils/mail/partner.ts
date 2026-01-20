import transporterInstance from "../../config/mail.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Wallet from "../../models/wallet.model.js";
import UserSubscription from "../../models/user.subscription.model.js";
import Booking from "../../models/booking.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseUrl = "https://bharatworker.com/";

const partnerTemplate = path.join(
    path.join(process.cwd(), "src"),
    "templates/partner"
); 

export const email_date_time = () => {
    const date = new Date().toLocaleString('sv-SE', {
        timeZone: 'Asia/Kolkata'
    }).replace('T', ' ');

    return { date, copyright: "2025" };
}

export const getWalletUser = async (orderId: any) => {
    const result: any = await Wallet.findOne({ merchantOrderId: orderId }).populate("partnerId");
    return result;
}

export const getSuscriptionUser = async (orderId: any) => {
    const result: any = await UserSubscription.findOne({ merchantOrderId: orderId }).populate("userId").populate("subscriptionPlans");
    return result;
}

export const getBookingUser = async (bookingId:any) =>{
    const result:any = await Booking.findOne({_id:bookingId})
    .populate("jobId")
    .populate("partnerId")
    return result;
}

export async function welcome(data: any) {
    const transporter = await transporterInstance();
    // const filePath = path.join(__dirname, "../../templates/customer/welcome.html");
    const filePath = `${partnerTemplate}/welcome.html`;
    let html = fs.readFileSync(filePath, "utf8");
    let dateObj = await email_date_time();
    html = html
        .replace("{{USER_NAME}}", data?.name)
        .replace("{{COPY_YEAR}}", dateObj?.copyright)
        .replace("{{YEAR}}", dateObj?.date);

    return transporter.sendMail({
        from: `"Bharat Workers" <no-reply@bharatworker.com>`,
        to: data.email,
        subject: "Welcome to bharat worker",
        html
    });
}

export async function wallet_recharge_successfully(merchantOrderId: any) {
    const transporter = await transporterInstance();
    const filePath = `${partnerTemplate}/wallet_recharge_successfully.html`;

    console.log(filePath, 'wallet successfully file path');
    let html = fs.readFileSync(filePath, "utf8");
    let dateObj = await email_date_time();
    let response = await getWalletUser(merchantOrderId);
    if (!response) return "trnasction record not found";

    html = html
        .replace("{{USER_NAME}}", response?.partnerId?.name)
        .replace("{{AMOUNT}}", response?.amount)
        .replace("{{INVOICE_NO}}", response?.invoiceNo)
        .replace("{{ORDER_ID}}", response?.orderId)
        .replace("{{TRANSACTION_ID}}", response?.transactionId)
        .replace("{{PAYMENT_METHOD}}", response?.paymentMethod)
        .replace("{{DASHBOARD_URL}}", `${baseUrl}registration`) // data.dashboardUrl
        .replace("{{COPY_YEAR}}", dateObj?.copyright)
        .replace("{{YEAR}}", dateObj?.date);

    return transporter.sendMail({
        from: `"Bharat Workers" <no-reply@bharatworker.com>`,
        to: response?.partnerId?.email,
        subject: "wallet recharge successfully",
        html
    });
}

export async function wallet_recharge_pending(merchantOrderId: any) {
    const transporter = await transporterInstance();
    const filePath = `${partnerTemplate}/wallet_recharge_pending.html`;
    let html = fs.readFileSync(filePath, "utf8");
    let dateObj = await email_date_time();
    let response = await getWalletUser(merchantOrderId);
    if (!response) return "trnasction record not found";

    html = html
        .replace("{{USER_NAME}}", response?.partnerId?.name)
        .replace("{{AMOUNT}}", response.amount)
        .replace("{{ORDER_ID}}", response.orderId)
        .replace("{{INVOICE_NO}}", response.invoiceNo)
        .replace("{{DASHBOARD_URL}}", `${baseUrl}registration`) // data.dashboardUrl
        .replace("{{COPY_YEAR}}", dateObj?.copyright)
        .replace("{{YEAR}}", dateObj?.date);

    return transporter.sendMail({
        from: `"Bharat Workers" <no-reply@bharatworker.com>`,
        to: response?.partnerId?.email,
        subject: "wallet recharge pending",
        html
    });
}




export async function wallet_recharge_failed(merchantOrderId: any) {
    const transporter = await transporterInstance();
    const filePath = `${partnerTemplate}/wallet_recharge_failed.html`;
    let html = fs.readFileSync(filePath, "utf8");
    let dateObj = await email_date_time();

    let response = await getWalletUser(merchantOrderId);
    if (!response) return "trnasction record not found";

    html = html
        .replace("{{USER_NAME}}", response?.partnerId?.name)
        .replace("{{AMOUNT}}", response?.amount)
        .replace("{{ORDER_ID}}", response?.orderId)
        .replace("{{INVOICE_NO}}", response?.invoiceNo)
        .replace("{{DASHBOARD_URL}}", `${baseUrl}registration`) // data.dashboardUrl
        .replace("{{COPY_YEAR}}", dateObj?.copyright)
        .replace("{{YEAR}}", dateObj?.date);

    return transporter.sendMail({
        from: `"Bharat Workers" <no-reply@bharatworker.com>`,
        to: response?.partnerId?.email,
        subject: "wallet recharge failed",
        html
    });
}

export async function subscription_plan_pending(merchantOrderId: any) {
    const transporter = await transporterInstance();
    const filePath = `${partnerTemplate}/subscription_plan_pending.html`;
    let html = fs.readFileSync(filePath, "utf8");
    let dateObj = await email_date_time();
    let response = await getSuscriptionUser(merchantOrderId);
    if (!response) return "No active subscription found";

    if(!response?.userId?.email){
        return "Email not found";
    }

    html = html
        .replace("{{USER_NAME}}", response?.userId?.name)
        .replace("{{AMOUNT}}", response.payableAmount)
        .replace("{{ORDER_ID}}", response.merchantOrderId)
        .replace("{{INVOICE_NO}}", response.invoiceNo)
        .replace("{{DASHBOARD_URL}}", `${baseUrl}registration`) // data.dashboardUrl
        .replace("{{COPY_YEAR}}", dateObj?.copyright)
        .replace("{{YEAR}}", dateObj?.date);

    return transporter.sendMail({
        from: `"Bharat Workers" <no-reply@bharatworker.com>`,
        to: response?.userId?.email,
        subject: "subscription plan pending",
        html
    });
}

export async function subscription_plan_failed(merchantOrderId: any) {
    const transporter = await transporterInstance();
    const filePath = `${partnerTemplate}/subscription_plan_failed.html`;
    let html = fs.readFileSync(filePath, "utf8");
    let dateObj = await email_date_time();
    let response = await getSuscriptionUser(merchantOrderId);
    if (!response) return "No active subscription found";

    html = html
        .replace("{{USER_NAME}}", response?.userId?.name)
        .replace("{{AMOUNT}}", response.payableAmount)
        .replace("{{ORDER_ID}}", response.merchantOrderId)
        .replace("{{INVOICE_NO}}", response.invoiceNo)
        .replace("{{DASHBOARD_URL}}", `${baseUrl}registration`) // data.dashboardUrl
        .replace("{{COPY_YEAR}}", dateObj?.copyright)
        .replace("{{YEAR}}", dateObj?.date);

    return transporter.sendMail({
        from: `"Bharat Workers" <no-reply@bharatworker.com>`,
        to: response?.userId?.email,
        subject: "subscription plan failed",
        html
    });
}

export async function subscription_plan_expire(data: any) {
    const transporter = await transporterInstance();
    const filePath = `${partnerTemplate}/subscription_plan_expire.html`;
    let html = fs.readFileSync(filePath, "utf8");
    let dateObj = await email_date_time();

    html = html
        .replace("{{USER_NAME}}", data.name)
        .replace("{{PLAN_NAME}}", data.plan_name)
        .replace("{{SUBSCRIPTION_ID}}", data.subscription_id)
        .replace("{{START_DATE}}", data.start_date)
        .replace("{{END_DATE}}", data.end_date)
        .replace("{{REMAINING_DAYS}}", data.remainingDays)
        .replace("{{DASHBOARD_URL}}", `${baseUrl}registration`) // data.dashboardUrl
        .replace("{{COPY_YEAR}}", dateObj?.copyright)
        .replace("{{YEAR}}", dateObj?.date);

    return transporter.sendMail({
        from: `"Bharat Workers" <no-reply@bharatworker.com>`,
        to: data.email,
        subject: "subscription plan expire soon",
        html
    });
}

export async function subscription_plan_added(merchantOrderId: any) {
    const transporter = await transporterInstance();
    const filePath = `${partnerTemplate}/subscription_plan_added.html`;
    let html = fs.readFileSync(filePath, "utf8");
    let dateObj = await email_date_time(); 
    let response = await getSuscriptionUser(merchantOrderId);
    if (!response) return "No active subscription found";

    html = html
        .replace("{{USER_NAME}}", response?.userId?.name)
        .replace("{{PLAN_NAME}}", response?.subscriptionPlans?.name)
        .replace("{{SUBSCRIPTION_ID}}", response?.subscriptionPlans?._id)
        .replace("{{END_DATE}}", response.endDate)
        .replace("{{START_DATE}}", response.startDate)
        .replace("{{DASHBOARD_URL}}", `${baseUrl}registration`) // data.dashboardUrl
        .replace("{{COPY_YEAR}}", dateObj?.copyright)
        .replace("{{YEAR}}", dateObj?.date);

    return transporter.sendMail({
        from: `"Bharat Workers" <no-reply@bharatworker.com>`,
        to: response?.userId?.email,
        subject: "subscription plan added successfully",
        html
    });
}

export async function job_complete_partner(bookingId:any) {
    const transporter = await transporterInstance();
    const filePath = `${partnerTemplate}/job_completed.html`;
    let html = fs.readFileSync(filePath, "utf8");
    let dateObj = await email_date_time();
    let response = await getBookingUser(bookingId);
    if(!response) return "No Booking Found";
    html = html
        .replace("{{USER_NAME}}", response?.partnerId?.name)
        .replace("{{JOB_ID}}", response?.jobId?._id)
        .replace("{{JOB_TITLE}}", response?.jobId?.title)
        .replace("{{EARNED_AMOUNT_SMALL}}",response?.totalAmount)
        .replace("{{EARNED_AMOUNT}}",response?.totalAmount)
        .replace("{{DASHBOARD_URL}}", `${baseUrl}registration`) // data.dashboardUrl
        .replace("{{COPY_YEAR}}", dateObj?.copyright)
        .replace("{{RATING_URL}}", baseUrl)
        .replace("{{YEAR}}", dateObj?.date);

    return transporter.sendMail({
        from: `"Bharat Workers" <no-reply@bharatworker.com>`,
        to: response?.partnerId?.email,
        subject: "Congratulation you have complete job",
        html
    });
}