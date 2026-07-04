const express = require('express');
const router = express.Router();
const Period = require('../models/Period');
const { protect } = require('../middleware/authMiddleware');

// Validate time format (HH:MM)
const isValidTime = (timeStr) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeStr);
};

// Validate day of the week
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const isValidDay = (dayStr) => {
  if (!dayStr) return false;
  const normalized = dayStr.trim().charAt(0).toUpperCase() + dayStr.trim().slice(1).toLowerCase();
  return daysOfWeek.includes(normalized);
};

// Normalize day capitalization
const normalizeDay = (dayStr) => {
  return dayStr.trim().charAt(0).toUpperCase() + dayStr.trim().slice(1).toLowerCase();
};

// @desc    Get user timetable
// @route   GET /api/timetable
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const periods = await Period.find({ user: req.user.id }).sort({ startTime: 1 });
    res.json(periods);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching timetable' });
  }
});

// @desc    Add a period to timetable
// @route   POST /api/timetable
// @access  Private
router.post('/', protect, async (req, res) => {
  const { day, subject, startTime, endTime, room, teacher, color } = req.body;

  try {
    if (!day || !subject || !startTime || !endTime) {
      return res.status(400).json({ message: 'Please provide all required fields (day, subject, startTime, endTime)' });
    }

    if (!isValidDay(day)) {
      return res.status(400).json({ message: 'Invalid day of the week' });
    }

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return res.status(400).json({ message: 'Invalid time format. Use HH:MM (24h)' });
    }

    const period = await Period.create({
      user: req.user.id,
      day: normalizeDay(day),
      subject,
      startTime,
      endTime,
      room: room || '',
      teacher: teacher || '',
      color: color || '#3b82f6'
    });

    res.status(201).json(period);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating period' });
  }
});

// @desc    Update a period
// @route   PUT /api/timetable/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  const { day, subject, startTime, endTime, room, teacher, color } = req.body;

  try {
    let period = await Period.findById(req.params.id);

    if (!period) {
      return res.status(404).json({ message: 'Period not found' });
    }

    // Make sure user owns the period
    if (period.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (day && !isValidDay(day)) {
      return res.status(400).json({ message: 'Invalid day of the week' });
    }
    if (startTime && !isValidTime(startTime)) {
      return res.status(400).json({ message: 'Invalid startTime format. Use HH:MM' });
    }
    if (endTime && !isValidTime(endTime)) {
      return res.status(400).json({ message: 'Invalid endTime format. Use HH:MM' });
    }

    period = await Period.findByIdAndUpdate(
      req.params.id,
      {
        day: day ? normalizeDay(day) : period.day,
        subject: subject !== undefined ? subject : period.subject,
        startTime: startTime || period.startTime,
        endTime: endTime || period.endTime,
        room: room !== undefined ? room : period.room,
        teacher: teacher !== undefined ? teacher : period.teacher,
        color: color || period.color
      },
      { new: true }
    );

    res.json(period);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating period' });
  }
});

// @desc    Delete a period
// @route   DELETE /api/timetable/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const period = await Period.findById(req.params.id);

    if (!period) {
      return res.status(404).json({ message: 'Period not found' });
    }

    // Make sure user owns the period
    if (period.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await period.deleteOne();

    res.json({ message: 'Period removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting period' });
  }
});

// @desc    Upload / batch import periods (replaces or appends)
// @route   POST /api/timetable/upload
// @access  Private
router.post('/upload', protect, async (req, res) => {
  const { type, data, overwrite } = req.body;

  try {
    let rawPeriods = [];

    if (type === 'json') {
      // JSON format is expected to be an array of objects
      rawPeriods = Array.isArray(data) ? data : JSON.parse(data);
    } else if (type === 'csv') {
      if (typeof data !== 'string') {
        return res.status(400).json({ message: 'CSV data must be a string' });
      }

      // Simple CSV parser
      const lines = data.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
        return res.status(400).json({ message: 'CSV must contain headers and at least one data row' });
      }

      // Extract headers and map to keys
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[\s_]+/g, ''));
      
      // We expect headers: day, subject, starttime, endtime, room, teacher, color (some can be optional)
      const dayIdx = headers.indexOf('day');
      const subjectIdx = headers.indexOf('subject');
      const startIdx = headers.indexOf('starttime');
      const endIdx = headers.indexOf('endtime');
      const roomIdx = headers.indexOf('room');
      const teacherIdx = headers.indexOf('teacher');
      const colorIdx = headers.indexOf('color');

      if (dayIdx === -1 || subjectIdx === -1 || startIdx === -1 || endIdx === -1) {
        return res.status(400).json({ 
          message: `Missing required CSV headers. Found: ${lines[0]}. Required: Day, Subject, Start Time, End Time` 
        });
      }

      for (let i = 1; i < lines.length; i++) {
        // Split by comma, taking into account simple quoted fields if needed
        // Since we assume standard CSV, we split by comma.
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < Math.max(dayIdx, subjectIdx, startIdx, endIdx) + 1) {
          continue; // skip malformed lines
        }

        rawPeriods.push({
          day: cols[dayIdx],
          subject: cols[subjectIdx],
          startTime: cols[startIdx],
          endTime: cols[endIdx],
          room: roomIdx !== -1 ? cols[roomIdx] : '',
          teacher: teacherIdx !== -1 ? cols[teacherIdx] : '',
          color: colorIdx !== -1 && cols[colorIdx] ? cols[colorIdx] : '#3b82f6'
        });
      }
    } else {
      return res.status(400).json({ message: 'Invalid upload type. Must be json or csv.' });
    }

    // Validate all items before inserting
    const validatedPeriods = [];
    for (const item of rawPeriods) {
      if (!item.day || !item.subject || !item.startTime || !item.endTime) {
        return res.status(400).json({ 
          message: `Incomplete entry: ${JSON.stringify(item)}. Missing day, subject, startTime, or endTime.` 
        });
      }

      if (!isValidDay(item.day)) {
        return res.status(400).json({ message: `Invalid day of week: ${item.day} in item: ${item.subject}` });
      }

      // Time formatting check (ensure HH:MM format)
      let formattedStart = item.startTime.trim();
      let formattedEnd = item.endTime.trim();
      
      // Auto-pad single digit hours: "8:30" -> "08:30"
      if (/^\d:\d{2}$/.test(formattedStart)) formattedStart = '0' + formattedStart;
      if (/^\d:\d{2}$/.test(formattedEnd)) formattedEnd = '0' + formattedEnd;

      if (!isValidTime(formattedStart) || !isValidTime(formattedEnd)) {
        return res.status(400).json({ 
          message: `Invalid time format in item: ${item.subject}. Start: ${item.startTime}, End: ${item.endTime}. Use HH:MM.` 
        });
      }

      validatedPeriods.push({
        user: req.user.id,
        day: normalizeDay(item.day),
        subject: item.subject.trim(),
        startTime: formattedStart,
        endTime: formattedEnd,
        room: (item.room || '').trim(),
        teacher: (item.teacher || '').trim(),
        color: (item.color || '#3b82f6').trim()
      });
    }

    // Check if we should overwrite existing periods or append
    if (overwrite) {
      await Period.deleteMany({ user: req.user.id });
    }

    // Batch insert
    let inserted = [];
    if (validatedPeriods.length > 0) {
      inserted = await Period.insertMany(validatedPeriods);
    }

    res.status(201).json({
      message: `Successfully imported ${inserted.length} periods.`,
      count: inserted.length,
      periods: inserted
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error uploading timetable data: ' + error.message });
  }
});

module.exports = router;
