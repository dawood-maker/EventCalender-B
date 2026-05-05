const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Event = require("../models/Event");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

// ── Auth Middleware ──────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// ── CREATE EVENT ─────────────────────────────────────────────
router.post("/create", auth, async (req, res) => {
  try {
    const {
      title,
      location,
      startDate,
      endDate,
      time,
      returnTime,
      description,
      eventType,
      attendees,
      birthdayPerson,
      birthdayAge,
      birthdayGift,
      birthdayNote,
      textNote,
      textColor,
    } = req.body;

    const event = await Event.create({
      title,
      location,
      startDate: new Date(startDate),
      endDate: new Date(endDate || startDate),
      time,
      returnTime: returnTime || "",
      description: description || "",
      eventType: eventType || "event",
      attendees: attendees || [],
      birthdayPerson: birthdayPerson || "",
      birthdayAge: birthdayAge || null,
      birthdayGift: birthdayGift || "",
      birthdayNote: birthdayNote || "",
      textNote: textNote || "",
      textColor: textColor || "#10b981",
      createdBy: req.userId,
    });

    res.status(201).json({ message: "Event create ho gaya!", event });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── GET ALL EVENTS (Calendar ke liye) ────────────────────────
router.get("/all", auth, async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.userId }).sort({
      startDate: 1,
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── GET UPCOMING EVENTS ──────────────────────────────────────
router.get("/", auth, async (req, res) => {
  try {
    const events = await Event.find({
      createdBy: req.userId,
      status: "upcoming",
    }).sort({ startDate: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── GET HISTORY ──────────────────────────────────────────────
router.get("/history", auth, async (req, res) => {
  try {
    const events = await Event.find({
      createdBy: req.userId,
      status: "completed",
    }).sort({ startDate: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── GET SINGLE EVENT ─────────────────────────────────────────
router.get("/:id", auth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      createdBy: req.userId,
    });
    if (!event) return res.status(404).json({ message: "Event nahi mila" });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── UPDATE EVENT ─────────────────────────────────────────────
router.put("/:id", auth, async (req, res) => {
  try {
    const {
      title,
      location,
      startDate,
      endDate,
      time,
      returnTime,
      description,
      eventType,
      attendees,
      birthdayPerson,
      birthdayAge,
      birthdayGift,
      birthdayNote,
      textNote,
      textColor,
    } = req.body;

    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.userId },
      {
        title,
        location,
        startDate: new Date(startDate),
        endDate: new Date(endDate || startDate),
        time,
        returnTime: returnTime || "",
        description: description || "",
        eventType: eventType || "event",
        attendees: attendees || [],
        birthdayPerson: birthdayPerson || "",
        birthdayAge: birthdayAge || null,
        birthdayGift: birthdayGift || "",
        birthdayNote: birthdayNote || "",
        textNote: textNote || "",
        textColor: textColor || "#10b981",
      },
      { new: true },
    );

    if (!event) return res.status(404).json({ message: "Event nahi mila" });
    res.json({ message: "Event update ho gaya!", event });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── MARK COMPLETE ────────────────────────────────────────────
router.put("/complete/:id", auth, async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.userId },
      { status: "completed" },
      { new: true },
    );
    if (!event) return res.status(404).json({ message: "Event nahi mila" });
    res.json({ message: "Event complete mark ho gaya!", event });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── UPDATE ATTENDEE STATUS ───────────────────────────────────
router.put("/attendee/:eventId/:attendeeId", auth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      createdBy: req.userId,
    });
    if (!event) return res.status(404).json({ message: "Event nahi mila" });

    const att = event.attendees.id(req.params.attendeeId);
    if (!att) return res.status(404).json({ message: "Attendee nahi mila" });

    att.status = req.body.status;
    await event.save();
    res.json({ message: "Updated", event });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── RSVP ROUTE ───────────────────────────────────────────────
router.get("/rsvp/:eventId/:attendeeId/:response", async (req, res) => {
  try {
    const { eventId, attendeeId, response } = req.params;
    if (!["coming", "not_coming"].includes(response))
      return res.status(400).send("<h2>❌ Invalid response.</h2>");

    const event = await Event.findById(eventId).populate("createdBy");
    if (!event) return res.status(404).send("<h2>❌ Event nahi mila.</h2>");

    const att = event.attendees.id(attendeeId);
    if (!att) return res.status(404).send("<h2>❌ Attendee nahi mila.</h2>");

    att.status = response;
    await event.save();

    const admin = event.createdBy;
    if (admin?.email) {
      const statusText = response === "coming" ? "✅ Coming" : "❌ Not Coming";
      const statusColor = response === "coming" ? "#16a34a" : "#dc2626";
      const attendeeRows = event.attendees
        .map((a) => {
          const sColor =
            a.status === "coming"
              ? "#16a34a"
              : a.status === "late"
                ? "#d97706"
                : "#dc2626";
          const sLabel =
            a.status === "coming"
              ? "✅ Coming"
              : a.status === "late"
                ? "⏳ Late"
                : "❌ Not Coming";
          const bold =
            a._id.toString() === attendeeId
              ? "font-weight:bold;background:#fef9c3;"
              : "";
          return `<tr style="${bold}">
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${a.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${a.email}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:${sColor};font-weight:600;">${sLabel}</td>
        </tr>`;
        })
        .join("");

      await sendEmail({
        to: admin.email,
        subject: `📬 RSVP Update: ${att.name} → ${statusText} | ${event.title}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;
            border:1px solid #e5e7eb;border-radius:14px;">
            <h2 style="color:#4f46e5;">📬 RSVP Update</h2>
            <p style="color:#6b7280;">Someone responded to your event invitation.</p>
            <div style="background:#f9fafb;border-radius:10px;padding:16px;margin:16px 0;">
              <p><strong>👤 Name:</strong> ${att.name}</p>
              <p><strong>📧 Email:</strong> ${att.email}</p>
              <p><strong>📌 Event:</strong> ${event.title}</p>
              <p><strong>📅 Date:</strong> ${new Date(event.startDate || event.date).toDateString()}</p>
              <p><strong>Response:</strong>
                <span style="color:${statusColor};font-weight:700;">${statusText}</span></p>
            </div>
            <h3>👥 Full Attendee List</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <thead><tr style="background:#f3f4f6;">
                <th style="padding:10px 12px;text-align:left;">Name</th>
                <th style="padding:10px 12px;text-align:left;">Email</th>
                <th style="padding:10px 12px;text-align:left;">Status</th>
              </tr></thead>
              <tbody>${attendeeRows}</tbody>
            </table>
          </div>`,
      });
    }

    const emoji = response === "coming" ? "🎉" : "😢";
    const msgText =
      response === "coming"
        ? "Think you! Your answer has been recorded."
        : "Your answer has been recorded. You will be missed!";
    const bgColor = response === "coming" ? "#f0fdf4" : "#fef2f2";
    const hColor = response === "coming" ? "#16a34a" : "#dc2626";

    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <title>RSVP Confirmed</title>
      <style>body{font-family:Arial,sans-serif;background:${bgColor};display:flex;
        align-items:center;justify-content:center;min-height:100vh;margin:0;}
      .card{background:white;border-radius:20px;padding:40px 32px;max-width:400px;
        width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.1);}
      h1{color:${hColor};font-size:2.5rem;margin:0;}
      h2{color:#1f2937;margin:12px 0 8px;}p{color:#6b7280;line-height:1.6;}
      .event-box{background:#f9fafb;border-radius:12px;padding:14px;margin:20px 0;text-align:left;}
      .event-box p{margin:4px 0;color:#374151;font-size:14px;}</style></head>
      <body><div class="card">
        <h1>${emoji}</h1><h2>Response recorded!</h2><p>${msgText}</p>
        <div class="event-box">
          <p><strong>📌 Event:</strong> ${event.title}</p>
          <p><strong>📅 Date:</strong> ${new Date(event.startDate || event.date).toDateString()}</p>
          <p><strong>⏰ Time:</strong> ${event.time}</p>
          <p><strong>📍 Location:</strong> ${event.location}</p>
        </div>
        <p style="font-size:13px;color:#9ca3af;">It can bend the window.</p>
      </div></body></html>`);
  } catch (err) {
    res.status(500).send("<h2>❌ Something will happen.</h2>");
  }
});

// ── SEND INVITES ─────────────────────────────────────────────
router.post("/send-invites/:id", auth, async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      createdBy: req.userId,
    });
    if (!event) return res.status(404).json({ message: "Event nahi mila" });

    const user = await User.findById(req.userId);
    const baseUrl = process.env.BASE_URL || "http://localhost:5000";

    await Promise.all(
      event.attendees.map((att) => {
        const yesLink = `${baseUrl}/api/events/rsvp/${event._id}/${att._id}/coming`;
        const noLink = `${baseUrl}/api/events/rsvp/${event._id}/${att._id}/not_coming`;

        // Date range display for email
        const startStr = new Date(event.startDate || event.date).toDateString();
        const endStr = event.endDate
          ? new Date(event.endDate).toDateString()
          : startStr;
        const dateRange =
          startStr === endStr ? startStr : `${startStr} → ${endStr}`;

        return sendEmail({
          to: att.email,
          subject: `📅 Invitation: ${event.title} — Please RSVP`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;
              border:1px solid #e5e7eb;border-radius:14px;">
              <h2 style="color:#4f46e5;">📅You've been invited!</h2>
              <p>Hello <strong>${att.name}</strong>,</p>
              <p><strong>${user.name || user.email}</strong> has invited you:</p>
              <div style="background:#f9fafb;border-radius:12px;padding:16px;margin:16px 0;">
                <h3 style="margin:0 0 12px;color:#1f2937;">${event.title}</h3>
                <p>📍 ${event.location}</p>
                <p>📅 ${dateRange}</p>
                <p>⏰ ${event.time}</p>
                ${event.description ? `<p>📝 ${event.description}</p>` : ""}
                ${
                  event.eventType === "birthday" && event.birthdayPerson
                    ? `<p>🎂 ${event.birthdayPerson} ka Birthday!</p>`
                    : ""
                }
              </div>
              <div style="display:flex;gap:12px;margin-bottom:24px;">
                <a href="${yesLink}" style="flex:1;display:block;text-align:center;padding:14px 0;
                  background:#16a34a;color:white;font-size:16px;font-weight:700;border-radius:10px;
                  text-decoration:none;"> Yes, I'm coming!</a>
                <a href="${noLink}" style="flex:1;display:block;text-align:center;padding:14px 0;
                  background:#dc2626;color:white;font-size:16px;font-weight:700;border-radius:10px;
                  text-decoration:none;"> Can't come</a>
              </div>
              <p style="color:#6b7280;font-size:13px;">
                Organized by: <strong>${user.name || user.email}</strong>
              </p>
            </div>`,
        });
      }),
    );

    res.json({
      message: `${event.attendees.length} Send invitations to Atindis`,
    });
  } catch (err) {
    res.status(500).json({ message: "Email error", error: err.message });
  }
});

// ── DELETE EVENT ─────────────────────────────────────────────
router.delete("/:id", auth, async (req, res) => {
  try {
    await Event.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.userId,
    });
    res.json({ message: "The event was deleted." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
