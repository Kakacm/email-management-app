require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const sendEmail = require('./sendMail');

const app = express();
const port = process.env.PORT || 3000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
});

const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the email form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Sender.html'));
});

// Handle form submissions to send email
app.post('/send-email', upload.array('attachments'), async (req, res) => {
  try {
    const { to, subject, text } = req.body;
    const attachments = req.files;
    const response = await sendEmail(to, subject, text, attachments);
    res.send({ message: 'Email sent successfully', info: response });
  } catch (error) {
    res.status(500).send({ message: 'Failed to send email', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
