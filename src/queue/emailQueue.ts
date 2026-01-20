import Queue from "bull";

const emailQueue = new Queue("email-queue", {
    redis: {
        host: "127.0.0.1",
        port: 6379
    }
});



export async function addPlanExpiryEmails(planExpires: any[]) {
  try {
    console.log(planExpires.length,'length')
    for (const customer of planExpires) {
      // Safety check
      if (!customer?.user?.email) continue;

       console.log(customer,'customer details');
      // 3️⃣ Add job to queue
     
      const job = await emailQueue.add(
        {
          userId: customer.user._id,
          name: customer.user.name,
          email: customer.user.email
        },
        {
          attempts: 3,            // retry 5 times if failed
          backoff: 5000,          // wait 5 sec before retry
          removeOnComplete: true  // auto remove job after success
        }
      ); 

      // 4️⃣ Log job info
      console.log("📥 Email job added", {
        jobId: job.id,
        email: customer.user.email
      });
       
    }
  } catch (error) {
    console.error("❌ Error while adding email jobs:", error);
  }
}

export default emailQueue;
