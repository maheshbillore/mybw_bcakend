import nodemailer from "nodemailer";

export default function transporterInstance() {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "maheshbillore1992@gmail.com",
            pass: "hpjf zzkt jbyl yaqf"
        }
    });
    return transporter;
}