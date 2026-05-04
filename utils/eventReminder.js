const cron      = require("node-cron");
const Event     = require("../models/Event");
const sendEmail = require("./sendEmail");

const startEventReminder = () => {
  // Har roz subah 9 baje chalega
  cron.schedule("0 9 * * *", async () => {
    console.log(" Checking tomorrow's events...");
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const start = new Date(tomorrow); start.setHours(0,  0,  0, 0);
      const end   = new Date(tomorrow); end.setHours(23, 59, 59, 999);

      const events = await Event.find({
        date:   { $gte: start, $lte: end },
        status: "upcoming",
      }).populate("createdBy");

      for (const event of events) {
        const user = event.createdBy;
        if (!user?.email) continue;

        await sendEmail({
          to:      user.email,
          subject: `⏰ Kal ka event: "${event.title}"`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;
                        padding:20px;border:1px solid #e5e7eb;border-radius:12px;">
              <h2 style="color:#f59e0b;">⏰ Event Reminder</h2>
              <p>Hello <strong>${user.name || "there"}</strong>,</p>
              <p>Kal tumhara ek event hai!</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <tr style="background:#fef3c7;">
                  <td style="padding:10px;font-weight:bold;">📌 Event</td>
                  <td style="padding:10px;">${event.title}</td>
                </tr>
                <tr>
                  <td style="padding:10px;font-weight:bold;">📍 Location</td>
                  <td style="padding:10px;">${event.location}</td>
                </tr>
                <tr style="background:#fef3c7;">
                  <td style="padding:10px;font-weight:bold;">📅 Date</td>
                  <td style="padding:10px;">${new Date(event.date).toDateString()}</td>
                </tr>
                <tr>
                  <td style="padding:10px;font-weight:bold;">⏰ Time</td>
                  <td style="padding:10px;">${event.time}</td>
                </tr>
                ${event.returnTime ? `
                <tr style="background:#fef3c7;">
                  <td style="padding:10px;font-weight:bold;">🔄 Return</td>
                  <td style="padding:10px;">${event.returnTime}</td>
                </tr>` : ""}
                <tr>
                  <td style="padding:10px;font-weight:bold;">👥 Attendees</td>
                  <td style="padding:10px;">${event.attendees.length} log</td>
                </tr>
              </table>
            </div>
          `,
        });
        console.log(` Reminder sent → ${user.email}`);
      }
    } catch (err) {
      console.error(" Reminder error:", err.message);
    }
  });

  console.log(" Event reminder cron started (daily 9 AM)");
};

module.exports = startEventReminder;