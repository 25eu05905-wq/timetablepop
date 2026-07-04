const mongoose = require('mongoose');

const PeriodSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  startTime: {
    type: String, // format "HH:MM", 24-hour clock
    required: true
  },
  endTime: {
    type: String, // format "HH:MM", 24-hour clock
    required: true
  },
  room: {
    type: String,
    trim: true,
    default: ''
  },
  teacher: {
    type: String,
    trim: true,
    default: ''
  },
  color: {
    type: String,
    default: '#3b82f6' // default accent color
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Period', PeriodSchema);
