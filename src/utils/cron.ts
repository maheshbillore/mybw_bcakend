import cron from "node-cron";
import logger from "../utils/logger.js";
import { markExpiredJobs } from "./comman.js";
import Customer from "../models/customer.model.js";
 

export async function startCronJob(){
// Schedule job: daily executed at 1:00 AM
cron.schedule("0 1 * * *", () => {
  markExpiredJobs(); 
},
  {
    timezone: "Asia/Kolkata",
  }); 
}


export async function subscriptionNearbyExpire(){
  const now = new Date();
const next7Days = new Date();
next7Days.setDate(now.getDate() + 319);
console.log(next7Days,'next7Days'); 
const expiringCustomers = await Customer.find({
  subscriptionExpiresAt: {
    $gte: now,
    $lte: next7Days
  }
}); 
console.log(expiringCustomers);
return expiringCustomers
}