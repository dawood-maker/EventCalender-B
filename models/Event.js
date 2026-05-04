const mongoose = require("mongoose");

const attendeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  status: {
    type: String,
    enum: ["coming", "not_coming", "late"],
    default: "coming",
  },
});

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    location: { type: String, required: true },
    startDate: { type: Date, required: true }, // ← startDate
    endDate: { type: Date, required: true }, // ← endDate
    time: { type: String, required: true },
    returnTime: { type: String, default: "" },
    description: { type: String, default: "" },
    eventType: {
      type: String,
      enum: ["event", "text", "birthday", "home", "outside"],
      default: "event",
    },
    // ── Birthday ke liye extra fields ──────────────────────
    birthdayPerson: { type: String, default: "" },
    birthdayAge: { type: Number, default: null },
    birthdayGift: { type: String, default: "" },
    birthdayNote: { type: String, default: "" },
    // ── Text/Note type ke liye ─────────────────────────────
    textNote: { type: String, default: "" },
    textColor: { type: String, default: "#10b981" },
    attendees: [attendeeSchema],
    status: {
      type: String,
      enum: ["upcoming", "completed"],
      default: "upcoming",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Event", eventSchema);
